import { computeCharges, estimateFreightFromTotal } from '@/lib/charges/core'

describe('charges-core', () => {
  test('subtotal非課税・手数料課税で合計が整合する', () => {
    const out = computeCharges({
      freightJPY: 10000,
      isPhoenix: true,
      serviceFeeRate: 0.025,
      processingFeeRate: 0.0325,
      taxRate: 0.1,
      residentialJPY: 300,
      insuredValueJPY: 0,
    })
    expect(out.subtotal).toBe(10000)
    // service=250, phoenixで2.5%はそのまま（仕様: Phoenixで有効）、processing=325、resi=300 → taxable=875, tax=87
    expect(out.fees.serviceFee).toBe(250)
    expect(out.fees.processingFee).toBe(325)
    expect(out.tax).toBe(87)
    expect(out.total).toBe(10000 + 250 + 325 + 300 + 87)
  })

  test('estimateFreightFromTotal で近似的に元の運賃を復元できる', () => {
    const freight = 20000
    const serviceRate = 0.025
    const processingRate = 0.0325
    const taxRate = 0.1
    const total = freight + Math.floor(freight * (serviceRate + processingRate)) + Math.floor((Math.floor(freight * (serviceRate + processingRate))) * taxRate)
    const est = estimateFreightFromTotal(total, { serviceFeeRate: serviceRate, processingFeeRate: processingRate, taxRate, isPhoenix: true })
    expect(est).toBeLessThanOrEqual(freight)
    expect(est).toBeGreaterThanOrEqual(freight - 200) // 許容誤差
  })
})


