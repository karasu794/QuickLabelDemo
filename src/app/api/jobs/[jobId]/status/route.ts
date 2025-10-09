import { NextResponse } from 'next/server'
import { jobsStore } from '@/lib/payments/store'
import { getJobsRepo } from '@/lib/jobs'

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const repo = getJobsRepo()
  const job = jobsStore.get(params.jobId)
  if (!job) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 })
  const events = await repo.listEvents(job.id)
  return NextResponse.json({
    status: job.status,
    statusDetail: job.statusDetail || null,
    attempts: job.attempts,
    lastErrorCode: job.lastErrorCode || null,
    lastError: job.lastError || null,
    events,
  }, { status: 200 })
}


