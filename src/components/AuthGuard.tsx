'use client'

import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  /** 認証が必要でない場合に設定 */
  requireAuth?: boolean
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth()

  // AuthGuardの状態確認（デバッグ用、必要時のみ有効化）
  if (process.env.NODE_ENV === 'development' && false) {
    console.log(`[CLIENT] AuthGuard status - Loading: ${loading}, Authenticated: ${isAuthenticated}, User:`, user);
  }

  // 認証状態を確認中はローディング画面を表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="text-gray-600 font-medium">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  // 認証が必要で未認証の場合は何も表示しない（middleware.tsがリダイレクトを処理）
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // 認証済みまたは認証不要の場合、子要素（実際のページ内容）を表示
  return <>{children}</>
} 