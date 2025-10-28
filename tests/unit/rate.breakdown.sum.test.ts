import { normalizeFedExRate } from '../../src/lib/rates/normalizeFedExRate'

function money(amount: number, currency = 'JPY') {
  return { amount, currency }
}

describe('Rate breakdown sum consistency', () => {
  test('base + surcharges - discounts === total (no double discount)', () => {
    const resp: any = {
      ratedShipmentDetails: [
        {
          totalNetCharge: money(10000),
          shipmentRateDetails: [
            {
              surcharges: [
                { type: 'FUEL_SURCHG', amount: 800 }, // 表記ゆれでも拾えること
                { type: 'RESIDENTIAL_DELIVERY', amount: 500 },
                { type: 'DELIVERY_AREA', amount: 300 },
                { type: 'ADDITIONAL_HANDLING', amount: 200 },
                { type: 'Customs Entry', amount: 100 }, // importProcessing の別表記
              ],
              discounts: [{ type: 'ACCOUNT', amount: 1000 }],
            },
          ],
        },
      ],
      baseCharge: 9000,
      discounts: 0,
    }
    const b = normalizeFedExRate(resp, 'JPY')
    const base = b.baseCharge.amount
    const disc = b.discounts.amount
    const fuel = b.surcharges.fuel?.amount || 0
    const resi = b.surcharges.residential?.amount || 0
    const da = b.surcharges.deliveryArea?.amount || 0
    const ah = b.surcharges.additionalHandling?.amount || 0
    const peak = b.surcharges.peak?.amount || 0
    const ip = b.surcharges.importProcessing?.amount || 0
    const other = b.surcharges.other?.amount || 0
    const total = b.totalNetCharge.amount
    const subtotal = Math.max(0, base - disc)
    const sum = subtotal + fuel + resi + da + ah + peak + ip + other
    expect(sum).toBe(total)
  })
})

test('guard & inference: prevents other==total when discounts over-counted or missing', () => {
  const money = (n: number) => ({ amount: n, currency: 'JPY' })
  // discAll≈base を引き起こすレスポンス
  const resp: any = {
    ratedShipmentDetails: [
      {
        totalNetCharge: money(14861),
        shipmentRateDetails: [
          {
            surcharges: [
              { type: 'FUEL_SURCHG', amount: 500 }, // 既知サーチャージがある
            ],
            discounts: [{ type: 'ACCOUNT', amount: 19319 }],
          },
        ],
      },
    ],
    baseCharge: 19319,
    discounts: 0,
  }
  const b = normalizeFedExRate(resp, 'JPY')
  const sumKnown =
    (b.surcharges.fuel?.amount || 0) +
    (b.surcharges.peak?.amount || 0) +
    (b.surcharges.deliveryArea?.amount || 0) +
    (b.surcharges.additionalHandling?.amount || 0) +
    (b.surcharges.importProcessing?.amount || 0) +
    (b.surcharges.residential?.amount || 0)
  const subtotal = Math.max(0, b.baseCharge.amount - b.discounts.amount)
  const recomposed = subtotal + sumKnown + (b.surcharges.other?.amount || 0)
  expect(recomposed).toBe(b.totalNetCharge.amount)
  // 割引は base を超えない
  expect(b.discounts.amount).toBeLessThanOrEqual(b.baseCharge.amount)
  // fuel がある限り other が total 丸呑みにはならない
  if ((b.surcharges.fuel?.amount || 0) > 0) {
    expect(b.surcharges.other?.amount || 0).toBeLessThan(b.totalNetCharge.amount)
  }
})


