import { NextResponse } from 'next/server'
import { JobService } from '@/lib/jobs/service'

export async function POST() {
  const svc = new JobService()
  const result = await svc.pickAndRunOnce()
  return NextResponse.json({ ran: !!result, jobId: result?.id || null }, { status: 200 })
}


