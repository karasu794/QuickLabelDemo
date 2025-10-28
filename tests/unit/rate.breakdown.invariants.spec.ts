import { normalizeFedExRate } from '../../src/lib/rates/normalizeFedExRate'

const money = (n: number) => ({ amount: n, currency: 'JPY' })

function sumKnown(b: ReturnType<typeof normalizeFedExRate>) {
  return (
    (b.surcharges.fuel?.amount || 0) +
    (b.surcharges.peak?.amount || 0) +
    (b.surcharges.deliveryArea?.amount || 0) +
    (b.surcharges.additionalHandling?.amount || 0) +
    (b.surcharges.importProcessing?.amount || 0) +
    (b.surcharges.residential?.amount || 0)
  )
}

describe('Rate breakdown invariants', () => {
  test('表記ゆれ（FUEL_SURCHG / Customs Entry）を拾い、恒等式が成立', () => {
    const resp: any = {
      ratedShipmentDetails: [{
        totalNetCharge: money(9500),
        shipmentRateDetails: [{
          surcharges: [
            { type: 'FUEL_SURCHG', amount: 500 },   // Fuel の表記ゆれ
            { name: 'Customs Entry', amount: 100 }, // Import Processing の別表記
          ],
          discounts: [{ type: 'ACCOUNT', amount: 1000 }],
        }],
      }],
      baseCharge: 10000,
      discounts: 0,
    }
    const b = normalizeFedExRate(resp, 'JPY')
    const subtotal = Math.max(0, b.baseCharge.amount - b.discounts.amount)
    const recomposed = subtotal + sumKnown(b) + (b.surcharges.other?.amount || 0)
    expect(recomposed).toBe(b.totalNetCharge.amount)
    expect(b.discounts.amount).toBeLessThanOrEqual(b.baseCharge.amount)
    expect(b.surcharges.fuel?.amount || 0).toBeGreaterThan(0)
    expect(b.surcharges.importProcessing?.amount || 0).toBeGreaterThan(0)
  })

  test('discAll≈baseでも other=total にならない（クランプ＆推定が効く）', () => {
    const resp: any = {
      ratedShipmentDetails: [{
        totalNetCharge: money(14861),
        shipmentRateDetails: [{
          surcharges: [{ type: 'FUEL_SURCHG', amount: 500 }],
          discounts: [{ type: 'ACCOUNT', amount: 19319 }],
        }],
      }],
      baseCharge: 19319,
      discounts: 0,
    }
    const b = normalizeFedExRate(resp, 'JPY')
    const subtotal = Math.max(0, b.baseCharge.amount - b.discounts.amount)
    const recomposed = subtotal + sumKnown(b) + (b.surcharges.other?.amount || 0)
    expect(recomposed).toBe(b.totalNetCharge.amount)
    if ((b.surcharges.fuel?.amount || 0) > 0) {
      expect(b.surcharges.other?.amount || 0).toBeLessThan(b.totalNetCharge.amount)
    }
  })

  test('base フォールバック（totalNetFreight + totalFreightDiscounts）でも恒等式成立', () => {
    const resp: any = {
      ratedShipmentDetails: [{
        totalNetCharge: money(12000),
        shipmentRateDetails: [{
          surcharges: [{ type: 'PEAK', amount: 200 }],
          discounts: [{ type: 'VOLUME', amount: 800 }],
          totalNetFreight: money(12000),
          totalFreightDiscounts: money(800),
        }],
      }],
      baseCharge: undefined,
      discounts: 0,
    }
    const b = normalizeFedExRate(resp, 'JPY')
    const subtotal = Math.max(0, b.baseCharge.amount - b.discounts.amount)
    const recomposed = subtotal + sumKnown(b) + (b.surcharges.other?.amount || 0)
    expect(recomposed).toBe(b.totalNetCharge.amount)
    expect(b.baseCharge.amount).toBeGreaterThan(0)
  })
})


