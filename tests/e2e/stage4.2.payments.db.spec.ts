import { test, expect } from '@playwright/test'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

const REQ_DB = process.env.PAYMENTS_BACKEND === 'db' && process.env.JOBS_BACKEND === 'db'
const HAS_SUPABASE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('Stage4.2 payments DB E2E', () => {
  test.beforeEach(() => {
    if (!REQ_DB || !HAS_SUPABASE) {
      test.skip(true, 'DB E2E is gated: set PAYMENTS_BACKEND=db, JOBS_BACKEND=db and Supabase secrets')
    }
  })

  test('authorized → cancel → voided (DB)', async () => {
    const sb = createServiceRoleClient()
    const pid = `p-e2e-auth-${Date.now()}`
    const amount = 100
    await sb.from('payments').insert({ id: pid, amount, currency: 'JPY', status: 'authorized' })

    const { POST: cancelPOST } = await import('@/app/api/payments/[paymentId]/cancel/route')
    const res = await (cancelPOST as any)(new Request('http://local', { method: 'POST' }), { params: { paymentId: pid } })
    expect(res.status).toBe(202)
    const body = await res.json()
    const jobId = String(body?.jobId || '')
    expect(jobId.length).toBeGreaterThan(0)

    const { POST: runOnce } = await import('@/app/api/dev/jobs/run-once/route')
    await (runOnce as any)(new Request('http://local', { method: 'POST' }))
    await (runOnce as any)(new Request('http://local', { method: 'POST' }))
    await (runOnce as any)(new Request('http://local', { method: 'POST' }))

    const { GET: getStatus } = await import('@/app/api/jobs/[jobId]/status/route')
    let ok = false, last: any = null
    for (let i = 0; i < 5; i++) {
      const r = await (getStatus as any)(new Request('http://local', { method: 'GET' }), { params: { jobId } })
      last = await r.json()
      if (last.status === 'succeeded') { ok = true; break }
      await new Promise(res => setTimeout(res, 1000))
    }
    if (!ok) console.error('Job not succeeded:', last)
    expect(ok).toBe(true)

    const { data, error } = await sb.from('payments').select('*').eq('id', pid).single()
    expect(error).toBeNull()
    expect(data?.status).toBe('voided')
  })

  test('captured → cancel → refunded (DB)', async () => {
    const sb = createServiceRoleClient()
    const pid = `p-e2e-cap-${Date.now()}`
    const amount = 200
    await sb.from('payments').insert({ id: pid, amount, currency: 'JPY', status: 'captured' })

    const { POST: cancelPOST } = await import('@/app/api/payments/[paymentId]/cancel/route')
    const res = await (cancelPOST as any)(new Request('http://local', { method: 'POST' }), { params: { paymentId: pid } })
    expect(res.status).toBe(202)
    const body = await res.json()
    const jobId = String(body?.jobId || '')
    expect(jobId.length).toBeGreaterThan(0)

    const { POST: runOnce } = await import('@/app/api/dev/jobs/run-once/route')
    await (runOnce as any)(new Request('http://local', { method: 'POST' }))
    await (runOnce as any)(new Request('http://local', { method: 'POST' }))

    const { GET: getStatus } = await import('@/app/api/jobs/[jobId]/status/route')
    let ok = false, last: any = null
    for (let i = 0; i < 5; i++) {
      const r = await (getStatus as any)(new Request('http://local', { method: 'GET' }), { params: { jobId } })
      last = await r.json()
      if (last.status === 'succeeded') { ok = true; break }
      await new Promise(res => setTimeout(res, 1000))
    }
    if (!ok) console.error('Job not succeeded:', last)
    expect(ok).toBe(true)

    const { data, error } = await sb.from('payments').select('*').eq('id', pid).single()
    expect(error).toBeNull()
    expect(data?.status).toBe('refunded')
    expect(data?.refunded_amount).toBe(amount)
  })
})


