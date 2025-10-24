import { NextRequest, NextResponse } from 'next/server'

// 簡易メモリキャッシュ（Vercel上では短命）
const cache = new Map<string, { at: number; data: any }>()
const TTL_MS = 5 * 60 * 1000

function normalizeHsCode(input: string): string {
  return (input || '').replace(/[^0-9]/g, '').slice(0, 10)
}

async function fetchHsSearch(code: string) {
  const base = process.env.FEDEX_HS_API_BASE_URL || ''
  const token = process.env.FEDEX_HS_API_TOKEN || ''
  if (!base || !token) {
    return {
      ok: true,
      source: 'stub',
      items: [
        { code, description: 'HS search is not configured (stubbed)', locale: 'ja' }
      ],
    }
  }
  const url = `${base.replace(/\/$/, '')}/search?code=${encodeURIComponent(code)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: `HS search failed: ${res.status} ${text}` }
  }
  return { ok: true, ...(await res.json()) }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const code = normalizeHsCode(q)
    if (!code) {
      return NextResponse.json({ ok: false, code: 'INVALID_CODE', message: 'HSコードが空です' }, { status: 400 })
    }

    const key = `search:${code}`
    const now = Date.now()
    const hit = cache.get(key)
    if (hit && now - hit.at < TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, code, result: hit.data })
    }

    const result = await fetchHsSearch(code)
    if (!(result as any).ok) {
      return NextResponse.json({ ok: false, code: 'HS_SEARCH_FAILED', message: (result as any).error || '検索に失敗しました' }, { status: 502 })
    }
    cache.set(key, { at: now, data: result })
    return NextResponse.json({ ok: true, cached: false, code, result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'HS_SEARCH_ERROR', message: String(e?.message || e) }, { status: 500 })
  }
}


