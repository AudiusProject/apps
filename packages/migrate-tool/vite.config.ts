import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // The SDK references Buffer / process at runtime — keep these polyfilled
    // so it works in the browser without a separate global shim.
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, process: true }
    })
  ],
  server: {
    port: 5180,
    open: true
  },
  build: {
    outDir: 'dist',
    // The SDK pulls in heavy deps (viem, solana). Pin the chunk limit a bit
    // higher so the build doesn't spam warnings — it's a leaf app, not a lib.
    chunkSizeWarningLimit: 1500
  }
})
