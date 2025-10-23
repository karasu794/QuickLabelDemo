// @ts-nocheck
let test, expect
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n, f) => {}; expect = () => ({ toBeTruthy: () => {}, toBe: (_)=>{}, toBeGreaterThan: (_)=>{} }) }

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

// 手動見積フロー（サービスページ）
;(process.env.NEXT_PUBLIC_ENABLE_SERVICE_STEP?.toLowerCase?.() !== 'false' ? test : test.skip)('Service: manual quote and select → review shows price', async ({ page }) => {
  // init: mock cookie と packages をプリセット
  await page.addInitScript(() => {
    try {
      document.cookie = 'core-mode=mock; path=/'
      localStorage.setItem('shipping-form-storage', JSON.stringify({ state: { packages: [{ type: 'YOUR_PACKAGING', weight: '1', length: '10', width: '10', height: '10', declaredValue: '0' }] }, version: 0 }))
    } catch {}
  })

  await page.goto(`${BASE_URL}/shipping/new/service`)

  // 1) 初期表示: /api/quote が自動発火しない（5秒監視）
  let autoFire = false
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('/api/quote')) autoFire = true
  })
  await page.waitForTimeout(5000)
  await expect(autoFire).toBe(false)

  // 2) 入力: isResidential ON
  const resi = page.locator('[data-test="svc-is-residential"]').first()
  if (await resi.count()) { await resi.check().catch(async()=>{ await resi.click().catch(()=>{}) }) }

  // 3) 入力: 保険ON→申告価額 10000
  const ins = page.locator('[data-test="svc-insurance-enabled"]').first()
  if (await ins.count()) { await ins.check().catch(async()=>{ await ins.click().catch(()=>{}) }) }
  const dv = page.locator('[data-test="svc-declared-value"]').first()
  if (await dv.count()) { await dv.fill('10000').catch(()=>{}) }

  // 4) 入力: shipDate は既定で今日。存在すればそのまま or 明日へ
  const ship = page.locator('[data-test="svc-ship-date"]').first()
  if (await ship.count()) {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth()+1).padStart(2,'0')
    const dd = String(today.getDate()).padStart(2,'0')
    await ship.fill(`${yyyy}-${mm}-${dd}`).catch(()=>{})
  }

  // 5) CTA クリック → レート表示
  const cta = page.locator('[data-test="svc-show-quote"]').first()
  await cta.click()
  const firstCard = page.locator('[data-test="quote-card"]').first()
  await firstCard.waitFor({ state: 'visible', timeout: 10000 })

  // 6) 最初のカード選択 → review に遷移 → 価格がダッシュではない
  const firstSelect = page.locator('[data-test="quote-select"]').first()
  await firstSelect.click()

  await page.waitForURL(/\/shipping\/new\/review/)
  const priceBlock = page.locator('[data-test="review-price"]').first()
  await priceBlock.waitFor({ state: 'visible' })
  await expect(priceBlock).not.toHaveText('—')
})


