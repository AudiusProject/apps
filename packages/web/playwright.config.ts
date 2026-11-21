import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ['junit', { outputFile: 'report.xml', outputDir: 'playwright-report' }],
        ['html', { open: 'never' }],
        ['line'],
        ['blob']
      ]
    : 'html',
  use: {
    baseURL: 'http://localhost:4173',

    trace: 'retain-on-failure',

    actionTimeout: 10 * 1000
  },

  timeout: 5 * 60 * 1000,

  expect: {
    timeout: 10 * 1000
  },

  projects: [
    {
      name: 'seed',
      testMatch: /.*\.seed.ts/
    },
    {
      name: 'setup',
      testMatch: /.*\.setup.ts/,
      dependencies: ['seed']
    },
    {
      name: 'chromium',
      testIgnore: /.*\.(setup|seed).ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      }
    }

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  webServer: {
    command:
      process.env.RUN_AGAINST_STAGE !== 'true'
        ? 'npm run preview:dev'
        : 'npm run preview:stage',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60000 * 15
  }
})
