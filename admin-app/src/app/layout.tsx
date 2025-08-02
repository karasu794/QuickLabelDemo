'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { ReactNode } from 'react'
// import { usePathname } from 'next/navigation' // TEMPORARY: Disabled
// import { AuthProvider } from '@/contexts/AuthContext' // TEMPORARY: Disabled
// import AdminAuthGuard from '@/components/AdminAuthGuard' // TEMPORARY: Disabled
// import AdminSidebar from '@/app/components/AdminSidebar' // TEMPORARY: Disabled
import './globals.css'

interface RootLayoutProps {
  children: ReactNode
}

function LayoutContent({ children }: { children: ReactNode }) {
  // TEMPORARY: 完全に簡素化してSSGエラーを回避
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body className="bg-gray-50">
        {/* <AuthProvider> TEMPORARY: Disabled */}
          {/* <AdminAuthGuard> TEMPORARY: Disabled */}
            <LayoutContent>
              {children}
            </LayoutContent>
          {/* </AdminAuthGuard> */}
        {/* </AuthProvider> */}
      </body>
    </html>
  )
}