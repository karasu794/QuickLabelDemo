'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import AdminAuthGuard from '@/components/AdminAuthGuard'
import AdminSidebar from '@/app/components/AdminSidebar'
import './globals.css'

interface RootLayoutProps {
  children: ReactNode
}

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // MFA関連ページかどうかの判定を安全に行う
  let isMFAPage = false
  try {
    isMFAPage = pathname && (pathname.startsWith('/mfa-') || pathname === '/login')
  } catch (error) {
    console.error('Pathname check error:', error)
    isMFAPage = false
  }
  
  // MFA関連ページではレイアウトを簡素化
  if (isMFAPage) {
    return <div>{children}</div>
  }

  // 通常の管理画面レイアウト
  return (
    <div>
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm border-b border-gray-200 z-10">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-purple-600">QuickLabel</h1>
            <span className="ml-2 text-sm text-gray-500">管理画面</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">管理者としてログイン中</span>
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">A</span>
            </div>
          </div>
        </div>
      </header>

      {/* サイドバー */}
      <AdminSidebar />

      {/* メインコンテンツ */}
      <main className="ml-64 mt-16 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body className="bg-gray-50">
        <AuthProvider>
          <AdminAuthGuard>
            <LayoutContent>
              {children}
            </LayoutContent>
          </AdminAuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}