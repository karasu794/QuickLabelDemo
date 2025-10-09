/*
  DB backend contracts for jobs. This assumes SUPABASE_* env is configured and JOBS_BACKEND=db
*/
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getJobsRepo } from '@/lib/jobs'
import { nowIso } from '@/lib/payments/types'

const repo = getJobsRepo()

describe('Stage4.1 jobs (db) contracts', () => {
  test('Idempotency upsert returns same job for same key', async () => {
    if (process.env.JOBS_BACKEND !== 'db') return
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Skipping DB contract: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
      return
    }
    const job = {
      id: crypto.randomUUID(),
      type: 'cancel_payment',
      status: 'queued',
      attempts: 0,
      nextRunAt: null,
      payload: { paymentId: 'p-db-1', expectedAction: 'void', idempotencyKey: 'idem-db-1' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as any
    const j1 = await repo.upsertByIdempotencyKey(job)
    const j2 = await repo.upsertByIdempotencyKey(job)
    expect(j1.id).toBe(j2.id)
  })

  test('pickAndLock picks one and sets running+locked', async () => {
    if (process.env.JOBS_BACKEND !== 'db') return
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Skipping DB contract: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
      return
    }
    const supabase = createServiceRoleClient()
    await supabase
      .from('jobs')
      .insert([{ type: 'cancel_payment', status: 'queued', attempts: 0, locked: false, payload: {} }])

    const picked = await repo.pickAndLock!('cancel_payment')
    expect(picked).not.toBeNull()
    if (picked) {
      expect(picked.status).toBe('running')
      expect((picked as any).locked).toBe(true)
    }
  })

  test('events append/list returns chronological sequence', async () => {
    if (process.env.JOBS_BACKEND !== 'db') return
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Skipping DB contract: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
      return
    }
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('jobs')
      .insert({ type: 'cancel_payment', status: 'queued', attempts: 0, locked: false, payload: {} })
      .select('*')
      .single()

    const jobId = (data as any).id as string
    await repo.appendEvent({ jobId, at: nowIso(), event: 'queued' })
    await repo.appendEvent({ jobId, at: nowIso(), event: 'running' })
    const events = await repo.listEvents(jobId)

    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0].event).toBe('queued')
    expect(events[1].event).toBe('running')
  })
})
