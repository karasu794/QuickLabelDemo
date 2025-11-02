import { getFedExRates, type RateRequestInfo } from '@/lib/fedex/auth'

// 依存関係をモック化
jest.mock('@/lib/fedex/auth', () => {
  const originalModule = jest.requireActual('@/lib/fedex/auth')
  const mockFedexApiRequest = jest.fn().mockResolvedValue({
    output: {
      rateReplyDetails: [
        {
          serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
          ratedShipmentDetails: [{
            totalNetCharge: { amount: '10000', currency: 'JPY' },
          }],
          operationalDetail: {
            deliveryDate: '2024-01-15',
            deliveryDayOfWeek: 'MONDAY',
            transitTime: '3',
          },
        },
      ],
    },
  })

  return {
    ...originalModule,
    getFedExAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    getFedExCredentialsByOrigin: jest.fn().mockReturnValue({
      apiKey: 'mock-api-key',
      secretKey: 'mock-secret-key',
      accountNumber: '1234567890',
    }),
    fedexApiRequest: mockFedexApiRequest,
  }
})

describe('getFedExRates audit points', () => {
  const originalEnv = { ...process.env }
  const originalConsole = console.debug

  beforeEach(() => {
    // 関数の静的プロパティをリセット
    ;(getFedExRates as any).__auditRequestOnce = false
    ;(getFedExRates as any).__auditLogged = false
    // 環境変数をリセット
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('DEBUG_RATE_')) {
        delete process.env[key as keyof typeof process.env]
      }
    })
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    Object.keys(originalEnv).forEach(key => {
      process.env[key as keyof typeof process.env] = originalEnv[key as keyof typeof originalEnv]
    })
    console.debug = originalConsole
  })

  const mockRateInfo: RateRequestInfo = {
    shipperCountryCode: 'JP',
    shipperPostalCode: '100-0001',
    shipperStateCode: undefined,
    shipperCityName: 'Tokyo',
    recipientCountryCode: 'US',
    recipientPostalCode: '10001',
    recipientStateCode: 'NY',
    recipientCityName: 'New York',
    shipDate: '2024-01-10',
    isResidential: true,
    packages: [
      {
        weight: 1.5,
        dimensions: { length: 10, width: 20, height: 30 },
        declaredValue: 5000,
      },
    ],
  }

  test('audit point: before_request - logs request info when DEBUG_RATE_AUDIT is enabled', async () => {
    const mockDebug = jest.fn()
    console.debug = mockDebug
    process.env.DEBUG_RATE_AUDIT = 'true'
    process.env.NODE_ENV = 'test'

    await getFedExRates(mockRateInfo)

    expect(mockDebug).toHaveBeenCalledWith(
      '[rate][audit][before_request]',
      expect.objectContaining({
        auditPoint: 'before_request',
        requestInfo: expect.objectContaining({
          shipper: expect.objectContaining({
            countryCode: 'JP',
            postalCode: '100-0001',
            cityName: 'Tokyo',
          }),
          recipient: expect.objectContaining({
            countryCode: 'US',
            postalCode: '10001',
            stateCode: 'NY',
            cityName: 'New York',
            isResidential: true,
          }),
          shipDate: '2024-01-10',
          packageCount: 1,
          packages: expect.arrayContaining([
            expect.objectContaining({
              sequenceNumber: 1,
              weight: 1.5,
              hasDimensions: true,
              declaredValue: 5000,
            }),
          ]),
        }),
      })
    )
  })

  test('audit point: before_request - logs only once even with multiple calls', async () => {
    const mockDebug = jest.fn()
    console.debug = mockDebug
    process.env.DEBUG_RATE_AUDIT = 'true'
    process.env.NODE_ENV = 'test'

    await getFedExRates(mockRateInfo)
    await getFedExRates(mockRateInfo)

    const beforeRequestCalls = mockDebug.mock.calls.filter(
      call => call[0] === '[rate][audit][before_request]'
    )
    expect(beforeRequestCalls.length).toBe(1)
  })

  test('audit point: before_request - disabled when DEBUG_RATE_AUDIT is not set', async () => {
    const mockDebug = jest.fn()
    console.debug = mockDebug
    delete process.env.DEBUG_RATE_AUDIT
    process.env.NODE_ENV = 'test'

    await getFedExRates(mockRateInfo)

    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][before_request]'),
      expect.anything()
    )
  })

  test('audit point: before_request - disabled in production', async () => {
    const mockDebug = jest.fn()
    console.debug = mockDebug
    process.env.DEBUG_RATE_AUDIT = 'true'
    process.env.NODE_ENV = 'production'

    await getFedExRates(mockRateInfo)

    expect(mockDebug).not.toHaveBeenCalledWith(
      expect.stringContaining('[rate][audit][before_request]'),
      expect.anything()
    )
  })
})

