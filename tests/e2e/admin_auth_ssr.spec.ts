import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const USER_EMAIL = process.env.E2E_USER_EMAIL || ''
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || ''

async function login(page: any, email: string, password: string) {
  await page.goto(BASE_URL)
  await page.click('[data-test="login-button"]').catch(() => {})
  await page.fill('[data-test="email"]', email)
  await page.fill('[data-test="password"]', password)
  await page.click('[data-test="submit-login"]')
  await page.waitForLoadState('networkidle')
}

test('SSR/Route can read session after login (dev dump)', async ({ page }) => {
  test.skip(!(USER_EMAIL && USER_PASSWORD), 'E2E_USER_EMAIL/E2E_USER_PASSWORD not set')

  await login(page, USER_EMAIL, USER_PASSWORD)
  await page.goto(BASE_URL + '/api/dev/auth-dump')
  // bodyテキストがJSONのはず
  const txt = await page.textContent('body')
  const json = JSON.parse(txt || '{}')
  expect(json?.serverComponent?.hasUser).toBeTruthy()
  expect(json?.routeHandler?.hasUser).toBeTruthy()
})


