import { normalizeFedExRate } from '../../src/lib/rates/normalizeFedExRate'

function money(amount: number, currency = 'JPY') {
  return { amount, currency }
}

describe('normalizeFedExRate fallback when base/surcharges/discounts are missing', () => {
  test('falls back base to total when everything else is zero', () => {
    const resp: any = {
      ratedShipmentDetails: [
        {
          totalNetCharge: money(14249),
          shipmentRateDetails: [
            {
              // no surcharges, no discounts
            },
          ],
        },
      ],
      // baseCharge absent / zero, discounts absent
    }

    const b = normalizeFedExRate(resp, 'JPY')
    expect(b.baseCharge.amount).toBe(14249)
    expect(b.discounts.amount).toBe(0)
    expect(b.surcharges.other.amount).toBe(0)
    expect(b.totalNetCharge.amount).toBe(14249)
  })
})


