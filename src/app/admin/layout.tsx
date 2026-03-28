import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/auth/isAdmin'
import AdminSidebar from './components/AdminSidebar'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx.isAuthenticated) {
    redirect('/login?redirect_to=/admin')
  }
  if (!ctx.isAdmin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* サイドバー: モバイルでは非表示 */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>
        <div className="flex-1 md:ml-64">
          {/* モバイル用ナビ */}
          <div className="md:hidden bg-white border-b px-4 py-3 overflow-x-auto">
            <div className="flex space-x-3 text-sm">
              <a href="/admin/notifications" className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">通知</a>
              <a href="/admin/users" className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">ユーザー</a>
              <a href="/admin/fees" className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">手数料</a>
              <a href="/admin/transactions" className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">取引</a>
              <a href="/admin/company-info" className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">会社情報</a>
            </div>
          </div>
          <div className="py-4 md:py-6">
            <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
              <div className="mb-4 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">管理画面</h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">システム設定と管理機能にアクセスできます</p>
              </div>
              <div className="bg-white shadow rounded-lg">
                <div className="px-3 py-4 md:px-4 md:py-5 sm:p-6">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}