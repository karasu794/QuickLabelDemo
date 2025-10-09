import { test, expect } from '@playwright/test'

test.describe('Stage3: invoice reflects admin force settings', () => {
  test('force-on disables UI and shows preview', async ({ page, request }) => {
    // Cookieでoverride（SSRが読む）
    await page.context().addCookies([
      { name: 'E2E_FORCE_PHOENIX_LETTERHEAD', value: 'true', url: 'http://localhost:3000' },
      { name: 'E2E_FORCE_PHOENIX_SIGNATURE', value: 'true', url: 'http://localhost:3000' },
    ])

    await page.goto('/shipping/new/invoice')
    await expect(page.getByTestId('lh-section')).toHaveCount(0)
    await expect(page.getByTestId('sign-section')).toHaveCount(0)
    await expect(page.getByTestId('lh-explainer')).toBeVisible()
    await expect(page.getByTestId('sign-explainer')).toBeVisible()
    await expect(page.getByTestId('shipper-different-toggle')).toHaveCount(0)
    await expect(page.getByTestId('exporter-name')).toContainText('Phoenix Co., Ltd. Norio Yamaguchi')

    await page.getByTestId('preview-button').click()
    await expect(page.getByTestId('preview-url')).toBeVisible()
  })

  test('force-off shows selectors and preview works', async ({ page, request }) => {
    await page.context().addCookies([
      { name: 'E2E_FORCE_PHOENIX_LETTERHEAD', value: 'false', url: 'http://localhost:3000' },
      { name: 'E2E_FORCE_PHOENIX_SIGNATURE', value: 'false', url: 'http://localhost:3000' },
    ])
    await page.goto('/shipping/new/invoice')
    await expect(page.getByTestId('lh-section')).toBeVisible()
    await expect(page.getByTestId('sign-section')).toBeVisible()
    await expect(page.getByTestId('shipper-different-toggle')).toBeVisible()
    await page.getByTestId('preview-button').click()
    await expect(page.getByTestId('preview-url')).toBeVisible()
  })
})



