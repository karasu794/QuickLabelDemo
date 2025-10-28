import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'

describe('normalizeFedExRate', () => {
  function rateWithSurcharges(surcharges:any[], base=10000, disc=0, total=10000){
    return {
      baseCharge: base,
      discounts: disc,
      ratedShipmentDetails: [{
        totalNetCharge: { amount: total, currency: 'JPY' },
        shipmentRateDetails: [{ surcharges }]
      }]
    }
  }

  test('Fuelのみ', () => {
    const resp = rateWithSurcharges([{ type: 'FUEL', amount: { amount: 500 } }], 10000, 1000, 9500)
    const dto = normalizeFedExRate(resp)
    expect(dto.surcharges.fuel?.amount).toBe(500)
    expect(dto.surcharges.peak?.amount).toBe(0)
  })

  test('Peakのみ', () => {
    const resp = rateWithSurcharges([{ type: 'PEAK', amount: { amount: 300 } }], 10000, 0, 10300)
    const dto = normalizeFedExRate(resp)
    expect(dto.surcharges.peak?.amount).toBe(300)
  })

  test('欠落時はotherに集約', () => {
    const resp = rateWithSurcharges([], 10000, 0, 10200)
    const dto = normalizeFedExRate(resp)
    expect(dto.surcharges.other?.amount).toBe(200)
    // 0円行も返す
    expect(dto.surcharges.residential?.amount).toBe(0)
    expect(dto.surcharges.deliveryArea?.amount).toBe(0)
  })
})


