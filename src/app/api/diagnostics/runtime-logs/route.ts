import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonErr, jsonOk } from '@/lib/http'
import { validateOrThrow } from '@/lib/validate'

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

const QuerySchema = z.object({
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  jobId: z.string().optional(),
  status: z.enum(['OK','ERROR']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
}).strict()

const ResponseSchema = z.object({
  items: z.array(z.object({
    jobId: z.string(),
    step: z.string(),
    status: z.enum(['OK','ERROR']),
    cause: z.string().nullable(),
    created_at: z.string(),
  })),
  nextCursor: z.string().nullable(),
}).strict()

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
  const raw = {
    since: searchParams.get('since') || undefined,
    until: searchParams.get('until') || undefined,
    jobId: searchParams.get('jobId') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') || undefined,
    cursor: searchParams.get('cursor') || undefined,
  }
  let parsed: z.infer<typeof QuerySchema>
  try {
    parsed = validateOrThrow(QuerySchema, raw)
  } catch (e: any) {
    let issues: unknown = [{ message: String(e?.message ?? e) }]
    try { issues = JSON.parse(String(e?.message)) } catch {}
    return jsonErr(422, { error: 'validation_error', issues })
  }

  const now = new Date()
  const since = toIsoLike(parsed.since ?? null, new Date(now.getTime() - 60 * 60 * 1000)) // default: 1h ago
  const until = toIsoLike(parsed.until ?? null, now)
  const limit = parsed.limit ?? 100
  const jobId = parsed.jobId || 'dummy-job'
  const statusFilter = parsed.status ?? ''
  const cursor = decodeCursor(parsed.cursor ?? null)

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

  const body = { items: publicItems, nextCursor }
  const out = ResponseSchema.safeParse(body)
  if (!out.success) {
    return jsonErr(500, { error: 'schema_mismatch', issues: out.error.issues })
  }
  return jsonOk<typeof body>(body)
}


