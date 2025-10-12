import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createSSRClient } from '@/lib/supabase/ssrClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // 本番/プレビュー環境では 404。DEV_DUMP=1 のときのみ有効化
  const isProdLike =
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'production'

  if (isProdLike && process.env.DEV_DUMP !== '1') {
    return NextResponse.json({ disabled: true }, { status: 404 })
  }

  const env = {
    url: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    projectRef: (() => {
      const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
      return m?.[1] || null
    })(),
  }

  const cookieStore = cookies()
  const names = cookieStore.getAll().map(c => c.name)
  const cookiesFlags: Record<string, boolean> = {}
  for (const n of names) {
    if (n.toLowerCase().includes('sb')) cookiesFlags[n] = true
  }
  const cookiesProjectRef = (() => {
    for (const n of names) {
      const m = n.match(/^sb-([a-zA-Z0-9]+)-/)
      if (m && m[1]) return m[1]
    }
    return null
  })()

  // sb-<ref>-auth-token の実体検査（DEV限定）。分割(.0/.1)があれば結合
  const baseName = env.projectRef ? `sb-${env.projectRef}-auth-token` : 'sb-access-token'
  const tokenCookieNames = names.filter(n => n === baseName || n.startsWith(baseName + '.')).sort()
  let combined = ''
  if (tokenCookieNames.length > 0) {
    for (const n of tokenCookieNames) {
      const val = cookieStore.get(n)?.value || ''
      combined += val
    }
  }
  const rawPreview = combined ? combined.slice(0, 100) : ''

  type AnyObj = Record<string, any>
  const safeParse = (s: string): AnyObj | null => {
    try { return JSON.parse(s) as AnyObj } catch { return null }
  }
  const deepHas = (obj: AnyObj | null, key: string): boolean => {
    if (!obj || typeof obj !== 'object') return false
    if (Object.prototype.hasOwnProperty.call(obj, key) && !!obj[key]) return true
    for (const v of Object.values(obj)) {
      if (typeof v === 'object' && v) {
        if (deepHas(v as AnyObj, key)) return true
      }
    }
    return false
  }
  const parsedObj = safeParse(combined)
  const hasAccessToken = deepHas(parsedObj, 'access_token')
  const hasRefreshToken = deepHas(parsedObj, 'refresh_token')

  let serverHasUser = false
  try {
    const ssr = createSSRClient()
    const { data: { user }, error } = await ssr.auth.getUser()
    serverHasUser = Boolean(user && !error)
  } catch {
    serverHasUser = false
  }

  let routeHasUser = false
  try {
    const rh = createRouteHandlerClient()
    const { data: { user }, error } = await rh.auth.getUser()
    routeHasUser = Boolean(user && !error)
  } catch {
    routeHasUser = false
  }

  return NextResponse.json({
    env,
    serverComponent: { hasUser: serverHasUser },
    routeHandler: { hasUser: routeHasUser },
    cookies: {
      projectRef: cookiesProjectRef,
      'sb-auth-token': tokenCookieNames.length > 0,
      raw: rawPreview, // DEVのみ（本番ではエンドポイント自体が404）
      parsed: { hasAccessToken, hasRefreshToken },
      ...cookiesFlags,
    },
    match: { projectRef: Boolean(cookiesProjectRef && env.projectRef && cookiesProjectRef === env.projectRef) },
  })
}


