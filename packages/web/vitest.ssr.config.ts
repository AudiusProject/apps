import path from 'node:path'

import { defineConfig } from 'vitest/config'

// SSR tests don't need the browser app's providers, canvas mocks, or SDK setup.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      ssr: path.resolve(__dirname, 'src/ssr')
    }
  },
  test: {
    environment: 'node',
    include: ['src/ssr/**/*.test.{ts,tsx}'],
    minWorkers: 1,
    maxWorkers: 1
  }
})
