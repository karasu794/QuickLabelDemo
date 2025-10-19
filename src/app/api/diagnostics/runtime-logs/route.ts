import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LogStatus = 'OK' | 'ERROR'
type PublicLogItem = {
  jobId: string
  step: string
  status: LogStatus
  cause: string | null
  created_at: string
}

type InternalLogItem = PublicLogItem & { id: string }

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

function pad6(n: number): string { return n.toString().padStart(6, '0') }
function encodeCursor(createdAt: string, id: string): string {
  const raw = `${createdAt}|${id}`
  return Buffer.from(raw, 'utf8').toString('base64')
}
function decodeCursor(s: string | null): { createdAt: string, id: string } | null {
  if (!s) return null
  try {
    const raw = Buffer.from(s, 'base64').toString('utf8')
    const idx = raw.lastIndexOf('|')
    if (idx <= 0) return null
    const createdAt = raw.slice(0, idx)
    const id = raw.slice(idx + 1)
    if (!createdAt || !id) return null
    return { createdAt, id }
  } catch { return null }
}

function generateDummyItems(params: {
  sinceIso: string
  untilIso: string
  jobId: string
}): InternalLogItem[] {
  const since = new Date(params.sinceIso).getTime()
  const until = new Date(params.untilIso).getTime()
  const stepNames = ['init', 'fetchRates', 'retryRates', 'ship']
  const items: InternalLogItem[] = []
  const minute = 60 * 1000
  let counter = 0
  for (let t = until; t >= since; t -= minute) {
    const step = stepNames[counter % stepNames.length]
    const status: LogStatus = (counter % 5 === 2) ? 'ERROR' : 'OK'
    const cause = status === 'ERROR' ? (counter % 10 === 2 ? 'FEDX_RATE_TIMEOUT' : 'UNKNOWN') : null
    const created_at = new Date(t).toISOString()
    const id = pad6(counter)
    items.push({ id, jobId: params.jobId, step, status, cause, created_at })
    counter++
    if (items.length >= 500) break // safety cap
  }
  // Sort desc by created_at, then id desc
  items.sort((a, b) => {
    if (a.created_at === b.created_at) return b.id.localeCompare(a.id)
    return a.created_at < b.created_at ? 1 : -1
  })
  return items
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
  const cursorRaw = searchParams.get('cursor')

  const now = new Date()
  const since = toIsoLike(sinceRaw, new Date(now.getTime() - 60 * 60 * 1000)) // default: 1h ago
  const until = toIsoLike(untilRaw, now)
  const limit = (() => {
    const n = Math.max(1, Math.min(1000, Number(limitRaw) || 100))
    return n
  })()

  const cursor = decodeCursor(cursorRaw)

  // Generate dummy dataset and apply filters
  let data = generateDummyItems({ sinceIso: since, untilIso: until, jobId })

  if (statusFilter === 'OK' || statusFilter === 'ERROR') {
    data = data.filter(it => it.status === statusFilter)
  }
  // keyset pagination (created_at desc, id desc)
  if (cursor) {
    data = data.filter(it => (it.created_at < cursor.createdAt) || (it.created_at === cursor.createdAt && it.id < cursor.id))
  }

  const page = data.slice(0, limit)
  const hasMore = data.length > page.length
  const nextCursor = hasMore && page.length > 0 ? encodeCursor(page[page.length - 1].created_at, page[page.length - 1].id) : null

  const publicItems: PublicLogItem[] = page.map(({ id: _omit, ...rest }) => rest)

  return NextResponse.json(
    { items: publicItems, nextCursor },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}


