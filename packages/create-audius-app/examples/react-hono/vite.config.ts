import pages from '@hono/vite-cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import { UserConfig, defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import path from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [
        nodePolyfills({
          globals: {
            process: true
          }
        }),
        cssInjectedByJsPlugin()
      ],
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis'
          },
          plugins: [
            NodeGlobalsPolyfillPlugin({
              buffer: true,
              process: true
            }),
            fixReactVirtualized
          ]
        }
      },
      build: {
        rollupOptions: {
          input: './src/client/main.tsx',
          output: {
            entryFileNames: 'static/client/main.js'
          }
        }
      }
    } as UserConfig
  }

  return {
    plugins: [
      pages({
        entry: 'src/index.tsx'
      }),
      devServer({
        entry: 'src/index.tsx'
      }),
      nodePolyfills({
        protocolImports: true,
        exclude: ['process']
      })
    ],
    resolve:
      mode === 'production'
        ? {
            // Need to alias this because vite only wants to resolve the "browser" bundle
            alias: {
              '@audius/sdk': path.resolve(
                __dirname,
                'node_modules/@audius/sdk/dist/index.esm.js'
              )
            }
          }
        : {},
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
            process: true
          }),
          fixReactVirtualized
        ]
      }
    },
    ssr: {
      external: ['react', 'react-dom', 'process']
    },
    define: {
      'process.env': {}
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true
      }
    }
  } as UserConfig
})
