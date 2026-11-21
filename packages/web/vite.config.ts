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

const svgoConfig = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          convertColors: false,
          removeUnknownsAndDefaults: false,
          cleanupIds: { minify: false, remove: false },
          removeUselessDefs: false,
          removeTitle: false,
          inlineStyles: { onlyMatchedOnce: false },
          convertPathData: { convertToQ: false, makeArcs: false },
          convertTransform: false
        }
      }
    }
  ]
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, path.join(process.cwd(), 'env'), 'VITE_')
  process.env.VITE_ENVIRONMENT =
    mode === 'test' ? 'development' : process.env.VITE_ENVIRONMENT
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
        'chart.js': path.resolve(__dirname, 'node_modules/chart.js'),
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
        crypto: ssr
          ? require.resolve('crypto-browserify')
          : path.resolve(__dirname, 'src/crypto-shim.ts'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        lodash: 'lodash-es'
      }
    },
    ssr: {
      external: ['react', 'react-dom', 'react-dom/server'],
      resolve: {
        conditions: [...defaultServerConditions],

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
