import { z } from 'zod'
import { validateOrThrow } from '@/lib/validate'

const RuntimeLogItemSchema = z.object({
  jobId: z.string(),
  step: z.string(),
  status: z.union([z.literal('OK'), z.literal('ERROR')]),
  cause: z.string().nullable(),
  created_at: z.string(),
}).strict()

const RuntimeLogsResponseSchema = z.object({
  items: z.array(RuntimeLogItemSchema),
  nextCursor: z.string().nullable(),
}).strict()

async function fetchLogs() {
  const token = process.env.ACTIONS_TOKEN || ''
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/diagnostics/runtime-logs?limit=20`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) {
    return { ok: false as const, error: `HTTP ${res.status}` }
  }
  let json: unknown
  try { json = await res.json() } catch { return { ok: false as const, error: 'invalid_json' } }
  try {
    const data = validateOrThrow(RuntimeLogsResponseSchema, json)
    return { ok: true as const, data }
  } catch (e: any) {
    return { ok: false as const, error: 'schema_mismatch' }
  }
}

export default async function DebugMyPage() {
  const result = await fetchLogs()
  const latestTs = result.ok && result.data.items[0]?.created_at

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Diagnostics (MyPage)</h1>
        <p className="text-sm text-gray-600">最新診断: {latestTs ? new Date(latestTs).toLocaleString() : '—'}</p>
      </div>

      {!result.ok && (
        <div className="rounded border border-yellow-300 bg-yellow-50 text-yellow-800 p-3">
          ログ取得エラー: {result.error}
        </div>
      )}

      {result.ok && result.data.items.length === 0 && (
        <div className="text-gray-600">ログがありません</div>
      )}

      {result.ok && result.data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">created_at</th>
                <th className="py-2 pr-4">jobId</th>
                <th className="py-2 pr-4">step</th>
                <th className="py-2 pr-4">status</th>
                <th className="py-2 pr-4">cause</th>
              </tr>
            </thead>
            <tbody>
              {result.data.items.map((it, idx) => (
                <tr key={`${it.created_at}-${idx}`} className="border-b">
                  <td className="py-1 pr-4 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                  <td className="py-1 pr-4">{it.jobId}</td>
                  <td className="py-1 pr-4">{it.step}</td>
                  <td className="py-1 pr-4">
                    <span className={it.status === 'OK' ? 'text-green-700' : 'text-red-700'}>{it.status}</span>
                  </td>
                  <td className="py-1 pr-4">{it.cause ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReTestForm />
    </div>
  )
}

async function runReTest() {
  'use server'
  const token = process.env.ACTIONS_TOKEN || ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/run-e2e`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ suite: 'smoke' }),
  })
}

function ReTestForm() {
  return (
    <form action={runReTest}>
      <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
        再テスト
      </button>
    </form>
  )
}


