import { defineConfig, devices } from '@playwright/test'

const isRemoteBase = !!process.env.BASE_URL && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(process.env.BASE_URL)

export default defineConfig({
  testDir: 'tests/e2e',
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  globalSetup: require.resolve('./tests/setup/globalSetup'),
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    testIdAttribute: 'data-test',
    launchOptions: { slowMo: process.env.CI ? 0 : 50 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: isRemoteBase
    ? undefined
    : {
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
