import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LogStatus = 'OK' | 'ERROR'
type LogItem = {
  jobId: string
  step: string
  status: LogStatus
  cause: string | null
  created_at: string
}

function authenticateIfRequired(req: NextRequest): NextResponse | null {
  const requiredToken = process.env.ACTIONS_TOKEN
  if (!requiredToken) return null

  const header = req.headers.get('authorization') || ''
  const expected = `Bearer ${requiredToken}`
  if (header !== expected) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  return null
}

function toIsoLike(s: string | null, fallbackDate: Date): string {
  if (!s) return fallbackDate.toISOString()
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallbackDate.toISOString() : d.toISOString()
}

export async function GET(req: NextRequest) {
  const authErr = authenticateIfRequired(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const sinceRaw = searchParams.get('since')
  const untilRaw = searchParams.get('until')
  const jobId = searchParams.get('jobId') || 'dummy-job'
  const statusFilter = (searchParams.get('status') || '').toUpperCase() as LogStatus | ''
  const limitRaw = searchParams.get('limit')

  const now = new Date()
  const since = toIsoLike(sinceRaw, new Date(now.getTime() - 60 * 60 * 1000)) // default: 1h ago
  const until = toIsoLike(untilRaw, now)
  const limit = (() => {
    const n = Math.max(1, Math.min(1000, Number(limitRaw) || 100))
    return n
  })()

  const baseItems: LogItem[] = [
    {
      jobId,
      step: 'init',
      status: 'OK',
      cause: null,
      created_at: new Date(new Date(since).getTime() + 5 * 60 * 1000).toISOString(),
    },
    {
      jobId,
      step: 'fetchRates',
      status: 'ERROR',
      cause: 'FEDX_RATE_TIMEOUT',
      created_at: new Date(new Date(since).getTime() + 10 * 60 * 1000).toISOString(),
    },
    {
      jobId,
      step: 'retryRates',
      status: 'OK',
      cause: null,
      created_at: new Date(new Date(since).getTime() + 12 * 60 * 1000).toISOString(),
    },
  ]

  const filteredByTime = baseItems.filter(it => it.created_at >= since && it.created_at <= until)
  const filteredByStatus = statusFilter === 'OK' || statusFilter === 'ERROR'
    ? filteredByTime.filter(it => it.status === statusFilter)
    : filteredByTime
  const limited = filteredByStatus.slice(0, limit)

  return NextResponse.json(
    { items: limited },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}


