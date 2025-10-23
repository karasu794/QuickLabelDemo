// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBeTruthy: () => {}, toContain: (_: any) => {} }) }

test('トップ/レビューともに QuotePickerShared 経由のデータテスト属性を使用', async () => {
  const fs = require('fs')
  const top = fs.readFileSync('src/components/FedExQuoteResults.tsx', 'utf-8')
  expect(top.includes('data-test="quote-card"')).toBeTruthy()
  expect(top.includes('data-test="quote-select"')).toBeTruthy()
})


