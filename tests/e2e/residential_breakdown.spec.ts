import { test, expect } from '@playwright/test'

test('見積り: 個人宅チェックONで内訳に個人宅加算が表示される', async ({ page }) => {
  await page.goto('/')

  // 住所や重量など最小入力（既存のquote_flowに準ずる前提で簡略）
  await page.getByLabel('発送元の郵便番号').fill('1000001')
  await page.getByLabel('発送先の郵便番号').fill('90001')
  await page.getByLabel('重量(kg)').fill('1')

  // 個人宅チェック
  await page.getByTestId('residential').check()

  // 見積実行
  await page.getByRole('button', { name: '見積もりを取得' }).click()

  // 結果の表示待ち（最安値のAccordionが出るまで）
  await expect(page.getByText('配送オプション')).toBeVisible({ timeout: 60000 })

  // いずれかのサービスを展開
  const rateItems = page.locator('[role="button"][data-state]')
  if (await rateItems.count()) {
    await rateItems.nth(0).click()
  }

  // 内訳に個人宅加算が表示
  const residentialItem = page.getByTestId('breakdown-item-residential')
  await expect(residentialItem).toBeVisible()
})


