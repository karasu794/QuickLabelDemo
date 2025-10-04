import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from './components/AdminSidebar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function requireAdminPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login?redirect_to=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const isAdmin = (profile as any)?.role === 'admin' || (profile as any)?.is_admin === true
  if (!isAdmin) {
    return { isAdmin: false as const }
  }

  return { isAdmin: true as const }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const r = await requireAdminPage()
  if (r.isAdmin === false) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">403 Forbidden</h1>
        <p className="mt-2">管理者権限が必要です。</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 ml-64">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
                <p className="mt-2 text-gray-600">システム設定と管理機能にアクセスできます</p>
              </div>
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}