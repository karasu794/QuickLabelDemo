import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'

describe('normalizeFedExRate breakdown lines and totals', () => {
  it('主要行を個別行で返し、合計が一致する（ゼロ抑制なし）', () => {
    const resp = {
      baseCharge: 10000,
      discounts: 2000,
      ratedShipmentDetails: [
        {
          totalNetCharge: { amount: 9600, currency: 'JPY' },
          shipmentRateDetails: [
            {
              surcharges: [
                { type: 'FUEL', amount: { amount: 500 } },
                { type: 'PEAK', amount: { amount: 300 } },
                { type: 'DELIVERY_AREA_SURCHARGE', amount: { amount: 400 } },
                { type: 'IMPORT_PROCESSING', amount: { amount: 250 } },
              ],
            },
          ],
        },
      ],
    }

    const dto = normalizeFedExRate(resp, 'JPY')
    expect(dto.baseCharge.amount).toBe(10000)
    expect(dto.discounts.amount).toBe(2000)
    expect(dto.surcharges.fuel?.amount).toBe(500)
    expect(dto.surcharges.peak?.amount).toBe(300)
    expect(dto.surcharges.deliveryArea?.amount).toBe(400)
    expect(dto.surcharges.importProcessing?.amount).toBe(250)
    // 未指定は0で保持（undefinedにしない）
    expect(dto.surcharges.residential?.amount).toBe(0)
    expect(dto.surcharges.additionalHandling?.amount).toBe(0)
    // other は差分
    expect(dto.surcharges.other?.amount).toBe(150)

    const sum =
      Math.max(0, dto.baseCharge.amount - dto.discounts.amount) +
      (dto.surcharges.fuel?.amount || 0) +
      (dto.surcharges.peak?.amount || 0) +
      (dto.surcharges.residential?.amount || 0) +
      (dto.surcharges.deliveryArea?.amount || 0) +
      (dto.surcharges.additionalHandling?.amount || 0) +
      (dto.surcharges.importProcessing?.amount || 0) +
      (dto.surcharges.other?.amount || 0)

    expect(sum).toBe(dto.totalNetCharge.amount)
  })
})


