/// <reference types="vitest" />

import fs from 'fs'
import path from 'path'

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import { visualizer } from 'rollup-plugin-visualizer'
import vike from 'vike/plugin'
import {
  defineConfig,
  defaultClientConditions,
  defaultServerConditions,
  loadEnv
} from 'vite'
import type { Plugin } from 'vite'
import glslify from 'vite-plugin-glslify'
import svgr from 'vite-plugin-svgr'

// @noble/curves and @noble/ciphers are installed many times (nested under
// viem, @solana/web3.js, common, sdk, ...). Point older copies with the same
// major version at the copy the entry chunk already has (viem's curves,
// common's ciphers) so they are bundled once. Newer copies are never
// downgraded, and @noble/hashes is left alone: its `_assert` exports changed
// within 1.x.
const canonicalNoblePackages: Record<string, string> = {
  '@noble/curves': path.resolve(
    __dirname,
    '../../node_modules/viem/node_modules/@noble/curves'
  ),
  '@noble/ciphers': path.resolve(
    __dirname,
    '../common/node_modules/@noble/ciphers'
  )
}

const packageVersions = new Map<string, number[] | null>()
const getVersion = (packageDir: string) => {
  if (!packageVersions.has(packageDir)) {
    let version: number[] | null = null
    try {
      version = JSON.parse(
        fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')
      )
        .version.split('.')
        .map(Number)
    } catch {}
    packageVersions.set(packageDir, version)
  }
  return packageVersions.get(packageDir)
}

/** Whether `a` has the same major version as `b` and is not newer. */
const isSameMajorAndNotNewer = (a: number[], b: number[]) => {
  if (a[0] !== b[0]) return false
  for (let i = 1; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return true
}

const nobleDedupe = (): Plugin => ({
  name: 'noble-dedupe',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    const name = source.match(/^@noble\/[^/]+/)?.[0]
    if (!name || !(name in canonicalNoblePackages)) return null
    const resolved = await this.resolve(source, importer, {
      ...options,
      skipSelf: true
    })
    const match = resolved?.id.match(
      /^(.*\/node_modules\/@noble\/[^/]+)(\/.*)$/
    )
    if (!resolved || !match) return resolved
    const [, packageDir, rest] = match
    const canonicalDir = canonicalNoblePackages[name]
    if (packageDir === canonicalDir) return resolved
    const version = getVersion(packageDir)
    const canonicalVersion = getVersion(canonicalDir)
    if (
      !version ||
      !canonicalVersion ||
      !isSameMajorAndNotNewer(version, canonicalVersion)
    ) {
      return resolved
    }
    const id = canonicalDir + rest
    return fs.existsSync(id) ? { ...resolved, id } : resolved
  }
})

/**
 * Harmony inlines every Avenir weight as base64 (~240 KB, avenir.css) so other
 * consumers work without extra setup. Web serves the same fonts as separate
 * woff2 files from public/fonts.css instead, so drop the inlined copies, both
 * from the harmony source web aliases to and from dist/harmony.css.
 */
const stripHarmonyFonts = (): Plugin => ({
  name: 'strip-harmony-fonts',
  enforce: 'pre',
  transform(code, id) {
    const file = id.split('?')[0]
    if (file.endsWith('/harmony/src/foundations/typography/avenir.css')) {
      return { code: '', map: null }
    }
    if (file.endsWith('/harmony/dist/harmony.css')) {
      return {
        code: code.replace(
          /@font-face\s*\{[^}]*Avenir Next LT Pro[^}]*\}/g,
          ''
        ),
        map: null
      }
    }
    return null
  }
})

const SOURCEMAP_URL = 'https://s3.us-west-1.amazonaws.com/sourcemaps.audius.co/'

// Matches what mobile's react-native-svg-transformer runs on the same icons,
// plus id handling that is safe when many SVGs are inlined into one page.
const svgoConfig = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // viewBox is required to resize SVGs with CSS
          removeViewBox: false,
          // Keep colors exact so .svgrrc replaceAttrValues still matches
          convertColors: false,
          removeUnknownsAndDefaults: false,
          // Minified ids collide between inline SVGs on the same page
          cleanupIds: { minify: false, remove: false },
          removeUselessDefs: false,
          removeTitle: false,
          inlineStyles: { onlyMatchedOnce: false },
          // Avoid lossy curve and transform rewrites (visible on logos with
          // tiny-scale image transforms)
          convertPathData: { convertToQ: false, makeArcs: false },
          convertTransform: false
        }
      }
    }
  ]
}

