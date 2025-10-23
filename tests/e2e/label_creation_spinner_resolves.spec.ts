import { test, expect } from '@playwright/test'

test('ラベル作成スピナーが解消しダウンロードリンクが表示', async ({ page, context }) => {
  await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
  await page.goto('/shipping/new/label')

  await page.getByTestId('label-create-submit').click()
  await expect(page.getByTestId('label-spinner')).toBeVisible()

  // 最長60秒待つ（指数バックオフ内で完了想定）
  await expect(page.getByTestId('label-download-link')).toBeVisible({ timeout: 60000 })
  await expect(page.getByTestId('label-spinner')).toBeHidden({ timeout: 10000 })
})


