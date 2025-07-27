'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import AdminSidebar from './components/AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { loading, isAuthenticated, isAdmin } = useAuth()
  const router = useRouter()

  // 認証状態確定後のリダイレクト処理
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.replace('/')
    }
  }, [loading, isAuthenticated, isAdmin, router])

  // ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">管理者権限を確認中...</p>
        </div>
      </div>
    )
  }

  // 管理者でない場合は何も表示しない（リダイレクト処理中）
  if (!isAuthenticated || !isAdmin) {
    return null
  }

  // 管理者の場合のみレイアウトを表示
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* サイドバー */}
        <AdminSidebar />
        
        {/* メインコンテンツエリア */}
        <div className="flex-1 ml-64">
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
      </div>
    </div>
  )
} 