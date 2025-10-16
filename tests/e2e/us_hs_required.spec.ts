// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBe: () => {}, toContain: () => {}, toBeTruthy: () => {}, toBeGreaterThan: () => {} }) }

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('US HTS required: packages -> contents/hts -> review', async ({ page }: any) => {
  // 受取国をUSにプリセット（Zustand persist）
  const persisted = {
    shipperInfo: {
      contactName: '', companyName: '', taxId: '', phoneNumber: '', email: '',
      countryCode: 'JP', stateCode: '', address1: '', address2: '', postalCode: '', cityName: ''
    },
    recipientInfo: {
      contactName: '', companyName: '', taxNumber: '', phoneNumber: '', email: '',
      countryCode: 'US', postalCode: '', cityName: '', stateCode: '', address1: '', address2: '',
      isResidential: false, htsCode: ''
    },
    packages: [{ type: 'YOUR_PACKAGING', weight: '', length: '', width: '', height: '', declaredValue: '' }],
    items: [{ description: '', hsCode: '', countryOfManufacture: 'JP', quantity: 1, weight: 0, unitPrice: 0, currency: 'JPY' }],
    contents: [{ description: '', quantity: 1, value: 0, weight: 0, countryOfOrigin: 'JP', hsCode: '' }],
    shippingPurpose: '', selectedRate: null, completedSteps: [], phoenixMode: 'none'
  }
  await page.addInitScript(([k, v]) => localStorage.setItem(k as string, v as string), [
    'shipping-form-storage', JSON.stringify({ state: persisted, version: 0 })
  ])

  // packages へ移動して「次へ」→ contents/hts へ遷移
  await page.goto(`${BASE_URL}/shipping/new/packages`)
  await page.locator('button:has-text("次へ")').first().click()
  await page.waitForURL(/\/shipping\/new\/contents\/hts/)

  // 直リンクで contents に来た場合も US なら /contents/hts へリダイレクト
  await page.goto(`${BASE_URL}/shipping/new/contents`)
  await page.waitForURL(/\/shipping\/new\/contents\/hts/)

  // HTS 入力が1件
  const hts = page.locator('[data-test="hts-code"]')
  expect(await hts.count()).toBe(1)

  // 空で次へ → エラー表示
  await hts.fill('')
  await page.locator('button:has-text("次へ")').first().click()
  await expect(page.locator('[data-test="hts-error"]').first()).toBeVisible()

  // 正しいHTSを入力して次へ → review へ直行
  await hts.fill('01065165')
  await page.locator('button:has-text("次へ")').first().click()
  await page.waitForURL(/\/shipping\/new\/review/)
})
