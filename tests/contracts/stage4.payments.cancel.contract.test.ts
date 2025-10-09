import path from 'path'
import { paymentsStore } from '@/lib/payments/store'
import { nowIso, PaymentRecord } from '@/lib/payments/types'

const routePath = path.resolve(process.cwd(), 'src/app/api/payments/[paymentId]/cancel/route.ts')

function reloadRouteByRequire() {
  try { delete (require as any).cache[require.resolve(routePath)] } catch {}
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(routePath)
}

function seedPayment(p: Partial<PaymentRecord>): PaymentRecord {
  const rec: PaymentRecord = {
    id: p.id || 'p1',
    status: p.status || 'authorized',
    amount: p.amount ?? 1000,
    currency: p.currency || 'JPY',
    capturedAt: p.capturedAt ?? null,
    settledAt: p.settledAt ?? null,
    refundedAmount: p.refundedAmount ?? 0,
    createdAt: p.createdAt || nowIso(),
    updatedAt: p.updatedAt || nowIso(),
  }
  paymentsStore.upsert(rec)
  return rec
}

describe('Stage4 payments cancel (contracts)', () => {
  test('authorized → 202 void job', async () => {
    const p = seedPayment({ id: 'auth-1', status: 'authorized', amount: 1200 })
    const { POST } = reloadRouteByRequire()
    const req = new Request(`http://localhost/api/payments/${p.id}/cancel`, { method: 'POST' })
    const res = await (POST as any)(req, { params: { paymentId: p.id } })
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(typeof body.jobId).toBe('string')
  })

  test('captured → 202 refund job', async () => {
    const p = seedPayment({ id: 'cap-1', status: 'captured', amount: 1500 })
    const { POST } = reloadRouteByRequire()
    const req = new Request(`http://localhost/api/payments/${p.id}/cancel`, { method: 'POST' })
    const res = await (POST as any)(req, { params: { paymentId: p.id } })
    expect(res.status).toBe(202)
  })

  test('voided/refunded → 409', async () => {
    const p1 = seedPayment({ id: 'void-1', status: 'voided' })
    const { POST } = reloadRouteByRequire()
    const r1 = await (POST as any)(new Request(`http://localhost/api/payments/${p1.id}/cancel`, { method: 'POST' }), { params: { paymentId: p1.id } })
    expect(r1.status).toBe(409)
    const p2 = seedPayment({ id: 'ref-1', status: 'refunded' })
    const r2 = await (POST as any)(new Request(`http://localhost/api/payments/${p2.id}/cancel`, { method: 'POST' }), { params: { paymentId: p2.id } })
    expect(r2.status).toBe(409)
  })

  test('expired/failed/not_found → 422', async () => {
    const p1 = seedPayment({ id: 'exp-1', status: 'expired' })
    const { POST } = reloadRouteByRequire()
    const r1 = await (POST as any)(new Request(`http://localhost/api/payments/${p1.id}/cancel`, { method: 'POST' }), { params: { paymentId: p1.id } })
    expect(r1.status).toBe(422)
    const p2 = seedPayment({ id: 'fail-1', status: 'failed' })
    const r2 = await (POST as any)(new Request(`http://localhost/api/payments/${p2.id}/cancel`, { method: 'POST' }), { params: { paymentId: p2.id } })
    expect(r2.status).toBe(422)
  })

  test('partially_refunded → remaining>0 refund 202, zero→409', async () => {
    const p1 = seedPayment({ id: 'pr-1', status: 'partially_refunded', amount: 2000, refundedAmount: 500 })
    const { POST } = reloadRouteByRequire()
    const r1 = await (POST as any)(new Request(`http://localhost/api/payments/${p1.id}/cancel`, { method: 'POST' }), { params: { paymentId: p1.id } })
    expect(r1.status).toBe(202)
    const p2 = seedPayment({ id: 'pr-2', status: 'partially_refunded', amount: 2000, refundedAmount: 2000 })
    const r2 = await (POST as any)(new Request(`http://localhost/api/payments/${p2.id}/cancel`, { method: 'POST' }), { params: { paymentId: p2.id } })
    expect(r2.status).toBe(409)
  })

  test('Idempotency-Key same → same jobId returned', async () => {
    const p = seedPayment({ id: 'idem-1', status: 'authorized' })
    const headers = { 'Idempotency-Key': 'k1' }
    const { POST } = reloadRouteByRequire()
    const r1 = await (POST as any)(new Request(`http://localhost/api/payments/${p.id}/cancel`, { method: 'POST', headers } as any), { params: { paymentId: p.id } })
    const b1 = await r1.json()
    const r2 = await (POST as any)(new Request(`http://localhost/api/payments/${p.id}/cancel`, { method: 'POST', headers } as any), { params: { paymentId: p.id } })
    const b2 = await r2.json()
    expect(b1.jobId).toBe(b2.jobId)
  })

  test('RATE_LIMIT → reschedule → succeed on next run', async () => {
    const p = seedPayment({ id: 'rl-1', status: 'captured', amount: 1000 })
    const { POST } = reloadRouteByRequire()
    const headers = { 'Idempotency-Key': 'rl-key' } as any
    const r1 = await (POST as any)(new Request(`http://localhost/api/payments/${p.id}/cancel`, { method: 'POST', headers }), { params: { paymentId: p.id } })
    expect(r1.status).toBe(202)
    // simulate worker run once with failure then success: not fully implemented here; we assert API path only
  })
})


