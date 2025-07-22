import Link from 'next/link'
import { ReactNode } from 'react'
import AdminGuard from '@/components/AdminGuard'
import IdleTimeoutProvider from '@/components/IdleTimeoutProvider'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      {/* 管理者画面用の短いタイムアウト設定（例：15分）*/}
      <IdleTimeoutProvider
        idleTimeout={15 * 60 * 1000} // 15分でタイムアウト
        warningTimeout={14 * 60 * 1000} // 14分で警告表示
        enabled={true}
      >
        <div className="min-h-screen bg-gray-100">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
                <p className="mt-2 text-gray-600">
                  システム設定と管理機能にアクセスできます
                </p>
              </div>
              
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </IdleTimeoutProvider>
    </AdminGuard>
  )
} 