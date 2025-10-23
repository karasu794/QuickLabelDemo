import { test, expect } from '@playwright/test'

test.describe('サービス→見積→レビュー価格反映', () => {
  test('レビュー価格が “—” ではない', async ({ page, context, baseURL }) => {
    // core-mode=mock を付与
    await context.addCookies([
      { name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' },
    ])

    // フォーム初期状態を localStorage にプリセット
    await page.addInitScript(() => {
      const state = {
        state: {
          shipperInfo: {
            contactName: 'Alice', companyName: 'A Co', taxId: '', phoneNumber: '000', email: 'a@example.com',
            countryCode: 'JP', stateCode: '', address1: '1-1', address2: '', postalCode: '4411234', cityName: 'Toyokawa'
          },
          recipientInfo: {
            contactName: 'Bob', companyName: 'B Co', taxNumber: '', phoneNumber: '000', email: 'b@example.com',
            countryCode: 'US', postalCode: '94016', cityName: 'San Francisco', stateCode: 'CA', address1: 'Market St', address2: '', isResidential: false, htsCode: ''
          },
          packages: [
            { type: 'YOUR_PACKAGING', weight: '1.2', length: '10', width: '10', height: '10', declaredValue: '0' },
            { type: 'YOUR_PACKAGING', weight: '0.8', length: '10', width: '10', height: '10', declaredValue: '0' },
          ],
          items: [{ description: 'item', hsCode: '', countryOfManufacture: 'JP', quantity: 1, weight: 1, unitPrice: 100, currency: 'JPY' }],
          contents: [{ description: 'item', quantity: 1, value: 100, weight: 1, countryOfOrigin: 'JP', hsCode: '' }],
          shippingPurpose: 'PERSONAL_USE',
          selectedRate: null,
          completedSteps: [],
          phoenixMode: 'none'
        },
        version: 0,
      }
      window.localStorage.setItem('shipping-form-storage', JSON.stringify(state))
    })

    await page.goto('/shipping/new/service')

    // 自動見積なし → ボタンで見積
    await page.getByTestId('svc-show-quote').click()

    // 見積カードが1件以上
    await expect(page.getByTestId('quote-card').first()).toBeVisible()

    // レート選択でレビューへ
    await page.getByTestId('quote-select').first().click()
    await page.waitForURL('**/shipping/new/review')

    // 価格が “—” ではない
    const review = page.getByTestId('review-price')
    await expect(review).toBeVisible()
    await expect(review).not.toContainText('—')
  })
})


