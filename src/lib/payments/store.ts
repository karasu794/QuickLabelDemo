import { JobRecord, JobStatus, PaymentRecord, nowIso } from './types'

/**
 * Minimal in-memory stores for dev/tests. Replace with DB repo later.
 */
export class InMemoryPaymentsStore {
  private payments = new Map<string, PaymentRecord>()

  upsert(record: PaymentRecord): void {
    this.payments.set(record.id, { ...record, updatedAt: nowIso() })
  }

  get(paymentId: string): PaymentRecord | undefined {
    return this.payments.get(paymentId)
  }
}

export class InMemoryJobsStore {
  private jobs = new Map<string, JobRecord>()

  create(job: JobRecord): JobRecord {
    this.jobs.set(job.id, job)
    return job
  }

  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId)
  }

  findByIdempotencyKey(idempotencyKey: string | undefined): JobRecord | undefined {
    if (!idempotencyKey) return undefined
    for (const j of this.jobs.values()) {
      if ((j.payload.idempotencyKey || '') === idempotencyKey) return j
    }
    return undefined
  }

  updateStatus(jobId: string, status: JobStatus, lastError?: string): JobRecord | undefined {
    const job = this.jobs.get(jobId)
    if (!job) return undefined
    job.status = status
    job.updatedAt = nowIso()
    if (lastError !== undefined) job.lastError = lastError
    this.jobs.set(jobId, job)
    return job
  }
}

export const paymentsStore = new InMemoryPaymentsStore()
export const jobsStore = new InMemoryJobsStore()


