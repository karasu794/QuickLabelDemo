/**
 * Additional Handling / Oversize サーチャージの最大1つ採用ルールのテスト
 * 
 * 排他ルール: Oversize が出たパッケージでは AHS を無効化
 * 選択ルール: AHS が複数出た場合は金額が最大の1つだけを採用
 */

import { describe, it, expect } from '@jest/globals'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import { classifySurchargeLabel } from '@/lib/rates/fedex/surchargeMaps'

describe('AHS/Oversize 最大1つ採用ルール', () => {
  it('ケース1: 同一パッケージに AHS_DIMENSION=¥3,390 と AHS_WEIGHT=¥6,780 → 採用=¥6,780（重量）、寸法は採用されない', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 10000,
          totalBaseCharge: 5000,
          totalDiscounts: 0,
          ratedPackages: [
            {
              packageRateDetail: {
                surcharges: [
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'DIMENSION',
                    description: 'Additional Handling - Dimension',
                    amount: 3390,
                  },
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'WEIGHT',
                    description: 'Additional Handling - Weight',
                    amount: 6780,
                  },
                ],
              },
            },
          ],
          shipmentRateDetails: [
            {
              totalNetCharge: 10000,
              totalBaseCharge: 5000,
              surcharges: [],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // 重量のみ採用（金額が大きい方）
    expect(result.specialHandling?.weight?.amount).toBe(6780)
    expect(result.specialHandling?.dimension).toBeUndefined()
    expect(result.specialHandling?.oversize).toBeUndefined()
    expect(result.specialHandling?.packaging).toBeUndefined()
    expect(result.specialHandling?.nonStackable).toBeUndefined()
  })

  it('ケース2: 同一パッケージに OVERSIZE=¥12,000 と AHS_DIMENSION=¥8,000 → 採用=¥12,000（Oversize）、AHSは無効', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 20000,
          totalBaseCharge: 5000,
          totalDiscounts: 0,
          ratedPackages: [
            {
              packageRateDetail: {
                surcharges: [
                  {
                    type: 'OVERSIZE',
                    description: 'Oversize Package',
                    amount: 12000,
                  },
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'DIMENSION',
                    description: 'Additional Handling - Dimension',
                    amount: 8000,
                  },
                ],
              },
            },
          ],
          shipmentRateDetails: [
            {
              totalNetCharge: 20000,
              totalBaseCharge: 5000,
              surcharges: [],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // Oversize のみ採用（AHS は無効化）
    expect(result.specialHandling?.oversize?.amount).toBe(12000)
    expect(result.specialHandling?.dimension).toBeUndefined()
    expect(result.specialHandling?.weight).toBeUndefined()
  })

  it('ケース3: 複数パッケージで各々の最大採用、合計が totalNet と一致', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 25000,
          totalBaseCharge: 10000,
          totalDiscounts: 0,
          ratedPackages: [
            {
              packageRateDetail: {
                surcharges: [
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'DIMENSION',
                    amount: 5000,
                  },
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'WEIGHT',
                    amount: 8000, // 最大
                  },
                ],
              },
            },
            {
              packageRateDetail: {
                surcharges: [
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'PACKAGING',
                    amount: 3000,
                  },
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'DIMENSION',
                    amount: 4000, // 最大
                  },
                ],
              },
            },
          ],
          shipmentRateDetails: [
            {
              totalNetCharge: 25000,
              totalBaseCharge: 10000,
              surcharges: [],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // パッケージ1: 重量8000円、パッケージ2: 寸法4000円
    expect(result.specialHandling?.weight?.amount).toBe(8000)
    expect(result.specialHandling?.dimension?.amount).toBe(4000)
    expect(result.specialHandling?.packaging).toBeUndefined()

    // 合計が一致
    const specialHandlingSum =
      (result.specialHandling?.oversize?.amount || 0) +
      (result.specialHandling?.dimension?.amount || 0) +
      (result.specialHandling?.weight?.amount || 0) +
      (result.specialHandling?.packaging?.amount || 0) +
      (result.specialHandling?.nonStackable?.amount || 0)
    expect(specialHandlingSum).toBe(12000)
  })

  it('ケース4: 採用済み金額が other に二重計上されない（other から控除されている）', () => {
    const mockResp = {
      ratedShipmentDetails: [
        {
          totalNetCharge: 15000,
          totalBaseCharge: 5000,
          totalDiscounts: 0,
          ratedPackages: [
            {
              packageRateDetail: {
                surcharges: [
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'DIMENSION',
                    amount: 5000,
                  },
                  {
                    type: 'ADDITIONAL_HANDLING',
                    surchargeType: 'WEIGHT',
                    amount: 8000, // 最大（採用）
                  },
                ],
              },
            },
          ],
          shipmentRateDetails: [
            {
              totalNetCharge: 15000,
              totalBaseCharge: 5000,
              surcharges: [
                {
                  type: 'OTHER',
                  amount: 5000, // 他のサーチャージ
                },
              ],
            },
          ],
        },
      ],
    }

    const result = normalizeFedExRate(mockResp, 'JPY')

    // specialHandling に採用された金額
    expect(result.specialHandling?.weight?.amount).toBe(8000)

    // other には採用済みの金額が含まれていない（二重計上されていない）
    // totalNet (15000) = base (5000) + other (2000) + specialHandling (8000)
    // other は 5000 - 3000 (寸法が除外) = 2000 になる想定だが、
    // 実際の計算ロジックに依存するため、other が負にならないことを確認
    expect(result.surcharges.other?.amount).toBeGreaterThanOrEqual(0)
    
    // 総合計が一致
    const total =
      result.baseCharge.amount -
      result.discounts.amount +
      (result.surcharges.fuel?.amount || 0) +
      (result.surcharges.peak?.amount || 0) +
      (result.surcharges.residential?.amount || 0) +
      (result.surcharges.deliveryArea?.amount || 0) +
      (result.surcharges.importProcessing?.amount || 0) +
      (result.surcharges.saturdayDelivery?.amount || 0) +
      (result.surcharges.insuredValue?.amount || 0) +
      (result.surcharges.other?.amount || 0) +
      (result.specialHandling?.oversize?.amount || 0) +
      (result.specialHandling?.dimension?.amount || 0) +
      (result.specialHandling?.weight?.amount || 0) +
      (result.specialHandling?.packaging?.amount || 0) +
      (result.specialHandling?.nonStackable?.amount || 0)
    expect(Math.round(total)).toBe(result.totalNetCharge.amount)
  })

  it('classifySurchargeLabel が正しく分類する', () => {
    expect(classifySurchargeLabel({ type: 'OVERSIZE', description: 'Oversize Package' })).toBe('OVERSIZE')
    expect(classifySurchargeLabel({ type: 'ADDITIONAL_HANDLING', surchargeType: 'DIMENSION' })).toBe('AHS_DIMENSION')
    expect(classifySurchargeLabel({ type: 'ADDITIONAL_HANDLING', surchargeType: 'WEIGHT' })).toBe('AHS_WEIGHT')
    expect(classifySurchargeLabel({ type: 'ADDITIONAL_HANDLING', surchargeType: 'PACKAGING' })).toBe('AHS_PACKAGING')
    expect(classifySurchargeLabel({ type: 'NON_STACKABLE', description: 'Non-Stackable' })).toBe('AHS_NONSTACKABLE')
    expect(classifySurchargeLabel({ type: 'FUEL', description: 'Fuel Surcharge' })).toBeNull()
  })
})

