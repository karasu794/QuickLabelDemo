import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { jobsStore } from '@/lib/payments/store'
import { getPaymentsRepo } from '@/lib/payments'
import { getJobsRepo } from '@/lib/jobs'
import { decideCancel } from '@/lib/payments/cancelDecision'
import { JobRecord, nowIso } from '@/lib/payments/types'

export async function POST(req: Request, { params }: { params: { paymentId: string } }) {
  const paymentsRepo = getPaymentsRepo()
  const paymentId = params.paymentId
  const idempotencyKey = req.headers.get('Idempotency-Key') || undefined

  const payment = await paymentsRepo.get(paymentId)
  if (!payment) {
    return NextResponse.json({ code: 'NOT_FOUND', reason: 'Payment not found' }, { status: 422 })
  }

  const decision = decideCancel(payment)
  if (decision.type === 'reject') {
    return NextResponse.json({ code: decision.code, reason: decision.reason }, { status: decision.code })
  }

  // Idempotency: reuse job if same key exists (memory store for now). DB backend would query via repo
  const existing = jobsStore.findByIdempotencyKey(idempotencyKey)
  if (existing) {
    return NextResponse.json({ jobId: existing.id }, { status: 202 })
  }

  const job: JobRecord = {
    id: randomUUID(),
    type: 'cancel_payment',
    status: 'queued',
    attempts: 0,
    nextRunAt: null,
    payload: {
      paymentId,
      expectedAction: decision.type,
      idempotencyKey,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  jobsStore.create(job)
  return NextResponse.json({ jobId: job.id }, { status: 202 })
}


