import { test, expect } from '@playwright/test'

test('home renders (smoke)', async ({ page }) => {
  await page.goto('/')
  await expect(async () => {
    const state = await page.evaluate(() => document.readyState)
    expect(state).toBe('complete')
  }).toPass()

  const body = page.locator('body')
  await expect(body).toBeVisible()
})



