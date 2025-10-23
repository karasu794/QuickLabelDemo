import { chromium, FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.addInitScript(() => {
    try {
      document.cookie = 'core-mode=mock; path=/'
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const state = {
        shipperInfo: {
          contactName: 'E2E Shipper', companyName: 'E2E Co', taxId: '', phoneNumber: '000', email: 'shipper@example.com',
          countryCode: 'JP', stateCode: '', postalCode: '1000001', cityName: 'Chiyoda', address1: '1-1-1', address2: ''
        },
        recipientInfo: {
          contactName: 'E2E Recipient', companyName: 'E2E LLC', taxNumber: '', phoneNumber: '000', email: 'recipient@example.com',
          countryCode: 'US', stateCode: 'CA', postalCode: '94016', cityName: 'Daly City', address1: '1st Ave', address2: '', isResidential: true, htsCode: ''
        },
        packages: [
          { type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '10000' },
          { type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }
        ],
        items: [ { description: 'item', hsCode: '', countryOfManufacture: 'JP', quantity: 1, weight: 1, unitPrice: 100, currency: 'JPY' } ],
        contents: [ { description: 'item', quantity: 1, value: 100, weight: 1, countryOfOrigin: 'JP', hsCode: '' } ],
        shippingPurpose: 'PERSONAL_USE',
        selectedRate: null,
        completedSteps: [],
        phoenixMode: 'none',
        // service の追加入力
        isResidential: true,
        higherInsurance: true,
        declaredValue: 10000,
        currency: 'JPY',
        shipDate: `${yyyy}-${mm}-${dd}`,
        accountType: 'standard',
      }
      localStorage.setItem('shipping-form-storage', JSON.stringify({ state, version: 0 }))
    } catch {}
  })
  await browser.close()
}


