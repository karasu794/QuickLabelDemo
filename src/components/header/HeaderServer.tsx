import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdmin as isAdminFn } from '@/lib/auth/isAdmin'
// CORE_MODE
import { CORE_MODE } from '@/lib/config/coreMode'

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
  // CORE_MODE: 管理ナビ非表示
  return <HeaderClient initialAuth={initial} showAdminNav={!CORE_MODE} />
}


