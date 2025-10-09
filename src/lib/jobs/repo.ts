import { JobEventRecord, JobRecord, JobStatus, nowIso } from '@/lib/payments/types'

class InMemoryJobRepo {
  private jobs = new Map<string, JobRecord>()
  private events: JobEventRecord[] = []

  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId)
  }

  findReady(): JobRecord | undefined {
    const now = Date.now()
    for (const j of this.jobs.values()) {
      if (j.type === 'cancel_payment' && j.status === 'queued' && !j.locked && (!j.nextRunAt || Date.parse(j.nextRunAt) <= now)) {
        return j
      }
    }
    return undefined
  }

  upsert(job: JobRecord): JobRecord {
    this.jobs.set(job.id, job)
    return job
  }

  upsertByIdempotencyKey(job: JobRecord): JobRecord {
    const key = job.payload.idempotencyKey || ''
    if (key) {
      for (const j of this.jobs.values()) {
        if ((j.payload.idempotencyKey || '') === key && j.payload.paymentId === job.payload.paymentId) return j
      }
    }
    this.jobs.set(job.id, job)
    return job
  }

  tryLock(jobId: string): boolean {
    const j = this.jobs.get(jobId)
    if (!j || j.locked) return false
    j.locked = true
    j.updatedAt = nowIso()
    this.jobs.set(jobId, j)
    return true
  }

  updateStatus(jobId: string, status: JobStatus, fields: Partial<JobRecord> = {}): JobRecord | undefined {
    const j = this.jobs.get(jobId)
    if (!j) return undefined
    j.status = status
    j.locked = fields.locked ?? false
    j.statusDetail = fields.statusDetail ?? j.statusDetail ?? null
    j.lastError = fields.lastError ?? j.lastError ?? null
    j.lastErrorCode = fields.lastErrorCode ?? j.lastErrorCode ?? null
    j.attempts = fields.attempts ?? j.attempts
    j.nextRunAt = fields.nextRunAt !== undefined ? fields.nextRunAt : j.nextRunAt
    j.updatedAt = nowIso()
    this.jobs.set(jobId, j)
    return j
  }

  appendEvent(ev: JobEventRecord): void {
    this.events.push(ev)
  }

  listEvents(jobId: string): JobEventRecord[] {
    return this.events.filter(e => e.jobId === jobId)
  }
}

export const jobRepo = new InMemoryJobRepo()


