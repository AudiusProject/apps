import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: `./tests/e2e/${process.env.EXAMPLE}`,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['junit', { outputFile: 'report.xml', outputDir: 'playwright-report' }],
        ['html', { open: 'never' }],
        ['line'],
        ['blob']
      ]
    : 'html',
  use: {
    trace: 'on-first-retry',
    userAgent: 'create-audius-app-e2e-tests'
  },

  webServer: {
    command: `EXAMPLE=$EXAMPLE npm run start-example`,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60000 * 5
  }
})
