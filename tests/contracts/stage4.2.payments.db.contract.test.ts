import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { getJobsRepo } from '@/lib/jobs'
import { getPaymentsRepo } from '@/lib/payments'

const REQ_DB = process.env.PAYMENTS_BACKEND === 'db' && process.env.JOBS_BACKEND === 'db'

describe('Stage4.2 payments DB contracts', () => {
  test('authorized → cancel → voided in DB', async () => {
    if (!REQ_DB) return
    const sb = createServiceRoleClient()
    const pid = 'p-db-auth-1'
    await sb.from('payments').insert({ id: pid, amount: 100, currency: 'JPY', status: 'authorized' }).select('*')
    const { POST } = require('@/app/api/payments/[paymentId]/cancel/route')
    const res = await (POST as any)(new Request('http://x', { method: 'POST' }), { params: { paymentId: pid } })
    expect(res.status).toBe(202)
    const { POST: RUN } = require('@/app/api/dev/jobs/run-once/route')
    await (RUN as any)(new Request('http://x', { method: 'POST' }))
    const p2 = await getPaymentsRepo().get(pid)
    expect(p2?.status).toBe('voided')
  })

  test('captured → cancel → refunded in DB', async () => {
    if (!REQ_DB) return
    const sb = createServiceRoleClient()
    const pid = 'p-db-cap-1'
    await sb.from('payments').insert({ id: pid, amount: 200, currency: 'JPY', status: 'captured' }).select('*')
    const { POST } = require('@/app/api/payments/[paymentId]/cancel/route')
    const res = await (POST as any)(new Request('http://x', { method: 'POST' }), { params: { paymentId: pid } })
    expect(res.status).toBe(202)
    const { POST: RUN } = require('@/app/api/dev/jobs/run-once/route')
    await (RUN as any)(new Request('http://x', { method: 'POST' }))
    const p2 = await getPaymentsRepo().get(pid)
    expect(p2?.status).toBe('refunded')
    expect(p2?.refundedAmount).toBe(200)
  })
})


