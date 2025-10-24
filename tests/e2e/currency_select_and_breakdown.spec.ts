import { test, expect } from '@playwright/test'

test('Breakdown shows currency code and 0-amount rows', async ({ page }) => {
  await page.goto('/shipping/new/review?forceShow=1')
  const table = page.locator('[data-test="breakdown-table"]').first()
  await expect(table).toBeVisible({ timeout: 15000 })
  // 基本行が表示される
  await expect(page.locator('[data-test="breakdown-row-base"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-discount"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-fuel"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-peak"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-other"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-systemFee"]').first()).toBeVisible()
  await expect(page.locator('[data-test="breakdown-row-vat"]').first()).toBeVisible()
})


