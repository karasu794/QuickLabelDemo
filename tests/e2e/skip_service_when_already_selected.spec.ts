// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBeTruthy: () => {}, toBe: (_: any) => {}, toMatch: (_: any) => {} }) }

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

// Non-US: contents 送信時は selectedRate があれば service をスキップし review へ
;(test)('Skip service when already selected (Non-US contents)', async ({ page }: any) => {
  const persisted = {
    shipperInfo: { contactName: '', companyName: '', taxId: '', phoneNumber: '', email: '', countryCode: 'JP', stateCode: '', address1: '', address2: '', postalCode: '', cityName: '' },
    recipientInfo: { contactName: '', companyName: '', taxNumber: '', phoneNumber: '', email: '', countryCode: 'JP', postalCode: '1000001', cityName: 'Chiyoda', stateCode: '', address1: '', address2: '', isResidential: false, htsCode: '' },
    packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }],
    items: [{ description: 'Book', hsCode: '490199', countryOfManufacture: 'JP', quantity: 1, weight: 1, unitPrice: 1000, currency: 'JPY' }],
    contents: [{ description: 'Book', quantity: 1, value: 1000, weight: 1, countryOfOrigin: 'JP', hsCode: '490199' }],
    shippingPurpose: '',
    selectedRate: { serviceName: 'FedEx International Priority', amount: 1500, currency: 'JPY', serviceType: 'INTERNATIONAL_PRIORITY' },
    completedSteps: [],
    phoenixMode: 'none'
  }
  await page.addInitScript(([k, v]) => localStorage.setItem(k as string, v as string), [
    'shipping-form-storage', JSON.stringify({ state: persisted, version: 0 })
  ])

  // contents を送信 → review へ直行
  await page.goto(`${BASE_URL}/shipping/new/contents`)
  const nextBtn = page.locator('button:has-text("次へ")').first()
  await nextBtn.click()
  await page.waitForURL(/\/shipping\/new\/review/)
  expect(page.url()).toMatch(/\/shipping\/new\/review/)

  // service を直叩き → 即時 review へ
  await page.goto(`${BASE_URL}/shipping/new/service`)
  await page.waitForURL(/\/shipping\/new\/review/)
  expect(page.url()).toMatch(/\/shipping\/new\/review/)
})

// US: contents/hts 送信時も selectedRate があれば review へ直行
;(test)('Skip service when already selected (US HTS contents)', async ({ page }: any) => {
  const persisted = {
    shipperInfo: { contactName: '', companyName: '', taxId: '', phoneNumber: '', email: '', countryCode: 'JP', stateCode: '', address1: '', address2: '', postalCode: '', cityName: '' },
    recipientInfo: { contactName: '', companyName: '', taxNumber: '', phoneNumber: '', email: '', countryCode: 'US', postalCode: '90001', cityName: 'Los Angeles', stateCode: 'CA', address1: '', address2: '', isResidential: false, htsCode: '' },
    packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }],
    items: [{ description: 'Toy', htsCode: '01065165', countryOfManufacture: 'JP', quantity: 1, weight: 1, unitPrice: 1000, currency: 'JPY' }],
    contents: [{ description: 'Toy', quantity: 1, value: 1000, weight: 1, countryOfOrigin: 'JP', hsCode: '' }],
    shippingPurpose: '',
    selectedRate: { serviceName: 'FedEx International Priority', amount: 1500, currency: 'JPY', serviceType: 'INTERNATIONAL_PRIORITY' },
    completedSteps: [],
    phoenixMode: 'none'
  }
  await page.addInitScript(([k, v]) => localStorage.setItem(k as string, v as string), [
    'shipping-form-storage', JSON.stringify({ state: persisted, version: 0 })
  ])

  // contents/hts を送信 → review へ直行
  await page.goto(`${BASE_URL}/shipping/new/contents/hts`)
  const nextBtn = page.locator('button:has-text("次へ")').first()
  await nextBtn.click()
  await page.waitForURL(/\/shipping\/new\/review/)
  expect(page.url()).toMatch(/\/shipping\/new\/review/)

  // service を直叩き → 即時 review へ
  await page.goto(`${BASE_URL}/shipping/new/service`)
  await page.waitForURL(/\/shipping\/new\/review/)
  expect(page.url()).toMatch(/\/shipping\/new\/review/)
})
