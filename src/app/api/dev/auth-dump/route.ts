import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { createSSRClient } from '@/lib/supabase/ssrClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
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
    cookies: { projectRef: cookiesProjectRef, ...cookiesFlags },
    match: { projectRef: Boolean(cookiesProjectRef && env.projectRef && cookiesProjectRef === env.projectRef) },
  })
}


