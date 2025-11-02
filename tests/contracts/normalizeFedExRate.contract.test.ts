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

describe('normalizeFedExRate audit points', () => {
  const originalEnv = { ...process.env }
  const originalConsole = console.debug
  const originalConsoleWarn = console.warn
  
  beforeEach(() => {
    // 関数の静的プロパティをリセット
    ;(normalizeFedExRate as any).__auditResponseOnce = false
    ;(normalizeFedExRate as any).__loggedOnce = false
    // 環境変数をリセット
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('DEBUG_RATE_')) {
        delete process.env[key as keyof typeof process.env]
      }
    })
  })
  
  afterEach(() => {
    Object.keys(originalEnv).forEach(key => {
      process.env[key as keyof typeof process.env] = originalEnv[key as keyof typeof originalEnv]
    })
    console.debug = originalConsole
    console.warn = originalConsoleWarn
  })

  test('audit point: after_response - logs raw response when DEBUG_RATE_AUDIT is enabled', () => {
    const mockDebug = jest.fn()
    console.debug = mockDebug
    process.env.DEBUG_RATE_AUDIT = 'true'
    
    const resp = {
      ratedShipmentDetails: [{
        totalNetCharge: { amount: 10000, currency: 'JPY' },
        serviceType: 'FEDEX_EXPRESS',
        serviceName: 'FedEx Express',
        rateType: 'ACCOUNT',
        shipmentRateDetails: [{ surcharges: [] }]
      }],
      currency: 'JPY'
    }
    
    normalizeFedExRate(resp)
    
    expect(mockDebug).toHaveBeenCalledWith(
      '[rate][audit][after_response]',
      expect.objectContaining({
        auditPoint: 'after_response',
        rawResponse: expect.objectContaining({
          hasRatedShipmentDetails: true,
          ratedShipmentDetailsCount: 1,
          totalNetCharge: { amount: 10000, currency: 'JPY' },
        }),
      })
    )
  })

  test('audit point: after_normalization - logs normalized data when DEBUG_RATE_RECONCILE is enabled', () => {
    const mockWarn = jest.fn()
    console.warn = mockWarn
    process.env.DEBUG_RATE_RECONCILE = 'true'
    
    const resp = {
      ratedShipmentDetails: [{
        totalNetCharge: { amount: 10500, currency: 'JPY' },
        shipmentRateDetails: [{
          totalBaseCharge: { amount: 10000 },
          totalDiscounts: { amount: 0 },
          surcharges: [{ type: 'FUEL', amount: { amount: 500 } }]
        }]
      }],
      currency: 'JPY'
    }
    
    normalizeFedExRate(resp)
    
    expect(mockWarn).toHaveBeenCalledWith(
      '[rate][audit][after_normalization]',
      expect.objectContaining({
        auditPoint: 'after_normalization',
        base: expect.any(Number),
        discounts: expect.any(Number),
        surchargesByCat: expect.objectContaining({
          fuel: expect.any(Number),
        }),
        totalNet: 10500,
      })
    )
  })

  test('audit points are disabled when env vars are not set', () => {
    const mockDebug = jest.fn()
    const mockWarn = jest.fn()
    console.debug = mockDebug
    console.warn = mockWarn
    delete process.env.DEBUG_RATE_AUDIT
    delete process.env.DEBUG_RATE_RECONCILE
    
    const resp = {
      ratedShipmentDetails: [{
        totalNetCharge: { amount: 10000, currency: 'JPY' },
        shipmentRateDetails: [{ surcharges: [] }]
      }]
    }
    
    normalizeFedExRate(resp)
    
    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][after_response]'),
      expect.anything()
    )
    expect(mockWarn).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][after_normalization]'),
      expect.anything()
    )
  })

  test('audit points are disabled when DEBUG_RATE_AUDIT is not set', () => {
    const mockDebug = jest.fn()
    const mockWarn = jest.fn()
    console.debug = mockDebug
    console.warn = mockWarn
    // 環境変数を設定しない（デフォルトは無効）
    delete process.env.DEBUG_RATE_AUDIT
    delete process.env.DEBUG_RATE_RECONCILE
    
    const resp = {
      ratedShipmentDetails: [{
        totalNetCharge: { amount: 10000, currency: 'JPY' },
        shipmentRateDetails: [{ surcharges: [] }]
      }]
    }
    
    normalizeFedExRate(resp)
    
    // 監査ログが呼ばれていないことを確認
    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][after_response]'),
      expect.anything()
    )
    expect(mockWarn).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][after_normalization]'),
      expect.anything()
    )
  })
})


