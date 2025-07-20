'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  /** 認証が必要でない場合に設定 */
  requireAuth?: boolean
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && requireAuth && !isAuthenticated) {
      // 現在のパスをクエリパラメータとして追加してログインページにリダイレクト
      const redirectTo = encodeURIComponent(pathname)
      router.push(`/login?redirect_to=${redirectTo}`)
    }
  }, [isAuthenticated, loading, requireAuth, router, pathname])

  // ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  // 認証が必要で未ログインの場合は何も表示しない（リダイレクト処理中）
  if (requireAuth && !isAuthenticated) {
    return null
  }

  return <>{children}</>
} 