import { test, expect } from '@playwright/test'

// 簡易E2E: モックモードでトップページの内訳表示を検証
// cookie core-mode=mock を使う（CORE_MODE は boolean フラグ）

test.describe('トップページ 見積の料金内訳の表示', () => {
  test('基本料金以外の行も表示される（燃料・混雑・地域外・輸入手数料・申告価格・フェニックス割引）', async ({ page }) => {
    await page.context().addCookies([{ name: 'core-mode', value: 'mock', url: 'http://localhost:3000' }])
    await page.goto('/')

    // 見積結果カードが表示される（モックは即時）
    const container = page.getByTestId('quote-container')
    await expect(container).toBeVisible()

    // 内訳テーブル存在
    const table = page.getByTestId('breakdown-table').first()
    await expect(table).toBeVisible()

    // 期待行
    await expect(page.getByTestId('breakdown-row-baseRate').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-volumeDiscount').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-fuelSurcharge').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-peakSurcharge').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-outOfDeliveryArea').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-usImportProcessingFee').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-declaredValue').first()).toBeVisible()
    await expect(page.getByTestId('breakdown-row-otherSurcharge').first()).toBeVisible()
  })
})
