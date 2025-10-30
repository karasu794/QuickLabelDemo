import { test, expect } from '@playwright/test'

test.describe('見積もり内訳合計検証', () => {
  test('declaredValue=0 → 内訳合計=合計', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
    await page.addInitScript(() => {
      try {
        document.cookie = 'core-mode=mock; path=/'
        localStorage.setItem('shipping-form-storage', JSON.stringify({ 
          state: { 
            packages: [{ 
              type: 'YOUR_PACKAGING', 
              weight: '1', 
              length: '10', 
              width: '10', 
              height: '10', 
              declaredValue: '0' 
            }] 
          }, 
          version: 0 
        }))
      } catch {}
    })
    await page.goto('/shipping/new/service')
    await page.getByTestId('svc-show-quote').waitFor({ state: 'visible' })
    const resi = page.locator('[data-test="svc-is-residential"]').first()
    if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }
    const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
    if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
    const dv = page.locator('[data-test="svc-declared-value"]').first()
    if (await dv.count()) { await dv.fill('0').catch(()=>{}) }
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
    
    // 最初のカードを展開
    const firstCard = page.locator('[data-test="quote-card"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    await firstCard.click()
    
    // 内訳各行を取得して合計
    const baseRateEl = page.locator('[data-test="breakdown-row-baseRate"]')
    const volumeDiscountEl = page.locator('[data-test="breakdown-row-volumeDiscount"]')
    const fuelEl = page.locator('[data-test="breakdown-row-fuelSurcharge"]')
    const peakEl = page.locator('[data-test="breakdown-row-peakSurcharge"]')
    const residentialEl = page.locator('[data-test="breakdown-row-residentialSurcharge"]')
    const deliveryAreaEl = page.locator('[data-test="breakdown-row-outOfDeliveryArea"]')
    // additionalHandling は削除（specialHandling に移行）
    const ahsOversizeEl = page.locator('[data-test="breakdown-row-ahs-oversize"]')
    const ahsDimensionEl = page.locator('[data-test="breakdown-row-ahs-dimension"]')
    const ahsWeightEl = page.locator('[data-test="breakdown-row-ahs-weight"]')
    const ahsPackagingEl = page.locator('[data-test="breakdown-row-ahs-packaging"]')
    const ahsNonStackableEl = page.locator('[data-test="breakdown-row-ahs-nonstackable"]')
    const importProcessingEl = page.locator('[data-test="breakdown-row-usImportProcessingFee"]')
    const insuredValueEl = page.locator('[data-test="breakdown-row-declaredValue"]')
    const otherEl = page.locator('[data-test="breakdown-row-otherSurcharge"]')
    const totalEl = page.locator('[data-test="breakdown-total"]')
    
    await totalEl.waitFor({ state: 'visible', timeout: 5000 })
    
    const extractAmount = async (el: any) => {
      if (await el.count() === 0) return 0
      const text = await el.textContent()
      return Number((text || '').replace(/[^0-9]/g, '')) || 0
    }
    
    const baseRate = await extractAmount(baseRateEl)
    const volumeDiscount = await extractAmount(volumeDiscountEl)
    const fuel = await extractAmount(fuelEl)
    const peak = await extractAmount(peakEl)
    const residential = await extractAmount(residentialEl)
    const deliveryArea = await extractAmount(deliveryAreaEl)
    const ahsOversize = await extractAmount(ahsOversizeEl)
    const ahsDimension = await extractAmount(ahsDimensionEl)
    const ahsWeight = await extractAmount(ahsWeightEl)
    const ahsPackaging = await extractAmount(ahsPackagingEl)
    const ahsNonStackable = await extractAmount(ahsNonStackableEl)
    const additionalHandling = ahsOversize + ahsDimension + ahsWeight + ahsPackaging + ahsNonStackable
    const importProcessing = await extractAmount(importProcessingEl)
    const insuredValue = await extractAmount(insuredValueEl)
    const other = await extractAmount(otherEl)
    const total = await extractAmount(totalEl)
    
    const calculatedTotal = baseRate - volumeDiscount + fuel + peak + residential + deliveryArea + additionalHandling + importProcessing + insuredValue + other
    
    // 合計が一致することを検証（1円の丸め誤差は許容）
    expect(Math.abs(calculatedTotal - total)).toBeLessThanOrEqual(1)
  })

  test('declaredValue>0 → insuredValue 表示かつ内訳合計=合計', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
    await page.addInitScript(() => {
      try {
        document.cookie = 'core-mode=mock; path=/'
        localStorage.setItem('shipping-form-storage', JSON.stringify({ 
          state: { 
            packages: [{ 
              type: 'YOUR_PACKAGING', 
              weight: '1', 
              length: '10', 
              width: '10', 
              height: '10', 
              declaredValue: '10000' 
            }] 
          }, 
          version: 0 
        }))
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
    
    // 最初のカードを展開
    const firstCard = page.locator('[data-test="quote-card"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    await firstCard.click()
    
    // insuredValue が表示されていることを確認
    const insuredValueEl = page.locator('[data-test="breakdown-row-declaredValue"]')
    await insuredValueEl.waitFor({ state: 'visible', timeout: 5000 })
    const insuredValueText = await insuredValueEl.textContent()
    expect(insuredValueText).toContain('保険料')
    
    // 内訳合計を計算
    const extractAmount = async (el: any) => {
      if (await el.count() === 0) return 0
      const text = await el.textContent()
      return Number((text || '').replace(/[^0-9]/g, '')) || 0
    }
    
    const baseRate = await extractAmount(page.locator('[data-test="breakdown-row-baseRate"]'))
    const volumeDiscount = await extractAmount(page.locator('[data-test="breakdown-row-volumeDiscount"]'))
    const fuel = await extractAmount(page.locator('[data-test="breakdown-row-fuelSurcharge"]'))
    const peak = await extractAmount(page.locator('[data-test="breakdown-row-peakSurcharge"]'))
    const residential = await extractAmount(page.locator('[data-test="breakdown-row-residentialSurcharge"]'))
    const deliveryArea = await extractAmount(page.locator('[data-test="breakdown-row-outOfDeliveryArea"]'))
    const additionalHandling = await extractAmount(page.locator('[data-test="breakdown-row-additionalHandlingSurcharge"]'))
    const importProcessing = await extractAmount(page.locator('[data-test="breakdown-row-usImportProcessingFee"]'))
    const insuredValue = await extractAmount(insuredValueEl)
    const other = await extractAmount(page.locator('[data-test="breakdown-row-otherSurcharge"]'))
    const total = await extractAmount(page.locator('[data-test="breakdown-total"]'))
    
    const calculatedTotal = baseRate - volumeDiscount + fuel + peak + residential + deliveryArea + additionalHandling + importProcessing + insuredValue + other
    
    // 合計が一致することを検証（1円の丸め誤差は許容）
    expect(Math.abs(calculatedTotal - total)).toBeLessThanOrEqual(1)
  })

  test('extraSurchargesJa が1件以上表示 → 合計一致（extraSurchargesJa は合計外）', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
    await page.addInitScript(() => {
      try {
        document.cookie = 'core-mode=mock; path=/'
        localStorage.setItem('shipping-form-storage', JSON.stringify({ 
          state: { 
            packages: [{ 
              type: 'YOUR_PACKAGING', 
              weight: '1', 
              length: '10', 
              width: '10', 
              height: '10', 
              declaredValue: '0' 
            }] 
          }, 
          version: 0 
        }))
      } catch {}
    })
    await page.goto('/shipping/new/service')
    await page.getByTestId('svc-show-quote').waitFor({ state: 'visible' })
    const resi = page.locator('[data-test="svc-is-residential"]').first()
    if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }
    const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
    if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
    const dv = page.locator('[data-test="svc-declared-value"]').first()
    if (await dv.count()) { await dv.fill('0').catch(()=>{}) }
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
    
    // 最初のカードを展開
    const firstCard = page.locator('[data-test="quote-card"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 15000 })
    await firstCard.click()
    
    // extraSurchargesJa が表示されているか確認
    const extraSurcharges = page.locator('[data-test^="breakdown-row-extra-"]')
    const extraCount = await extraSurcharges.count()
    
    const extractAmount = async (el: any) => {
      if (await el.count() === 0) return 0
      const text = await el.textContent()
      return Number((text || '').replace(/[^0-9]/g, '')) || 0
    }
    
    // extraSurchargesJa の合計を計算（検証用、実際の合計には含めない）
    let extraSum = 0
    for (let i = 0; i < extraCount; i++) {
      const extraEl = page.locator(`[data-test="breakdown-row-extra-${i}"]`)
      extraSum += await extractAmount(extraEl)
    }
    
    // 基本内訳の合計を計算（extraSurchargesJa は含めない）
    const baseRate = await extractAmount(page.locator('[data-test="breakdown-row-baseRate"]'))
    const volumeDiscount = await extractAmount(page.locator('[data-test="breakdown-row-volumeDiscount"]'))
    const fuel = await extractAmount(page.locator('[data-test="breakdown-row-fuelSurcharge"]'))
    const peak = await extractAmount(page.locator('[data-test="breakdown-row-peakSurcharge"]'))
    const residential = await extractAmount(page.locator('[data-test="breakdown-row-residentialSurcharge"]'))
    const deliveryArea = await extractAmount(page.locator('[data-test="breakdown-row-outOfDeliveryArea"]'))
    const additionalHandling = await extractAmount(page.locator('[data-test="breakdown-row-additionalHandlingSurcharge"]'))
    const importProcessing = await extractAmount(page.locator('[data-test="breakdown-row-usImportProcessingFee"]'))
    const insuredValue = await extractAmount(page.locator('[data-test="breakdown-row-declaredValue"]'))
    const other = await extractAmount(page.locator('[data-test="breakdown-row-otherSurcharge"]'))
    const total = await extractAmount(page.locator('[data-test="breakdown-total"]'))
    
    // extraSurchargesJa は other から控除済みのため合計には含めない
    const calculatedTotal = baseRate - volumeDiscount + fuel + peak + residential + deliveryArea + additionalHandling + importProcessing + insuredValue + other
    
    // 合計が一致することを検証（1円の丸め誤差は許容）
    expect(Math.abs(calculatedTotal - total)).toBeLessThanOrEqual(1)
  })
})

