import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import { classifySurcharge, deriveDeliveryAreaLevel } from '@/lib/rates/fedex/mapping'

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

  describe('重複集計防止', () => {
    it('shipmentとpackage両方にDELIVERY_AREAがあっても二重計上しない（shipment側のみ採用）', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 11000, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 11000, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'DELIVERY_AREA', type: 'DELIVERY_AREA', amount: { amount: 370 } },
                  { surchargeType: 'FUEL', type: 'FUEL', amount: { amount: 630 } },
                ],
              },
            ],
            ratedPackages: [
              {
                packageRateDetail: {
                  surcharges: [
                    { surchargeType: 'DELIVERY_AREA', type: 'DELIVERY_AREA', amount: { amount: 370 } },
                    { surchargeType: 'FUEL', type: 'FUEL', amount: { amount: 630 } },
                  ],
                },
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      // shipment側にsurcharges[]があるため、shipment側のみ採用
      // Delivery Area は370円のみ（740円にならない）
      expect(result.surcharges.deliveryArea?.amount).toBe(370)
      
      // 恒等式検証
      const sum = result.baseCharge.amount - result.discounts.amount
        + (result.surcharges.fuel?.amount || 0)
        + (result.surcharges.deliveryArea?.amount || 0)
        + (result.surcharges.other?.amount || 0)
      expect(Math.abs(sum - result.totalNetCharge.amount)).toBeLessThanOrEqual(1)
    })

    it('shipment側にsurcharges[]がない場合、package側を集計', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 11000, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 11000, currency: 'JPY' },
                surcharges: [], // 空配列
              },
            ],
            ratedPackages: [
              {
                packageRateDetail: {
                  surcharges: [
                    { surchargeType: 'DELIVERY_AREA', type: 'DELIVERY_AREA', amount: { amount: 370 } },
                    { surchargeType: 'FUEL', type: 'FUEL', amount: { amount: 630 } },
                  ],
                },
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      // package側を集計
      expect(result.surcharges.deliveryArea?.amount).toBe(370)
      expect(result.surcharges.fuel?.amount).toBe(630)
    })
  })

  describe('Import vs DeliveryArea の厳密分離', () => {
    it('IMPORT_PROCESSING と DELIVERY_AREA を互いに誤分類しない', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 10740, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 10740, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'IMPORT_PROCESSING', type: 'IMPORT_PROCESSING', amount: { amount: 370 } },
                  { surchargeType: 'DELIVERY_AREA', type: 'DELIVERY_AREA', amount: { amount: 370 } },
                ],
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      // 厳密に分離
      expect(result.surcharges.importProcessing?.amount).toBe(370)
      expect(result.surcharges.deliveryArea?.amount).toBe(370)
      
      // 誤分類されていない（両方とも370円で計上されている）
      expect(result.surcharges.importProcessing?.amount).not.toBe(740)
      expect(result.surcharges.deliveryArea?.amount).not.toBe(740)
    })

    it('IMPORT_CLEARANCE は importProcessing に分類される', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 10370, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 10370, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'IMPORT_CLEARANCE', type: 'IMPORT_CLEARANCE', amount: { amount: 370 } },
                ],
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      expect(result.surcharges.importProcessing?.amount).toBe(370)
      expect(result.surcharges.deliveryArea?.amount).toBeUndefined()
    })

    it('CUSTOMS_ENTRY は importProcessing に分類される', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 10370, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 10370, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'CUSTOMS_ENTRY', type: 'CUSTOMS_ENTRY', amount: { amount: 370 } },
                ],
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      expect(result.surcharges.importProcessing?.amount).toBe(370)
      expect(result.surcharges.deliveryArea?.amount).toBeUndefined()
    })
  })

  describe('Fuel / Peak の列挙キー抽出', () => {
    it('FUEL, FUEL_SURCHARGE, FSC が fuel に分類される', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 11000, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 11000, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'FUEL', amount: { amount: 500 } },
                  { surchargeType: 'FUEL_SURCHARGE', amount: { amount: 300 } },
                  { surchargeType: 'FSC', amount: { amount: 200 } },
                ],
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      // すべてfuelに分類され、合算される
      expect(result.surcharges.fuel?.amount).toBe(1000)
    })

    it('PEAK, PEAK_SEASON, DEMAND, SURGE が peak に分類される', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 11000, currency: 'JPY' },
            totalBaseCharge: { amount: 10000, currency: 'JPY' },
            totalDiscounts: { amount: 0, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 10000, currency: 'JPY' },
                totalNetCharge: { amount: 11000, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'PEAK', amount: { amount: 400 } },
                  { surchargeType: 'PEAK_SEASON', amount: { amount: 300 } },
                  { surchargeType: 'DEMAND', amount: { amount: 200 } },
                  { surchargeType: 'SURGE', amount: { amount: 100 } },
                ],
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      // すべてpeakに分類され、合算される
      expect(result.surcharges.peak?.amount).toBe(1000)
    })
  })

  describe('恒等式検証', () => {
    it('base - discounts + Σsurcharges == totalNet（±1円以内）', () => {
      const resp = {
        ratedShipmentDetails: [
          {
            totalNetCharge: { amount: 56665, currency: 'JPY' },
            totalBaseCharge: { amount: 169260, currency: 'JPY' },
            totalDiscounts: { amount: 136034, currency: 'JPY' },
            shipmentRateDetails: [
              {
                totalBaseCharge: { amount: 169260, currency: 'JPY' },
                totalDiscounts: { amount: 136034, currency: 'JPY' },
                totalNetCharge: { amount: 56665, currency: 'JPY' },
                surcharges: [
                  { surchargeType: 'FUEL', amount: { amount: 12991 } },
                  { surchargeType: 'PEAK', amount: { amount: 6318 } },
                  { surchargeType: 'DELIVERY_AREA', amount: { amount: 370 } },
                  { surchargeType: 'IMPORT_PROCESSING', amount: { amount: 370 } },
                ],
              },
            ],
            ratedPackages: [
              {
                packageRateDetail: {
                  surcharges: [
                    { surchargeType: 'ADDITIONAL_HANDLING_DIMENSION', amount: { amount: 3390 } },
                  ],
                },
              },
            ],
          },
        ],
      }

      const result = normalizeFedExRate(resp, 'JPY')

      const base = result.baseCharge.amount
      const discounts = result.discounts.amount
      const netFreight = base - discounts
      const surchargesSum =
        (result.surcharges.fuel?.amount || 0) +
        (result.surcharges.peak?.amount || 0) +
        (result.surcharges.deliveryArea?.amount || 0) +
        (result.surcharges.importProcessing?.amount || 0) +
        (result.specialHandling?.dimension?.amount || 0) +
        (result.surcharges.other?.amount || 0)

      const calculatedTotal = netFreight + surchargesSum
      const diff = Math.abs(calculatedTotal - result.totalNetCharge.amount)

      expect(diff).toBeLessThanOrEqual(1)
    })
  })

  describe('Delivery Area レベル判定', () => {
    it('deriveDeliveryAreaLevel が LEVEL A を検出', () => {
      expect(deriveDeliveryAreaLevel({ description: 'Delivery Area Level A' })).toBe('A')
      expect(deriveDeliveryAreaLevel({ code: 'LEV_A' })).toBe('A')
      expect(deriveDeliveryAreaLevel({ name: 'LEVEL A' })).toBe('A')
    })

    it('deriveDeliveryAreaLevel が LEVEL B を検出', () => {
      expect(deriveDeliveryAreaLevel({ description: 'Delivery Area Level B' })).toBe('B')
      expect(deriveDeliveryAreaLevel({ code: 'LEV_B' })).toBe('B')
      expect(deriveDeliveryAreaLevel({ name: 'LEVEL B' })).toBe('B')
    })

    it('deriveDeliveryAreaLevel がレベル情報がない場合は null を返す', () => {
      expect(deriveDeliveryAreaLevel({ description: 'Delivery Area' })).toBeNull()
      expect(deriveDeliveryAreaLevel({ code: 'DELIVERY_AREA' })).toBeNull()
    })
  })

  describe('classifySurcharge の列挙値ベース分類', () => {
    it('surchargeType を優先的に使用', () => {
      expect(classifySurcharge({ surchargeType: 'FUEL' })).toBe('FUEL')
      expect(classifySurcharge({ surchargeType: 'PEAK' })).toBe('PEAK')
      expect(classifySurcharge({ surchargeType: 'DELIVERY_AREA' })).toBe('DELIVERY_AREA')
      expect(classifySurcharge({ surchargeType: 'IMPORT_PROCESSING' })).toBe('IMPORT_PROCESSING')
    })

    it('surchargeType がない場合は type を使用', () => {
      expect(classifySurcharge({ type: 'FUEL' })).toBe('FUEL')
      expect(classifySurcharge({ type: 'PEAK' })).toBe('PEAK')
    })

    it('surchargeType と type がない場合は code を使用', () => {
      expect(classifySurcharge({ code: 'FUEL' })).toBe('FUEL')
      expect(classifySurcharge({ code: 'PEAK' })).toBe('PEAK')
    })

    it('該当なしの場合は null を返す', () => {
      expect(classifySurcharge({ surchargeType: 'UNKNOWN_TYPE' })).toBeNull()
      expect(classifySurcharge({})).toBeNull()
    })
  })
})


