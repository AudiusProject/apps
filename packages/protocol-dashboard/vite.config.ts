import path from 'path'

import react from '@vitejs/plugin-react'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [
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
      plugins: [fixReactVirtualized]
    }
  },

  resolve: {
    alias: [
      // Force ethers v6 for @web3modal/ethers when importing bare 'ethers' (root has ethers v5 from libs).
      // Use exact match so 'ethers/utils/abi-coder' (from web3-eth-abi) still resolves to nested ethers v4.
      {
        find: /^ethers$/,
        replacement: path.resolve(__dirname, 'node_modules/ethers')
      },
      { find: 'components', replacement: '/src/components' },
      { find: 'containers', replacement: '/src/containers' },
      { find: 'services', replacement: '/src/services' },
      { find: 'utils', replacement: '/src/utils' },
      { find: 'store', replacement: '/src/store' },
      { find: 'hooks', replacement: '/src/hooks' },
      { find: 'models', replacement: '/src/models' },
      { find: 'types', replacement: '/src/types' },
      { find: 'assets', replacement: '/src/assets' },
      {
        find: '@audius/common/src',
        replacement: path.resolve(__dirname, '../common/src')
      },
      { find: '~', replacement: path.resolve(__dirname, '../../packages/common/src') }
    ]
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
