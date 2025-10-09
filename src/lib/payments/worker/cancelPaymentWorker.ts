import { jobsStore } from '../store'
import { ISquarePaymentsAdapter } from '../square/adapter'
import { JobRecord, nowIso } from '../types'
import { jobRepo } from '@/lib/jobs/repo'
import { computeBackoffMs } from '@/lib/jobs/utils/backoff'
import { getPaymentsRepo } from '../index'

export class CancelPaymentWorker {
  constructor(private adapter: ISquarePaymentsAdapter) {}

  async runOnce(): Promise<JobRecord | null> {
    // minimal: pick first queued job
    const job = [...(jobsStore as any).jobs?.values?.() || []].find((j: JobRecord) => j.type === 'cancel_payment' && j.status === 'queued')
    if (!job) return null

    job.status = 'running'
    job.attempts += 1
    job.updatedAt = nowIso()
    jobsStore.updateStatus(job.id, 'running')

    try {
      const paymentsRepo = getPaymentsRepo()
      const payment = await paymentsRepo.get(job.payload.paymentId)
      if (!payment) throw new Error('Payment not found')

      if (job.payload.expectedAction === 'void') {
        const res = await this.adapter.void(payment.id, { idempotencyKey: job.payload.idempotencyKey })
        if (!res.ok) throw new Error((res as any).reason)
        await paymentsRepo.update(payment.id, { status: 'voided' })
      } else {
        const res = await this.adapter.refund(payment.id, { amount: payment.amount, currency: payment.currency, idempotencyKey: job.payload.idempotencyKey })
        if (!res.ok) throw new Error((res as any).reason)
        await paymentsRepo.update(payment.id, { status: 'refunded', refundedAmount: payment.amount })
      }
      jobsStore.updateStatus(job.id, 'succeeded')
      return job
    } catch (e: any) {
      const attempts = job.attempts
      if (attempts >= 3) {
        jobsStore.updateStatus(job.id, 'failed', e?.message || String(e))
        jobRepo.appendEvent({ jobId: job.id, at: nowIso(), event: 'failed', note: e?.message })
      } else {
        const delay = computeBackoffMs(attempts)
        const nextRunAt = new Date(Date.now() + delay).toISOString()
        jobsStore.updateStatus(job.id, 'queued', e?.message || String(e))
        jobRepo.appendEvent({ jobId: job.id, at: nowIso(), event: 'rescheduled', note: e?.message, payload: { nextRunAt } })
      }
      return job
    }
  }
}


