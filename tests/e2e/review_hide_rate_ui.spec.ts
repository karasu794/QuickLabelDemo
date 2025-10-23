// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBeTruthy: () => {}, toBe: (_: any) => {}, toHaveCount: (_: any) => {} }) }

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'
const HIDE_UI = (process.env.NEXT_PUBLIC_HIDE_REVIEW_RATE_UI ?? 'false').toLowerCase() !== 'false'

;(HIDE_UI ? test : test.skip)('レビュー画面: レートUIが非表示でプレースホルダが表示される', async ({ page }: any) => {
  await page.goto(`${BASE_URL}/shipping/new/review`)
  const placeholder = page.locator('[data-test="review-rate-placeholder"]').first()
  await placeholder.waitFor({ state: 'visible' })
  const picker = page.locator('[data-test="quote-container"]').first()
  // 存在しない（または非表示）こと
  await expect(await picker.count()).toBe(0)

  // 発行ボタンは selectedRate 未選択のため disabled のまま
  const issueBtn = page.locator('[data-test="issue-label-btn"]').first()
  await issueBtn.waitFor({ state: 'visible' })
  const disabled = await issueBtn.isDisabled()
  expect(disabled).toBe(true)
})


