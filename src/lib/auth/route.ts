import { createRouteHandlerClient } from '@/lib/supabase/server'
import type { Session } from '@supabase/supabase-js'

type Ok = {
  ok: true
  supabase: ReturnType<typeof createRouteHandlerClient>
  session: Session
  user: Session['user']
  profile: any
}
type Ng = { ok: false; status: 401 | 403 }

export async function requireAdminAuthRoute(): Promise<Ok | Ng> {
  const supabase = createRouteHandlerClient()

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession()
  if (sessionErr || !session) return { ok: false, status: 401 }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role,is_admin')
    .eq('id', session.user.id)
    .single()
  if (profileErr || !profile) return { ok: false, status: 403 }
  const p: any = profile
  if (!(p.role === 'admin' || p.is_admin === true)) return { ok: false, status: 403 }

  return { ok: true, supabase, session, user: session.user, profile }
}


