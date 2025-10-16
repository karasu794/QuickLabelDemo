// @ts-nocheck
import { test, expect } from '@playwright/test'

test.describe('Admin Cancel Flow (Finalized)', () => {
  test('successfully cancels a labeled shipment', async ({ page }) => {
    await page.goto('/admin/shipments')
    const btn = page.locator('[data-test="admin-cancel"]').first()
    await expect(btn).toBeVisible()
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/ship/cancel') && r.request().method() === 'POST'),
      btn.click(),
    ])
    const status = resp.status()
    expect([200, 204, 207]).toContain(status)
    const json = await resp.json().catch(() => ({}))
    expect(json).toHaveProperty('ok')
    await expect(page.locator('text=キャンセル済')).toBeVisible()
  })

  test('repeated cancel returns 204 and does not error', async ({ request }) => {
    const res = await request.post('/api/ship/cancel', { data: { trackingNumber: 'dummy-idempotent' } })
    expect(res.status()).toBe(204)
  })

  test('partial failure still responds 207 (simulated)', async ({ request }) => {
    const res = await request.post('/api/ship/cancel', { data: { trackingNumber: 'simulate-failure' } })
    expect(res.status()).toBe(207)
  })
})


