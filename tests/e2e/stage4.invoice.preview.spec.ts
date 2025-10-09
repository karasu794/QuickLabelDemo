import { test, expect } from '@playwright/test'

test.describe('Stage4 preview (builder switchable)', () => {
  test('preview shows URL with token builder (default)', async ({ page }) => {
    await page.context().addCookies([
      { name: 'E2E_FORCE_PHOENIX_LETTERHEAD', value: 'true', url: 'http://localhost:3000' },
      { name: 'E2E_FORCE_PHOENIX_SIGNATURE', value: 'true', url: 'http://localhost:3000' },
    ])
    await page.goto('/shipping/new/invoice')
    await page.getByTestId('preview-button').click()
    await expect(page.getByTestId('preview-url')).toBeVisible()
  })
})


