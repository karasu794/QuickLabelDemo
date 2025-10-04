export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/isAdmin'

export default async function AdminDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect_to=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!isAdmin(profile as any)) redirect('/')
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">ようこそ、管理者パネルへ</h1>
        <p className="mt-2 text-gray-600 mb-8">
          左のメニューから、各管理機能にアクセスしてください。
        </p>
        
        {/* ダッシュボード概要 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">ユーザー管理</h2>
            <p className="text-gray-600 text-sm">
              システムのユーザー一覧を確認し、権限を管理できます。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">手数料設定</h2>
            <p className="text-gray-600 text-sm">
              発送手数料や料金設定を管理できます。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">取引履歴</h2>
            <p className="text-gray-600 text-sm">
              全ユーザーの取引履歴を確認できます。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">通知管理</h2>
            <p className="text-gray-600 text-sm">
              システム通知やアラートを管理できます。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">システム設定</h2>
            <p className="text-gray-600 text-sm">
              アプリケーション全体の設定を管理できます。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">レポート</h2>
            <p className="text-gray-600 text-sm">
              各種レポートや統計情報を確認できます。
            </p>
          </div>
        </div>
        
        {/* クイックアクセス */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">クイックアクセス</h2>
          <div className="flex flex-wrap gap-3">
            <a 
              href="/admin/users" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ユーザー管理
            </a>
            <a 
              href="/admin/fees" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              手数料設定
            </a>
            <a 
              href="/admin/transactions" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              取引履歴
            </a>
            <a 
              href="/admin/notifications" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              通知管理
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 