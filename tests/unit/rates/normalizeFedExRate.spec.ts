import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'

describe('normalizeFedExRate breakdown lines and totals', () => {
  it('主要行を個別行で返し、合計が一致する（ゼロ抑制なし）', () => {
    // baseCharge: 10000, discounts: 2000, netFreight: 8000
    // surcharges: fuel 500 + peak 300 + deliveryArea 400 + importProcessing 250 = 1450
    // totalNetCharge: 8000 + 1450 = 9450
    const resp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: { amount: 9450, currency: 'JPY' },
          shipmentRateDetails: [
            {
              totalBaseCharge: { amount: 10000, currency: 'JPY' },
              totalDiscounts: { amount: 2000, currency: 'JPY' },
              discounts: [{ amount: { amount: 2000 } }],
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
    // additionalHandling は削除（specialHandling に移行）
    expect(dto.specialHandling).toBeDefined()
    expect(dto.surcharges.insuredValue?.amount).toBe(0)
    // other は差分 (9450 - 8000 - 500 - 300 - 400 - 250 = 0)
    expect(dto.surcharges.other?.amount).toBe(0)

    const sum =
      Math.max(0, dto.baseCharge.amount - dto.discounts.amount) +
      (dto.surcharges.fuel?.amount || 0) +
      (dto.surcharges.peak?.amount || 0) +
      (dto.surcharges.residential?.amount || 0) +
      (dto.surcharges.deliveryArea?.amount || 0) +
      (dto.specialHandling?.oversize?.amount || 0) +
      (dto.specialHandling?.dimension?.amount || 0) +
      (dto.specialHandling?.weight?.amount || 0) +
      (dto.specialHandling?.packaging?.amount || 0) +
      (dto.specialHandling?.nonStackable?.amount || 0) +
      (dto.surcharges.importProcessing?.amount || 0) +
      (dto.surcharges.insuredValue?.amount || 0) +
      (dto.surcharges.other?.amount || 0)

    expect(sum).toBe(dto.totalNetCharge.amount)
  })

  it('insuredValue を含むケースで、base - discount + Σ(surcharges含insuredValue) + other = total', () => {
    // baseCharge: 10000, discounts: 2000, netFreight: 8000
    // surcharges: fuel 500 + peak 300 + insuredValue 400 + deliveryArea 250 = 1450
    // totalNetCharge: 8000 + 1450 = 9450
    const resp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: { amount: 9450, currency: 'JPY' },
          shipmentRateDetails: [
            {
              totalBaseCharge: { amount: 10000, currency: 'JPY' },
              totalDiscounts: { amount: 2000, currency: 'JPY' },
              discounts: [{ amount: { amount: 2000 } }],
              surcharges: [
                { type: 'FUEL', amount: { amount: 500 } },
                { type: 'PEAK', amount: { amount: 300 } },
                { type: 'DECLARED_VALUE', amount: { amount: 400 } },
                { type: 'DELIVERY_AREA_SURCHARGE', amount: { amount: 250 } },
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
    expect(dto.surcharges.insuredValue?.amount).toBe(400)
    expect(dto.surcharges.deliveryArea?.amount).toBe(250)
    expect(dto.surcharges.residential?.amount).toBe(0)
    // additionalHandling は削除（specialHandling に移行）
    expect(dto.specialHandling).toBeDefined()
    expect(dto.surcharges.importProcessing?.amount).toBe(0)

    const sum =
      Math.max(0, dto.baseCharge.amount - dto.discounts.amount) +
      (dto.surcharges.fuel?.amount || 0) +
      (dto.surcharges.peak?.amount || 0) +
      (dto.surcharges.residential?.amount || 0) +
      (dto.surcharges.deliveryArea?.amount || 0) +
      (dto.specialHandling?.oversize?.amount || 0) +
      (dto.specialHandling?.dimension?.amount || 0) +
      (dto.specialHandling?.weight?.amount || 0) +
      (dto.specialHandling?.packaging?.amount || 0) +
      (dto.specialHandling?.nonStackable?.amount || 0) +
      (dto.surcharges.importProcessing?.amount || 0) +
      (dto.surcharges.insuredValue?.amount || 0) +
      (dto.surcharges.other?.amount || 0)

    expect(sum).toBe(dto.totalNetCharge.amount)
  })

  it('insuredValue なしケースで上式が成り立つこと', () => {
    // baseCharge: 10000, discounts: 2000, netFreight: 8000
    // surcharges: fuel 500 + peak 300 + deliveryArea 250 + importProcessing 250 = 1300
    // totalNetCharge: 8000 + 1300 = 9300
    const resp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: { amount: 9300, currency: 'JPY' },
          shipmentRateDetails: [
            {
              totalBaseCharge: { amount: 10000, currency: 'JPY' },
              totalDiscounts: { amount: 2000, currency: 'JPY' },
              discounts: [{ amount: { amount: 2000 } }],
              surcharges: [
                { type: 'FUEL', amount: { amount: 500 } },
                { type: 'PEAK', amount: { amount: 300 } },
                { type: 'DELIVERY_AREA_SURCHARGE', amount: { amount: 250 } },
                { type: 'IMPORT_PROCESSING', amount: { amount: 250 } },
              ],
            },
          ],
        },
      ],
    }

    const dto = normalizeFedExRate(resp, 'JPY')
    expect(dto.surcharges.insuredValue?.amount).toBe(0)

    const sum =
      Math.max(0, dto.baseCharge.amount - dto.discounts.amount) +
      (dto.surcharges.fuel?.amount || 0) +
      (dto.surcharges.peak?.amount || 0) +
      (dto.surcharges.residential?.amount || 0) +
      (dto.surcharges.deliveryArea?.amount || 0) +
      (dto.specialHandling?.oversize?.amount || 0) +
      (dto.specialHandling?.dimension?.amount || 0) +
      (dto.specialHandling?.weight?.amount || 0) +
      (dto.specialHandling?.packaging?.amount || 0) +
      (dto.specialHandling?.nonStackable?.amount || 0) +
      (dto.surcharges.importProcessing?.amount || 0) +
      (dto.surcharges.insuredValue?.amount || 0) +
      (dto.surcharges.other?.amount || 0)

    expect(sum).toBe(dto.totalNetCharge.amount)
  })
})


