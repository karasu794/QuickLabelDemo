import { NextRequest, NextResponse } from 'next/server'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { fetchHtsSuggestions } from '@/lib/hts/suggest'

function envBool(name: string, def = false): boolean {
  const v = (process.env as any)[name]
  if (v === undefined || v === null) return def
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off', ''].includes(s)) return false
  return def
}

export async function GET(req: NextRequest) {
  try {
    await getUserOrThrow()
  } catch {
    // 認証必須: 未認証は空配列（静かにフォールバック）
    return NextResponse.json([])
  }

  const url = new URL(req.url)
  let q = (url.searchParams.get('q') || '').trim()
  q = q.replace(/\s+/g, ' ').slice(0, 64)
  const dest = (url.searchParams.get('dest') || 'US').toUpperCase()
  const limitRaw = parseInt(url.searchParams.get('limit') || '10', 10)
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 10 : limitRaw, 1), 20)

  // フラグOFF時は何もしない
  if (!envBool('FEATURE_HTS_SUGGESTIONS', false)) {
    return NextResponse.json([])
  }

  if (q.length < 2 || q.length > 64) {
    return NextResponse.json([])
  }

  try {
    const items = await fetchHtsSuggestions({ q, dest, limit })
    return NextResponse.json(Array.isArray(items) ? items.slice(0, limit) : [])
  } catch {
    return NextResponse.json([])
  }
}


