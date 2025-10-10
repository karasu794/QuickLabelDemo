import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
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

test.describe('admin header persistence', () => {
  test('admin sees Admin link persistently (navigate/reload/token refresh)', async ({ page }) => {
    test.skip(!(ADMIN_EMAIL && ADMIN_PASSWORD), 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set')

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(BASE_URL)

    const adminLink = page.getByTestId('nav-admin-link')

    await expect(adminLink).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(adminLink).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(adminLink).toBeVisible()

    // Try to trigger token refresh by waiting; not deterministic but catches flake
    await page.waitForTimeout(1500)
    await expect(adminLink).toBeVisible()
  })

  test('member does not see Admin link', async ({ page }) => {
    test.skip(!(USER_EMAIL && USER_PASSWORD), 'E2E_USER_EMAIL/E2E_USER_PASSWORD not set')

    await login(page, USER_EMAIL, USER_PASSWORD)
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('nav-admin-link')).toHaveCount(0)
  })

  test('guest does not see Admin link', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('nav-admin-link')).toHaveCount(0)
  })
})


