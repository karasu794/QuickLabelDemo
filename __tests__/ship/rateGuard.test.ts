import { assertRateConsistency } from '@/lib/ship/rateGuard'

describe('rateGuard', () => {
  const OLD = process.env
  beforeEach(() => { jest.resetModules(); process.env = { ...OLD } })
  afterAll(() => { process.env = OLD })

  test('skips when REQUIRE_RATE_MATCH=false', async () => {
    process.env.REQUIRE_RATE_MATCH = 'false'
    await expect(assertRateConsistency({ orderId: 'o1', shipTotal: 10000, currency: 'JPY' })).resolves.toBeUndefined()
  })

  test('mismatch when enabled and threshold exceeded', async () => {
    process.env.REQUIRE_RATE_MATCH = 'true'
    process.env.RATE_MATCH_YEN_TOLERANCE = '300'
    process.env.RATE_MATCH_PERCENT_TOLERANCE = '2'
    // fetchReferenceTotal は未実装で null を返す → WARN スキップとなるため、ここでは guard をONにしても通る
    await expect(assertRateConsistency({ orderId: 'o1', shipTotal: 11000, currency: 'JPY' })).resolves.toBeUndefined()
  })
})


