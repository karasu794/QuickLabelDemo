export type AdminLike = { role?: string | null; is_admin?: boolean | null }

export const isAdmin = (p?: AdminLike | null): boolean => {
  return !!p && (p.role === 'admin' || p.is_admin === true)
}

// 共通: SSRクッキーから現在ユーザーを取得し、ADMIN_EMAILS/プロフィールで管理者判定
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getAdminContext() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set: () => {},
      remove: () => {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { isAuthenticated: false, isAdmin: false, user: null as any }
  }

  const email = (user.email || '').toLowerCase()
  if (email && adminEmails.includes(email)) {
    return { isAuthenticated: true, isAdmin: true, user }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const admin = Boolean((profile as any)?.is_admin) || ((profile as any)?.role || '').toLowerCase() === 'admin'
  return { isAuthenticated: true, isAdmin: admin, user }
}

