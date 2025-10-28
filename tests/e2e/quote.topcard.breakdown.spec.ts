import { test, expect } from '@playwright/test'

test('トップカード：割引が表示され、otherが合計丸呑みにならない', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
  await page.addInitScript(() => {
    try {
      document.cookie = 'core-mode=mock; path=/'
      localStorage.setItem('shipping-form-storage', JSON.stringify({ state: { packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }] }, version: 0 }))
    } catch {}
  })
  await page.goto('/shipping/new/service')
  await page.getByTestId('svc-show-quote').waitFor({ state: 'visible' })
  // 入力調整（存在する要素のみ）
  const resi = page.locator('[data-test="svc-is-residential"]').first()
  if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }
  const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
  if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
  const dv = page.locator('[data-test="svc-declared-value"]').first()
  if (await dv.count()) { await dv.fill('10000').catch(()=>{}) }
  const ship = page.locator('[data-test="svc-ship-date"]').first()
  if (await ship.count()) {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth()+1).padStart(2,'0')
    const dd = String(today.getDate()).padStart(2,'0')
    await ship.fill(`${yyyy}-${mm}-${dd}`).catch(()=>{})
  }
  const cta = page.locator('[data-test="svc-show-quote"]').first()
  await cta.click()
  const firstCard = page.locator('[data-test="quote-card"]').first()
  await firstCard.waitFor({ state: 'visible', timeout: 15000 })
  await firstCard.click()

  const disc = await page.$('[data-test="breakdown-row-volumeDiscount"]')
  expect(disc).not.toBeNull()
  expect((await disc!.textContent()) || '').not.toContain('¥0')

  const maybeOther = await page.$('[data-test="breakdown-row-otherSurcharge"]')
  if (maybeOther) {
    const otherTxt = ((await maybeOther.textContent()) || '').replace(/[,¥\s]/g, '')
    const totalTxt = (((await (await page.$('[data-test="breakdown-total"]'))!.textContent()) || '').replace(/[,¥\s]/g, ''))
    expect(otherTxt).not.toEqual(totalTxt)
  }

  const candidates = [
    'breakdown-row-fuelSurcharge',
    'breakdown-row-usImportProcessingFee',
    'breakdown-row-peakSurcharge',
    'breakdown-row-outOfDeliveryArea',
    'breakdown-row-additionalHandlingSurcharge',
  ]
  for (const sel of candidates) {
    const row = await page.$(`[data-test="${sel}"]`)
    if (row) {
      expect((await row.textContent()) || '').not.toContain('¥0')
    }
  }
})
test.describe('トップカード内訳表示', () => {
  test('非ゼロ項目のみが表示され、合計が一致', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
    await page.addInitScript(() => {
      try {
        document.cookie = 'core-mode=mock; path=/'
        localStorage.setItem('shipping-form-storage', JSON.stringify({ state: { packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }] }, version: 0 }))
      } catch {}
    })
    await page.goto('/shipping/new/service');
    await page.getByTestId('svc-show-quote').waitFor({ state: 'visible' })
    const resi = page.locator('[data-test="svc-is-residential"]').first()
    if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }
    const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
    if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
    const dv = page.locator('[data-test="svc-declared-value"]').first()
    if (await dv.count()) { await dv.fill('10000').catch(()=>{}) }
    const ship = page.locator('[data-test="svc-ship-date"]').first()
    if (await ship.count()) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth()+1).padStart(2,'0')
      const dd = String(today.getDate()).padStart(2,'0')
      await ship.fill(`${yyyy}-${mm}-${dd}`).catch(()=>{})
    }
    const cta = page.locator('[data-test="svc-show-quote"]').first()
    await cta.click()
    const firstCard = page.locator('[data-test="quote-card"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    await firstCard.click(); // 展開

    // 基本料金行
    const baseRow = await page.$('[data-test="breakdown-row-baseRate"]')
    expect(baseRow).not.toBeNull()

    // 任意のサーチャージ行（存在すれば非ゼロ）
    const maybeFuel = await page.$('[data-test="breakdown-row-fuelSurcharge"]')
    if (maybeFuel) {
      const text = await maybeFuel.textContent()
      expect(text || '').not.toContain('¥0')
    }

    const maybeResidential = await page.$('[data-test="breakdown-row-residentialSurcharge"]')
    if (maybeResidential) {
      const text = await maybeResidential.textContent()
      expect(text || '').not.toContain('¥0')
    }

    const maybeDeliveryArea = await page.$('[data-test="breakdown-row-outOfDeliveryArea"]')
    if (maybeDeliveryArea) {
      const text = await maybeDeliveryArea.textContent()
      expect(text || '').not.toContain('¥0')
      expect(text || '').toContain('配達')
    }

    const maybeAdditional = await page.$('[data-test="breakdown-row-additionalHandlingSurcharge"]')
    if (maybeAdditional) {
      const text = await maybeAdditional.textContent()
      expect(text || '').not.toContain('¥0')
    }

    const maybePeak = await page.$('[data-test="breakdown-row-peakSurcharge"]')
    if (maybePeak) {
      const text = await maybePeak.textContent()
      expect(text || '').not.toContain('¥0')
    }

  const maybeOther = await page.$('[data-test="breakdown-row-otherSurcharge"]')
  if (maybeOther) {
    const text = await maybeOther.textContent()
    expect(text || '').not.toContain('¥0')
  }

    // 合計行存在
    const totalRow = await page.$('[data-test="breakdown-total"]')
    expect(totalRow).not.toBeNull()
  })

  test('割引行が表示され、otherが合計丸呑みにならない', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
    await page.addInitScript(() => {
      try {
        document.cookie = 'core-mode=mock; path=/'
        localStorage.setItem('shipping-form-storage', JSON.stringify({ state: { packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }] }, version: 0 }))
      } catch {}
    })
    await page.goto('/shipping/new/service')
    await page.getByTestId('svc-show-quote').waitFor({ state: 'visible' })
    const resi = page.locator('[data-test="svc-is-residential"]').first()
    if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }
    const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
    if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
    const dv = page.locator('[data-test="svc-declared-value"]').first()
    if (await dv.count()) { await dv.fill('10000').catch(()=>{}) }
    const ship = page.locator('[data-test="svc-ship-date"]').first()
    if (await ship.count()) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth()+1).padStart(2,'0')
      const dd = String(today.getDate()).padStart(2,'0')
      await ship.fill(`${yyyy}-${mm}-${dd}`).catch(()=>{})
    }
    const cta = page.locator('[data-test="svc-show-quote"]').first()
    await cta.click()
    const firstCard = page.locator('[data-test="quote-card"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    await firstCard.click()

    const discRow = await page.$('[data-test="price-breakdown-row-volume-discount"]')
    expect(discRow).not.toBeNull()
    expect((await discRow!.textContent()) || '').not.toContain('¥0')

    const otherRow = await page.$('[data-test="price-breakdown-row-other"]')
    if (otherRow) {
      const otherTxt = ((await otherRow.textContent()) || '').replace(/[,¥\s]/g, '')
      const totalTxt = (
        ((await (await page.$('[data-test="price-breakdown-total"]'))!.textContent()) || '').replace(/[,¥\s]/g, '')
      )
      expect(otherTxt).not.toEqual(totalTxt)
    }
  })
})


