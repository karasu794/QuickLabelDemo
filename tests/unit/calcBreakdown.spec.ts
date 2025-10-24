import { calcBreakdown } from '@/lib/rates/calcBreakdown'

describe('calcBreakdown', () => {
  test('送料1万円/割引1千円/燃料0/混雑0 → systemFee=1620, VAT=162, 合計=10782', () => {
    const input = {
      baseCharge: { amount: 10000, currency: 'JPY' },
      discounts: { amount: 1000, currency: 'JPY' },
      surcharges: { fuel: { amount: 0, currency: 'JPY' }, peak: { amount: 0, currency: 'JPY' }, other: { amount: 0, currency: 'JPY' } },
      totalNetCharge: { amount: 10000 - 1000 + 0 + 0, currency: 'JPY' },
    }
    const res = calcBreakdown(input as any)
    expect(res.lines.systemFee.amount).toBe(1620)
    expect(res.lines.vat.amount).toBe(162)
    expect(res.totals.grandTotal.amount).toBe(10782)
  })
})


