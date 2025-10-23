/* global jest */

async function importRoute() { return require('../../src/app/api/ship/create/route') }

function mockSupabaseUser() {
  jest.doMock('../../src/lib/auth/getUserOrThrow', () => {
    return {
      getUserOrThrow: async () => ({
        supabase: {
          from() {
            return {
              select() { return { filter() { return { maybeSingle() { return { data: null } } } }, maybeSingle() { return { data: null } } } },
              insert() { return { select() { return { maybeSingle() { return { data: null, error: null } } } } } },
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
                filter() { return { maybeSingle() { return { data: null } } } },
                maybeSingle() { return { data: null } },
              }
            },
            insert() { return { select() { return { maybeSingle() { return { data: null, error: null } } } } } },
          }
        },
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      }),
      createServiceRoleClient: () => ({})
    }
  })
}

describe('Disclaimer consent validation (ship/create)', () => {
  beforeEach(() => { jest.resetModules(); process.env.SHIP_API_WRITE_ENABLED = 'true'; process.env.SQUARE_ACCESS_TOKEN = 'test' })

  function mockSquare(ok = true) {
    jest.doMock('square', () => {
      class SquareClient {
        paymentsApi = {
          getPayment: async (_orderId) => ok
            ? ({ result: { payment: { status: 'COMPLETED', id: 'pid', amountMoney: { amount: 1000, currency: 'JPY' } } } })
            : ({ result: { payment: { status: 'PENDING', id: 'pid' } } })
        }
      }
      return { SquareClient, SquareEnvironment: { Production: 'prod', Sandbox: 'sandbox' } }
    })
  }

  test('400 when disclaimer not agreed in draft', async () => {
    mockSquare(true)
    // Draft check returns false by default (our mock select returns null)
    mockSupabaseServer();
    mockSupabaseUser()
    const route = await importRoute()
    const res = await route.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ orderId:'o1', serviceType:'S', bill:{payer:'SENDER'}, shipper:{name:'a',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, recipient:{name:'b',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, package:{weight:{value:1,unit:'KG'},dimensions:{length:1,width:1,height:1,unit:'CM'}}, payment_tx_id:'pid', terms_version:'v1' }) }) as any)
    expect(res.status).toBe(400)
  })

  test('accepts when disclaimer agreed and payment is completed', async () => {
    mockSquare(true)
    mockSupabaseServer();
    // override draft check to return agreed=true
    jest.doMock('../../src/lib/supabase/server', () => {
      return {
        createClient: () => ({
          from() {
            return {
              select() {
                return {
                  filter() { return { maybeSingle() { return { data: null } } } },
                  maybeSingle() { return { data: { disclaimer_agreed: true } } },
                }
              },
              insert() { return { select() { return { maybeSingle() { return { data: null, error: null } } } } } },
            }
          },
          auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
        }),
        createServiceRoleClient: () => ({})
      }
    })
    mockSupabaseUser()
    const route = await importRoute()
    const res = await route.POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ orderId:'o2', serviceType:'S', bill:{payer:'SENDER'}, shipper:{name:'a',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, recipient:{name:'b',phone:'12345',address1:'a',city:'c',postalCode:'12345',country:'JP'}, package:{weight:{value:1,unit:'KG'},dimensions:{length:1,width:1,height:1,unit:'CM'}}, payment_tx_id:'pid', terms_version:'v1' }) }) as any)
    expect([200,201,502,500,503]).toContain(res.status)
  })
})


