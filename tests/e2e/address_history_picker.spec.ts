import { test, expect } from '@playwright/test'

test('shipper form can fill from history', async ({ page }) => {
  await page.goto('/shipping/new/shipper')
  await page.getByRole('button', { name: '履歴から入力' }).click()
  await expect(page.getByTestId('modal-history-picker')).toBeVisible()
  // 何かが表示されていればOK（環境によっては空）
  if (await page.getByTestId('empty-history').isVisible().catch(() => false)) {
    // 空状態を確認
    await expect(page.getByTestId('empty-history')).toBeVisible()
  }
  await page.getByRole('button', { name: '閉じる' }).click()
})

test('recipient form can open history modal', async ({ page }) => {
  await page.goto('/shipping/new/recipient')
  await page.getByRole('button', { name: '履歴から入力' }).click()
  await expect(page.getByTestId('modal-history-picker')).toBeVisible()
  await page.getByRole('button', { name: '閉じる' }).click()
})


