import { defineConfig, PluginOption } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        process: true
      }
    })
  ] as PluginOption[],
  optimizeDeps: {
    exclude: ['js-big-decimal'],

    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true
        })
      ]
    }
  }
})
