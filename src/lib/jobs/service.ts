import { getJobsRepo } from './index'
import { computeBackoffMs } from './utils/backoff'
import { JobRecord, JobEventRecord, nowIso } from '@/lib/payments/types'
import { CancelPaymentWorker } from '@/lib/payments/worker/cancelPaymentWorker'
import { MockSquarePaymentsAdapter } from '@/lib/payments/square/adapter'

export class JobService {
  private repo = getJobsRepo()
  constructor(private worker = new CancelPaymentWorker(new MockSquarePaymentsAdapter())) {}

  async pickAndRunOnce(): Promise<JobRecord | null> {
    if (this.repo.pickAndLock) {
      const picked = await this.repo.pickAndLock('cancel_payment')
      if (!picked) return null
      await this.repo.appendEvent({ jobId: picked.id, at: nowIso(), event: 'running' })
      return this.worker.runOnce()
    }
    const job = await this.repo.findReady?.()
    if (!job) return null
    const locked = await this.repo.tryLock?.(job.id)
    if (!locked) return null
    await this.repo.appendEvent({ jobId: job.id, at: nowIso(), event: 'running' })
    return this.worker.runOnce()
  }

  reschedule(job: JobRecord, reason: string): JobRecord | undefined {
    const delay = computeBackoffMs(job.attempts)
    const nextRunAt = new Date(Date.now() + delay).toISOString()
    this.repo.appendEvent({ jobId: job.id, at: nowIso(), event: 'rescheduled', note: reason })
    // 型整合のため呼び出し側でawaitしない
    this.repo.updateStatus(job.id, 'queued', { nextRunAt, locked: false, lastError: reason })
    return { ...job, status: 'queued', nextRunAt }
  }
}