export default defineConfig(async ({ mode }) => {
  // Despite loading env here, the result is the same as a filtered process.env
  // rather than dynamically loading the correct env file by mode.
  // Since the build/start scripts use turbo, and other packages don't use vite,
  // --mode isn't an allowed parameter. Instead, each script sets the
  // environment manually using env-cmd.
  // The only exception is test (vitest), which does not set the env manually,
  // and uses the "test" mode to load .env.test which sets VITE_ENVIRONMENT to
  // "development". Even in that case, process.env gets explicitly set
  // anyway because that's what the application code looks at.
  // Despite loading .env.production (which notably doesn't exist anyway),
  // loadEnv prioritizes process.env anyway so we're not at risk of overrides.
  const env = loadEnv(mode, path.join(process.cwd(), 'env'), 'VITE_')
  // Explicitly set VITE_ENVIRONMENT to "development" when in test mode.
  // Better than defaulting to using env.VITE_ENVIRONMENT, which would lead to
  // accidentally using "production"!
  process.env.VITE_ENVIRONMENT =
    mode === 'test' ? 'development' : process.env.VITE_ENVIRONMENT
  // Dynamically import the app environment so that process.env.VITE_ENVIRONMENT
  // is already set before evaluating the switch/case. The app env is used for
  // transforming the index.html file.
  const { env: APP_ENV } = await import('./src/services/env')
  const port = parseInt(env.VITE_PORT ?? '3000')
  const analyze = env.VITE_BUNDLE_ANALYZE === 'true'
  const ssr = env.VITE_SSR === 'true'
  env.VITE_BASENAME = env.VITE_BASENAME ?? ''

  return {
    envDir: 'env',
    base: env.VITE_BASENAME || '/',
    build: {
      outDir: ssr ? 'build-ssr' : 'build',
      sourcemap: true,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      },
      rollupOptions: {
        output: {
          sourcemapBaseUrl:
            env.VITE_ENV === 'production' ? SOURCEMAP_URL : undefined,
          // Stable framework deps get their own chunk so repeat visitors keep
          // it cached across deploys. Object form pulls each package's own
          // dependencies in too, so the chunk never imports back into the
          // entry. The SSR build keeps its default chunking.
          manualChunks: ssr
            ? undefined
            : {
                vendor: [
                  'react',
                  'react/jsx-runtime',
                  'react-dom',
                  'react-dom/client',
                  'react-router',
                  'redux',
                  'react-redux',
                  'redux-saga',
                  '@tanstack/query-core'
                ]
              }
        }
      }
    },
    define: {
      // Using `process.env` to support mobile,
      // This can be removed once the common migration is complete
      'process.env': env
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'butterchurn',
        'butterchurn-presets',
        ...(env.VITE_ENV === 'production' ? ['@audius/sdk'] : [])
      ],
      dedupe: ['react', 'react-dom'],
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true
          }),
          fixReactVirtualized
        ]
      }
    },
    plugins: [
      glslify(),
      svgr({
        svgrOptions: {
          plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
          svgoConfig
        },
        include: '**/*.svg',
        exclude: [
          'src/assets/img/wallet-link.svg',
          'src/assets/img/phantom-icon-purple.svg'
        ]
      }),
      // Import workerscript as raw string
      // Could use ?raw suffix but it breaks on mobile
      {
        name: 'workerscript',
        transform(code, id) {
          if (/\.workerscript$/.test(id)) {
            const str = JSON.stringify(code)

            return {
              code: `export default ${str}`
            }
          }
        }
      },
      nobleDedupe(),
      stripHarmonyFonts(),
      // bip39 bundles every language's wordlist; keys only use English
      {
        name: 'bip39-english-only',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            importer?.includes('/bip39/') &&
            /^\.\/wordlists\/(?!english\.json$)\w+\.json$/.test(source)
          ) {
            return '\0bip39-empty-wordlist'
          }
        },
        load(id) {
          if (id === '\0bip39-empty-wordlist') {
            return 'export default []'
          }
        }
      },
      {
        transformIndexHtml(html) {
          // Replace HTML env vars with values from the system env
          return html.replace(/%(\S+?)%/g, (text: string, key) => {
            if (key in APP_ENV) {
              const value = APP_ENV[key as keyof typeof APP_ENV]
              if (value !== null) {
                return value as string
              }
            }
            console.warn(`Missing environment variable: ${key}`)
            return text
          })
        }
      },
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['babel-plugin-react-compiler']
        }
      }),
      ...(ssr ? [vike()] : []),
      ...((analyze
        ? [
            visualizer({
              template: 'treemap',
              open: true,
              gzipSize: true,
              filename: 'analyse.html'
            })
          ]
        : []) as any)
    ],
    resolve: {
      conditions: [...defaultClientConditions],
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      alias: {
        // Force chart.js v4 from this package's node_modules. The root
        // workspace also resolves chart.js v2 (protocol-dashboard), and
        // chartjs-adapter-dayjs-4 hoists to root, so its `chart.js` import
        // would otherwise pick up v2 and silently break the date adapter.
        'chart.js': path.resolve(__dirname, 'node_modules/chart.js'),
        // Ensure single React instance to prevent ReactCurrentDispatcher errors
        ...(!ssr
          ? {
              react: path.resolve(__dirname, '../../node_modules/react'),
              'react-dom': path.resolve(
                __dirname,
                '../../node_modules/react-dom'
              )
            }
          : {
              '@emotion/react': path.resolve(
                __dirname,
                '../../node_modules/@emotion/react'
              ),
              '@emotion/styled': path.resolve(
                __dirname,
                '../../node_modules/@emotion/styled'
              ),
              '@emotion/cache': path.resolve(
                __dirname,
                '../../node_modules/@emotion/cache'
              ),
              '@emotion/css': path.resolve(
                __dirname,
                '../../node_modules/@emotion/css'
              )
            }),
        // Can't use vite-tsconfig-paths because of vike
        app: '/src/app',
        assets: '/src/assets',
        common: '/src/common',
        components: '/src/components',
        hooks: '/src/hooks',
        pages: '/src/pages',
        'public-site': '/src/public-site',
        services: '/src/services',
        store: '/src/store',
        workers: '/src/workers',
        utils: '/src/utils',
        ssr: '/src/ssr',
        '~': path.resolve(__dirname, '../../packages/common/src'),
        '~harmony': path.resolve(__dirname, '../../packages/harmony/src'),
        test: '/src/test',
        '@audius/common/src': path.resolve(__dirname, '../common/src'),
        '@audius/harmony/src': path.resolve(__dirname, '../harmony/src'),
        '@audius/harmony/dist': path.resolve(__dirname, '../harmony/dist'),
        '@audius/harmony': path.resolve(__dirname, '../harmony/src'),
        '@audius/sdk/src': path.resolve(__dirname, '../sdk/src'),
        '@audius/sdk': path.resolve(__dirname, '../sdk/src'),
        path: require.resolve('path-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        // Client deps only fall back to Node crypto when Web Crypto is
        // missing, so skip shipping crypto-browserify to the browser
        crypto: ssr
          ? require.resolve('crypto-browserify')
          : path.resolve(__dirname, 'src/crypto-shim.ts'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        // Resolve to lodash-es to support tree-shaking
        lodash: 'lodash-es'
      }
    },
    ssr: {
      external: ['react', 'react-dom', 'react-dom/server'],
      resolve: {
        // Affects *non-externalized* deps in the SSR pipeline
        conditions: [...defaultServerConditions],

        // Affects *externalized* imports resolution (important since you're externalizing react-dom)
        externalConditions: [...defaultServerConditions]
      }
    },
    server: {
      host: '0.0.0.0',
      port
    },
    test: {
      environment: 'happy-dom',
      setupFiles: ['./src/test/vitest-setup.ts'],
      deps: {
        optimizer: {
          web: {
            include: ['./src/test/vitest-canvas-mock', '@audius/sdk'],
            exclude: ['redux-saga']
          }
        }
      },
      // Patterns must be globs — bare strings like `'node_modules'`
      // were matching only top-level paths, so nested
      // `examples/trending/node_modules/**/*.test.*` files were
      // getting picked up and run against happy-dom (where they
      // network out and fail). Match the vitest defaults shape.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/examples/**'
      ],
      threads: false,
      minWorkers: 1,
      maxWorkers: 1, // Segfaults if multithreaded
      server: {
        deps: {
          inline: []
        }
      }
    }
  }
})
