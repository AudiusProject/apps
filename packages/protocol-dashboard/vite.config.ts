import path from 'path'

import react from '@vitejs/plugin-react'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'
import wasm from 'vite-plugin-wasm'

// @web3modal/ethers expects ethers v6 but root node_modules has v5.
// Redirect bare 'ethers' imports from @web3modal to the local v6 for Rollup (production build).
function resolveEthersV6ForWeb3Modal(): import('vite').Plugin {
  const ethersV6Path = path.resolve(
    __dirname,
    'node_modules/ethers/lib.esm/index.js'
  )
  return {
    name: 'resolve-ethers-v6-for-web3modal',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'ethers' && importer?.includes('@web3modal')) {
        return ethersV6Path
      }
      return null
    }
  }
}

export default defineConfig({
  plugins: [
    resolveEthersV6ForWeb3Modal(),
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    wasm(),
    svgr({
      include: '**/*.svg'
    }),

    nodePolyfills({
      exclude: ['fs'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    })
  ],

  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        fixReactVirtualized,
        {
          name: 'resolve-ethers-v6-for-web3modal',
          setup(build) {
            // @web3modal/ethers expects ethers v6 but root node_modules has v5.
            // Redirect bare 'ethers' imports from @web3modal to the local v6.
            build.onResolve({ filter: /^ethers$/ }, (args) => {
              if (args.importer.includes('@web3modal')) {
                return {
                  path: path.resolve(
                    __dirname,
                    'node_modules/ethers/lib.esm/index.js'
                  )
                }
              }
              return undefined
            })
          }
        }
      ]
    }
  },

  resolve: {
    alias: {
      components: '/src/components',
      containers: '/src/containers',
      services: '/src/services',
      utils: '/src/utils',
      store: '/src/store',
      hooks: '/src/hooks',
      models: '/src/models',
      types: '/src/types',
      assets: '/src/assets',
      '@audius/common/src': path.resolve(__dirname, '../common/src'),
      '~': path.resolve(__dirname, '../../packages/common/src')
      // '@audius/harmony/dist': path.resolve(__dirname, '../harmony/dist')
      // '@audius/harmony': path.resolve(__dirname, '../harmony/src')
    }
  },

  server: {
    host: '0.0.0.0'
  },
  // Base URL. Set DASHBOARD_BASE_URL to /dashboard/ in Dockerfile.
  // When deploying: leave DASHBOARD_BASE_URL unset (or set to './')
  base: process.env.VITE_DASHBOARD_BASE_URL || './',
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
})
