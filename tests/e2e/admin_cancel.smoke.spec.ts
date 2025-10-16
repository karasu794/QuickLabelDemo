// @ts-nocheck
import { test, expect } from '@playwright/test'

test.describe('Admin cancel smoke', () => {
  test('admin UI cancel button triggers non-timeout response', async ({ page }) => {
    await page.goto('/admin/shipments')

    const btn = page.locator('[data-test="admin-cancel"]').first()
    await expect(btn).toBeVisible()

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/cancel') && ['POST'].includes(r.request().method()), { timeout: 15000 }),
      btn.click(),
    ])

    const status = resp.status()
    expect([200, 204, 409, 422, 403, 405, 501]).toContain(status)

    await resp.json().catch(() => ({}))
  })
})


