/**
 * FedEx fee detail keyマッピング方式のテスト
 */

import { describe, it, expect } from '@jest/globals'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import { classifySurchargeByFeeDetailKey } from '@/lib/rates/fedex/feeDetailKeys'

describe('Fee detail keyマッピング方式', () => {
  it('ケース1: dimension surcharge が複数 → maxだけ採用', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 12000,
          totalBaseCharge: 8000,
          totalDiscounts: 0,
          shipmentRateDetails: [
            {
              totalNetCharge: 12000,
              totalBaseCharge: 8000,
              surcharges: [
                {
                  surchargeType: 'ADDITIONAL_HANDLING_DIMENSION',
                  amount: 3000,
                },
                {
                  surchargeType: 'ADDITIONAL_HANDLING_DIMENSION',
                  amount: 5000, // 最大値
                },
                {
                  surchargeType: 'ADDITIONAL_HANDLING_DIMENSION',
                  amount: 2000,
                },
              ],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // 最大値のみ採用（shipment単位）
    // 注意: パッケージ単位処理がない場合、shipment単位の最大値が採用される
    expect(result.specialHandling?.dimension?.amount).toBe(5000)
    
    // 合計検証
    const sum = result.baseCharge.amount - result.discounts.amount
      + (result.surcharges.fuel?.amount || 0)
      + (result.surcharges.peak?.amount || 0)
      + (result.surcharges.residential?.amount || 0)
      + (result.surcharges.deliveryArea?.amount || 0)
      + (result.surcharges.importProcessing?.amount || 0)
      + (result.surcharges.saturdayDelivery?.amount || 0)
      + (result.surcharges.insuredValue?.amount || 0)
      + (result.specialHandling?.oversize?.amount || 0)
      + (result.specialHandling?.dimension?.amount || 0)
      + (result.specialHandling?.weight?.amount || 0)
      + (result.specialHandling?.packaging?.amount || 0)
      + (result.specialHandling?.nonStackable?.amount || 0)
      + (result.surcharges.other?.amount || 0)
    expect(Math.abs(sum - result.totalNetCharge.amount)).toBeLessThanOrEqual(1)
  })

  it('ケース2: importProcessing と deliveryArea 区別', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 15000,
          totalBaseCharge: 10000,
          totalDiscounts: 0,
          shipmentRateDetails: [
            {
              totalNetCharge: 15000,
              totalBaseCharge: 10000,
              surcharges: [
                {
                  surchargeType: 'IMPORT_PROCESSING',
                  amount: 3000,
                },
                {
                  surchargeType: 'DELIVERY_AREA',
                  amount: 2000,
                },
              ],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // importProcessing と deliveryArea が正しく分離されている
    expect(result.surcharges.importProcessing?.amount).toBe(3000)
    expect(result.surcharges.deliveryArea?.amount).toBe(2000)
    
    // 合計検証
    const sum = result.baseCharge.amount - result.discounts.amount
      + (result.surcharges.fuel?.amount || 0)
      + (result.surcharges.peak?.amount || 0)
      + (result.surcharges.residential?.amount || 0)
      + (result.surcharges.deliveryArea?.amount || 0)
      + (result.surcharges.importProcessing?.amount || 0)
      + (result.surcharges.saturdayDelivery?.amount || 0)
      + (result.surcharges.insuredValue?.amount || 0)
      + (result.specialHandling?.oversize?.amount || 0)
      + (result.specialHandling?.dimension?.amount || 0)
      + (result.specialHandling?.weight?.amount || 0)
      + (result.specialHandling?.packaging?.amount || 0)
      + (result.specialHandling?.nonStackable?.amount || 0)
      + (result.surcharges.other?.amount || 0)
    expect(Math.abs(sum - result.totalNetCharge.amount)).toBeLessThanOrEqual(1)
  })

  it('ケース3: peak / fuel が正しく抽出', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 18000,
          totalBaseCharge: 10000,
          totalDiscounts: 0,
          shipmentRateDetails: [
            {
              totalNetCharge: 18000,
              totalBaseCharge: 10000,
              surcharges: [
                {
                  surchargeType: 'FUEL',
                  amount: 5000,
                },
                {
                  surchargeType: 'PEAK',
                  amount: 3000,
                },
              ],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    expect(result.surcharges.fuel?.amount).toBe(5000)
    expect(result.surcharges.peak?.amount).toBe(3000)
    
    // 合計検証
    const sum = result.baseCharge.amount - result.discounts.amount
      + (result.surcharges.fuel?.amount || 0)
      + (result.surcharges.peak?.amount || 0)
      + (result.surcharges.residential?.amount || 0)
      + (result.surcharges.deliveryArea?.amount || 0)
      + (result.surcharges.importProcessing?.amount || 0)
      + (result.surcharges.saturdayDelivery?.amount || 0)
      + (result.surcharges.insuredValue?.amount || 0)
      + (result.specialHandling?.oversize?.amount || 0)
      + (result.specialHandling?.dimension?.amount || 0)
      + (result.specialHandling?.weight?.amount || 0)
      + (result.specialHandling?.packaging?.amount || 0)
      + (result.specialHandling?.nonStackable?.amount || 0)
      + (result.surcharges.other?.amount || 0)
    expect(Math.abs(sum - result.totalNetCharge.amount)).toBeLessThanOrEqual(1)
  })

  it('ケース4: total = sum(base - disc + surcharges)', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 20000,
          totalBaseCharge: 15000,
          totalDiscounts: 2000,
          shipmentRateDetails: [
            {
              totalNetCharge: 20000,
              totalBaseCharge: 15000,
              totalDiscounts: 2000,
              discounts: [{ amount: { amount: 2000 } }],
              surcharges: [
                { surchargeType: 'FUEL', amount: { amount: 3000 } },
                { surchargeType: 'PEAK', amount: { amount: 2000 } },
                { surchargeType: 'DELIVERY_AREA', amount: { amount: 1000 } },
                { surchargeType: 'IMPORT_PROCESSING', amount: { amount: 1000 } },
              ],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // FedEx API仕様: totalNetCharge = netFreight + totalSurcharges
    // netFreight = baseCharge - discounts = 15000 - 2000 = 13000
    // totalSurcharges = 3000 + 2000 + 1000 + 1000 = 7000
    // totalNetCharge = 13000 + 7000 = 20000
    expect(result.baseCharge.amount).toBe(15000)
    expect(result.discounts.amount).toBe(2000)
    
    const netFreight = result.baseCharge.amount - result.discounts.amount
    const totalSurcharges = 
      (result.surcharges.fuel?.amount || 0) +
      (result.surcharges.peak?.amount || 0) +
      (result.surcharges.residential?.amount || 0) +
      (result.surcharges.deliveryArea?.amount || 0) +
      (result.surcharges.importProcessing?.amount || 0) +
      (result.surcharges.saturdayDelivery?.amount || 0) +
      (result.surcharges.insuredValue?.amount || 0) +
      (result.specialHandling?.oversize?.amount || 0) +
      (result.specialHandling?.dimension?.amount || 0) +
      (result.specialHandling?.weight?.amount || 0) +
      (result.specialHandling?.packaging?.amount || 0) +
      (result.specialHandling?.nonStackable?.amount || 0) +
      (result.surcharges.other?.amount || 0)
    
    const calculatedTotal = netFreight + totalSurcharges
    expect(Math.abs(calculatedTotal - result.totalNetCharge.amount)).toBeLessThanOrEqual(1)
  })

  it('classifySurchargeByFeeDetailKey が正しく分類する', () => {
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'FUEL' })).toBe('FUEL')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'PEAK' })).toBe('PEAK')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'RESIDENTIAL' })).toBe('RESIDENTIAL')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'DELIVERY_AREA' })).toBe('DELIVERY_AREA')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'IMPORT_PROCESSING' })).toBe('IMPORT_PROCESSING')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'SATURDAY_DELIVERY' })).toBe('SATURDAY_DELIVERY')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'DECLARED_VALUE' })).toBe('INSURED_VALUE')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'OVERSIZE' })).toBe('OVERSIZE')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'ADDITIONAL_HANDLING_DIMENSION' })).toBe('AHS_DIMENSION')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'ADDITIONAL_HANDLING_WEIGHT' })).toBe('AHS_WEIGHT')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'ADDITIONAL_HANDLING_PACKAGING' })).toBe('AHS_PACKAGING')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'NON_STACKABLE' })).toBe('AHS_NONSTACKABLE')
    expect(classifySurchargeByFeeDetailKey({ surchargeType: 'UNKNOWN_TYPE' })).toBeNull()
  })
})

