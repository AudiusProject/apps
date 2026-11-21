import react from '@vitejs/plugin-react'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import process from 'process/browser'
import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const port = parseInt(env.VITE_PORT ?? '3000')

  const base = command === 'build' ? '/embed/' : '/'
  return {
    base,
    build: {
      outDir: 'build',
      sourcemap: true,
      commonjsOptions: {
        include: [/node_modules/]
      }
    },
    define: {
      'process.env': env
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        plugins: [fixReactVirtualized]
      }
    },
    plugins: [
      svgr({
        include: '**/*.svg'
      }),
      {
        transform(code, id) {
          if (/\.workerscript$/.test(id)) {
            const str = JSON.stringify(code)

            return {
              code: `export default ${str}`
            }
          }
        }
      },
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin']
        }
      }),
      nodePolyfills({
        exclude: ['fs'],
        globals: {
          Buffer: true,
          process: true
        },
        protocolImports: true
      })
    ],
    resolve: {
      alias: {
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        lodash: 'lodash-es'
      }
    },
    server: {
      port
    },
    test: {
      environment: 'jsdom'
    }
  }
})
