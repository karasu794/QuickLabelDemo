import { getAdminContext } from '@/lib/auth/isAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export default async function HeaderServer() {
  const HeaderClient = (await import('./HeaderClient')).default
  const ctx = await getAdminContext()
  const showAdminNav = !!ctx.isAdmin
  return <HeaderClient initialAuth={{ user: ctx.user ? { id: ctx.user.id, email: (ctx.user as any).email ?? null } : null, isAdmin: !!ctx.isAdmin }} showAdminNav={showAdminNav} />
}


