import { createServiceRoleClient } from '@/lib/supabase/server'
import { JobEventRecord, JobRecord, JobStatus } from '@/lib/payments/types'
import type { Database } from '@/types/supabase'

type JobsRow = Database['public']['Tables']['jobs']['Row']
type JobsInsert = Database['public']['Tables']['jobs']['Insert']

function toJobsInsert(job: JobRecord): JobsInsert {
  return {
    id: job.id,
    type: job.type,
    status: job.status as JobsRow['status'],
    attempts: job.attempts,
    locked: job.locked ?? false,
    next_run_at: job.nextRunAt ?? null,
    status_detail: job.statusDetail ?? null,
    last_error_code: job.lastErrorCode ?? null,
    last_error: job.lastError ?? null,
    idempotency_key: (job.payload as any)?.idempotencyKey ?? null,
    payload: job.payload as unknown as JobsRow['payload'],
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  }
}

export async function get(jobId: string): Promise<JobRecord | undefined> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single()
  if (error) return undefined
  return data as unknown as JobRecord
}

export async function pickAndLock(type: 'cancel_payment'): Promise<JobRecord | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('jobs_pick_for_update', { p_type: type, p_now: new Date().toISOString() })
  if (error || !data) return null
  return data as unknown as JobRecord
}

export async function upsert(job: JobRecord): Promise<JobRecord> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('jobs').upsert(toJobsInsert(job)).select('*').single()
  return data as unknown as JobRecord
}

export async function upsertByIdempotencyKey(job: JobRecord): Promise<JobRecord> {
  const supabase = createServiceRoleClient()
  if (job.payload?.idempotencyKey) {
    const key = (job.payload as any).idempotencyKey
    // Prefer: look up existing by idempotency_key first (idempotent read)
    const existing = await supabase
      .from('jobs')
      .select('*')
      .eq('idempotency_key', key)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing.data) return existing.data as unknown as JobRecord

    // Not found → insert and return
    const inserted = await supabase
      .from('jobs')
      .insert(toJobsInsert(job))
      .select('*')
      .single()
    return inserted.data as unknown as JobRecord
  }
  const { data } = await supabase.from('jobs').insert(toJobsInsert(job)).select('*').single()
  return data as unknown as JobRecord
}

export async function tryLock(_jobId: string): Promise<boolean> {
  // DB版は pickAndLock を使用するため未使用
  return false
}

export async function updateStatus(jobId: string, status: JobStatus, fields: Partial<JobRecord> = {}): Promise<JobRecord | undefined> {
  const supabase = createServiceRoleClient()
  const patch: Database['public']['Tables']['jobs']['Update'] = {
    status,
    updated_at: new Date().toISOString(),
    locked: fields.locked,
    status_detail: fields.statusDetail,
    last_error: fields.lastError,
    last_error_code: fields.lastErrorCode,
    attempts: fields.attempts,
    next_run_at: fields.nextRunAt,
  }
  const { data, error } = await supabase.from('jobs').update(patch).eq('id', jobId).select('*').single()
  if (error) return undefined
  return data as unknown as JobRecord
}

export async function appendEvent(ev: JobEventRecord): Promise<void> {
  const supabase = createServiceRoleClient()
  const row: Database['public']['Tables']['job_events']['Insert'] = {
    job_id: ev.jobId,
    at: ev.at,
    event: ev.event,
    note: ev.note ?? null,
    payload: (ev.payload as any) ?? null,
  }
  await supabase.from('job_events').insert(row)
}

export async function listEvents(jobId: string): Promise<JobEventRecord[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('job_events').select('*').eq('job_id', jobId).order('at', { ascending: true })
  return (data || []) as any
}



