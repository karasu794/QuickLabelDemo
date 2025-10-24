import { test, expect } from '@playwright/test'

test('Invoice options and breakdown visible on review', async ({ page }) => {
  await page.goto('/shipping/new/review?forceShow=1')
  await page.waitForSelector('[data-test="breakdown-table"]', { state: 'visible', timeout: 15000 })
  await expect(page.locator('[data-test="breakdown-table"]').first()).toBeVisible()
  await expect(page.locator('[data-test="invoice-options-card"]').first()).toBeVisible()
})


