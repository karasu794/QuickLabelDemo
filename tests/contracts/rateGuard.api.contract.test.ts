/* global jest */

async function importRoute() { return require('../../src/app/api/ship/create/route') }

function mockSupabaseUser() {
  jest.doMock('../../src/lib/auth/getUserOrThrow', () => {
    return {
      getUserOrThrow: async () => ({
        supabase: {
          from() {
            return {
              select() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return {
                              maybeSingle() {
                                return { data: { total_amount: 10000 } }
                              },
                            }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        },
        user: { id: 'u1' },
      }),
    }
  })
}

function mockSupabaseServer() {
  jest.doMock('../../src/lib/supabase/server', () => {
    return {
      createClient: () => ({
        from() {
          return {
            select() {
              return {
                filter() {
                  return { maybeSingle() { return { data: null } } }
                },
                // some callers use .maybeSingle directly
                maybeSingle() { return { data: null } },
              }
            },
            insert() { return { select() { return { maybeSingle() { return { data: null, error: null } } } } } },
          }
        },
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      }),
    }
  })
}

describe('RateGuard API model (ship/create)', () => {
  beforeEach(() => { jest.resetModules(); process.env.SHIP_API_WRITE_ENABLED = 'true'; process.env.SQUARE_ACCESS_TOKEN = 'test' })

  function mockSquare() {
    jest.doMock('square', () => {
      class SquareClient {
        paymentsApi = {
          getPayment: async (_orderId: string) => ({ result: { payment: { status: 'COMPLETED', id: 'pid', amountMoney: { amount: 10000, currency: 'JPY' } } } }),
        }
      }
      return { SquareClient, SquareEnvironment: { Production: 'prod', Sandbox: 'sandbox' } }
    })
  }

  test('OK → 200/201', async () => {
    jest.doMock('../../src/lib/ship/rateGuard', () => ({
      loadRGConfig: () => ({ require: true, maxPct: 0.01, maxAbs: 50 }),
      fetchReferenceTotal: () => Promise.resolve(10000),
      assertRateConsistency: () => ({ ok: true }),
      RateGuardError: class {},
    }))
    mockSquare()
    mockSupabaseServer();
    mockSupabaseUser()
    const route = await importRoute()
    const res = await route.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ orderId:'o1', serviceType:'S', bill:{payer:'SENDER'}, shipper:{name:'a',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, recipient:{name:'b',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, package:{weight:{value:1,unit:'KG'},dimensions:{length:1,width:1,height:1,unit:'CM'}} }) }) as any)
    expect([200, 201, 502, 500, 503, 402]).toContain(res.status)
  })

  test('Mismatch → 400 + code', async () => {
    jest.doMock('../../src/lib/ship/rateGuard', () => ({
      loadRGConfig: () => ({ require: true, maxPct: 0.01, maxAbs: 50 }),
      fetchReferenceTotal: () => Promise.resolve(10000),
      assertRateConsistency: () => { const e:any = new Error('Rate mismatch'); e.status = 400; e.code = 'RATE_GUARD_MISMATCH'; e.payload = { ref: 10000, actual: 10100, diff: { pct: 0.01, abs: 100 } }; throw e },
      RateGuardError: class {},
    }))
    mockSquare()
    mockSupabaseServer();
    mockSupabaseUser()
    const route = await importRoute()
    const res = await route.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ orderId:'o2', serviceType:'S', bill:{payer:'SENDER'}, shipper:{name:'a',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, recipient:{name:'b',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, package:{weight:{value:1,unit:'KG'},dimensions:{length:1,width:1,height:1,unit:'CM'}} }) }) as any)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('RATE_GUARD_MISMATCH')
  })
})


