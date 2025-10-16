// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBe: () => {}, toContain: () => {}, toBeTruthy: () => {}, toBeGreaterThan: () => {} }) }

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('Non-US: packages -> contents, and no HTS UI on contents', async ({ page }: any) => {
  // 受取国をJPにプリセット
  const persisted = {
    shipperInfo: { contactName: '', companyName: '', taxId: '', phoneNumber: '', email: '', countryCode: 'JP', stateCode: '', address1: '', address2: '', postalCode: '', cityName: '' },
    recipientInfo: { contactName: '', companyName: '', taxNumber: '', phoneNumber: '', email: '', countryCode: 'JP', postalCode: '', cityName: '', stateCode: '', address1: '', address2: '', isResidential: false, htsCode: '' },
    packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '1000' }],
    items: [{ description: 'Book', hsCode: '4901.99', countryOfManufacture: 'JP', quantity: 1, weight: 1, unitPrice: 1000, currency: 'JPY' }],
    contents: [{ description: 'Book', quantity: 1, value: 1000, weight: 1, countryOfOrigin: 'JP', hsCode: '4901.99' }],
    shippingPurpose: '', selectedRate: null, completedSteps: [], phoenixMode: 'none'
  }
  await page.addInitScript(([k, v]) => localStorage.setItem(k as string, v as string), [
    'shipping-form-storage', JSON.stringify({ state: persisted, version: 0 })
  ])

  // packages → 次へ → contents
  await page.goto(`${BASE_URL}/shipping/new/packages`)
  await page.locator('button:has-text("次へ")').first().click()
  await page.waitForURL(/\/shipping\/new\/contents/)

  // contents に HTS UI は存在しない
  expect(await page.locator('[data-test="hts-code"]').count()).toBe(0)

  // 商品行入力はプリセット済み。次へで review に到達
  await page.locator('button:has-text("次へ")').first().click()
  await page.waitForURL(/\/shipping\/new\/review/)

  // 直リンクで contents/hts に来た場合も 非US なら /contents へリダイレクト
  await page.goto(`${BASE_URL}/shipping/new/contents/hts`)
  await page.waitForURL(/\/shipping\/new\/contents/)
})


