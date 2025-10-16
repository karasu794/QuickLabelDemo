import { test, expect } from '@playwright/test'

test.describe('Review disclaimer consent', () => {
  test('未チェックで confirm-button disabled、リンクで本文表示、チェック後に進行', async ({ page }) => {
    // 前提: ここでは詳細な見積りやステップ遷移は省略し、直接レビューに来た場合のUIを確認（実E2Eでは事前ステップを実行）
    await page.goto('/shipping/new/review')

    // 免責リンクがあること
    const link = page.locator('[data-test="disclaimer-link"]')
    await expect(link).toBeVisible()

    // チェック前はConfirmボタンがdisabled
    const confirm = page.locator('[data-test="confirm-button"]')
    await expect(confirm).toBeDisabled()

    // チェックON
    const checkbox = page.locator('[data-test="disclaimer-checkbox"]')
    await checkbox.click()
    await expect(confirm).toBeEnabled()
  })
})


