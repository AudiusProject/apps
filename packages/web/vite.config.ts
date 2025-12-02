/// <reference types="vitest" />

import path from 'path'

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react-swc'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import { visualizer } from 'rollup-plugin-visualizer'
import vike from 'vike/plugin'
import { defineConfig, loadEnv } from 'vite'
import glslify from 'vite-plugin-glslify'
import svgr from 'vite-plugin-svgr'

const SOURCEMAP_URL = 'https://s3.us-west-1.amazonaws.com/sourcemaps.audius.co/'

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
            env.VITE_ENV === 'production' ? SOURCEMAP_URL : undefined
        }
      }
    },
    define: {
      // Using `process.env` to support mobile,
      // This can be removed once the common migration is complete
      'process.env': env
    },
    optimizeDeps: {
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
        jsxImportSource: '@emotion/react'
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
      alias: {
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
        path: require.resolve('path-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        // Resolve to lodash-es to support tree-shaking
        lodash: 'lodash-es'
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
            include: ['./src/test/vitest-canvas-mock']
          }
        }
      },
      exclude: ['e2e', 'node_modules', 'dist'],
      threads: false,
      minWorkers: 1,
      maxWorkers: 1 // Segfaults if multithreaded
    }
  }
})
