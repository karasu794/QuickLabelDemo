import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdmin as isAdminFn, getAdminContext } from '@/lib/auth/isAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getInitialAuth() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null as null | { id: string; email: string | null }, isAdmin: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = isAdminFn(profile as any)
  return { user: { id: user.id, email: user.email }, isAdmin }
}

export default async function HeaderServer() {
  const initial = await getInitialAuth()
  const HeaderClient = (await import('./HeaderClient')).default
  // 管理者には常に表示（CORE_MODE でも表示）。非管理者は非表示。
  const { isAdmin } = await getAdminContext()
  return <HeaderClient initialAuth={initial} showAdminNav={isAdmin} />
}


