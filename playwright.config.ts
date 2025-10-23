import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  retries: 1,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: require.resolve('./tests/setup/globalSetup'),
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    testIdAttribute: 'data-test',
    launchOptions: { slowMo: process.env.CI ? 0 : 50 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'Chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'WebKit', use: { ...devices['Desktop Safari'] } },
  ],
})
