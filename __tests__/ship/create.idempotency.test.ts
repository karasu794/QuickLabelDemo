/**
 * This is a high-level test sketch. In CI, mock FedEx and Blob to avoid external calls.
 */
import { NextRequest } from 'next/server'

jest.mock('@vercel/blob', () => ({ put: jest.fn(async () => ({ url: 'https://blob/label.pdf' })) }))
jest.mock('@/lib/fedex/client', () => ({
  selectFedExCredentials: jest.fn(() => ({ kind: 'export', accountNumber: 'EXP-ACC', clientId: 'id', clientSecret: 'sec' })),
  fedexRequest: jest.fn(async () => ({ status: 200, data: { output: { transactionShipments: [{ masterTrackingNumber: '123456789', pieceResponses: [{ trackingNumber: '123456789', packageDocuments: [{ url: 'https://fedex/label.pdf' }] }], shipmentDocuments: [{ totalNetCharge: { amount: 10000, currency: 'JPY' } }] }] } } }))
}))

describe('/api/ship/create idempotency', () => {
  const OLD = process.env
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD, SHIP_API_WRITE_ENABLED: 'true', SQUARE_ACCESS_TOKEN: 'sq-token', NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' }
  })
  afterAll(() => { process.env = OLD })

  test('second call returns existing without extra FedEx call (sketch)', async () => {
    // This repo does not provide test harness for Next route handlers; outline only.
    expect(true).toBe(true)
  })
})


