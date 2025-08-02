'use client'

import { useEffect, useRef } from 'react'
// import { useRouter } from 'next/navigation' // TEMPORARY: Disabled
import { useAuth } from '@/hooks/useAuth'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { user, loading, isAuthenticated, isAdmin, hasMFA, mfaLoading } = useAuth()
  // const router = useRouter() // TEMPORARY: Disabled
  const initialCheckDone = useRef(false)
  const lastAuthState = useRef<{isAuthenticated: boolean; isAdmin: boolean; hasMFA: boolean} | null>(null)

  // 重要な状態変化のみログ出力（ログスパム防止）
  const prevGuardState = useRef<{loading: boolean; isAuthenticated: boolean; isAdmin: boolean; hasMFA: boolean; mfaLoading: boolean} | null>(null)
  
  useEffect(() => {
    const currentGuardState = { loading, isAuthenticated, isAdmin, hasMFA, mfaLoading }
    
    if (!prevGuardState.current || 
        prevGuardState.current.loading !== currentGuardState.loading ||
        prevGuardState.current.isAuthenticated !== currentGuardState.isAuthenticated ||
        prevGuardState.current.isAdmin !== currentGuardState.isAdmin ||
        prevGuardState.current.hasMFA !== currentGuardState.hasMFA ||
        prevGuardState.current.mfaLoading !== currentGuardState.mfaLoading) {
      
      console.log('[AdminAuthGuard] Significant status change:', { 
        loading, 
        isAuthenticated, 
        isAdmin, 
        hasMFA,
        mfaLoading,
        userEmail: user?.email 
      })
    }
    
    prevGuardState.current = currentGuardState
  }, [loading, isAuthenticated, isAdmin, hasMFA, mfaLoading, user?.email])

  useEffect(() => {
    // ローディング中は何もしない
    if (loading || mfaLoading) return

    // 初回チェック済みで、認証状態に実質的な変化がない場合はスキップ
    const currentAuthState = { isAuthenticated, isAdmin, hasMFA }
    if (initialCheckDone.current && lastAuthState.current) {
      const stateChanged = 
        lastAuthState.current.isAuthenticated !== isAuthenticated ||
        lastAuthState.current.isAdmin !== isAdmin ||
        lastAuthState.current.hasMFA !== hasMFA
      
      if (!stateChanged) {
        console.log('[AdminAuthGuard] No significant auth state change, skipping redirect check')
        return
      }
      
      // 認証状態の悪化（ログアウトなど）のみ処理
      if (lastAuthState.current.isAuthenticated && !isAuthenticated) {
        console.log('[AdminAuthGuard] User logged out, redirecting to login')
        // router.replace('/login') // TEMPORARY: Disabled
        window.location.href = '/login' // TEMPORARY: Use native redirect
        return
      }
      
      if (lastAuthState.current.isAdmin && isAuthenticated && !isAdmin) {
        console.log('[AdminAuthGuard] Admin privileges revoked, redirecting to login')
        // router.replace('/login') // TEMPORARY: Disabled
        window.location.href = '/login' // TEMPORARY: Use native redirect
        return
      }
    }

    // 初回または重要な状態変化時のみリダイレクト処理実行
    if (!initialCheckDone.current || !lastAuthState.current) {
      // 未認証の場合、ログインページにリダイレクト
      if (!isAuthenticated) {
        console.log('[AdminAuthGuard] Initial check: User not authenticated, redirecting to login')
        // router.replace('/login') // TEMPORARY: Disabled
        window.location.href = '/login' // TEMPORARY: Use native redirect
        return
      }

      // 認証されているが管理者でない場合もログインページにリダイレクト
      if (isAuthenticated && !isAdmin) {
        console.log('[AdminAuthGuard] Initial check: User not admin, redirecting to login')
        // router.replace('/login') // TEMPORARY: Disabled
        window.location.href = '/login' // TEMPORARY: Use native redirect
        return
      }

      // 管理者だがMFAが未設定の場合、MFA設定ページにリダイレクト
      // ただし、現在のページがMFA関連ページの場合は除外
      const currentPath = window.location.pathname
      const mfaRelatedPaths = ['/mfa-setup', '/mfa-challenge', '/login']
      const isInMFAFlow = mfaRelatedPaths.some(path => currentPath.startsWith(path))
      
      if (isAuthenticated && isAdmin && !hasMFA && !isInMFAFlow) {
        console.log('[AdminAuthGuard] Initial check: Admin without MFA, redirecting to MFA setup')
        // router.replace('/mfa-setup?required=true') // TEMPORARY: Disabled
        window.location.href = '/mfa-setup?required=true' // TEMPORARY: Use native redirect
        return
      }
      
      // 初回チェック完了をマーク
      console.log('[AdminAuthGuard] Initial authentication check completed successfully')
      initialCheckDone.current = true
    }
    
    // 認証状態を記録
    lastAuthState.current = currentAuthState
  }, [loading, mfaLoading, isAuthenticated, isAdmin, hasMFA]) // router removed from deps

  // ローディング中の表示
  if (loading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 font-medium">
            {loading ? '管理者権限を確認中...' : 'MFA設定を確認中...'}
          </p>
        </div>
      </div>
    )
  }

  // 未認証または非管理者の場合は何も表示しない（リダイレクト処理中）
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse text-gray-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 2l1.5-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">アクセス権限を確認中...</p>
        </div>
      </div>
    )
  }

  // MFAが未設定の管理者の場合も何も表示しない（リダイレクト処理中）
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const mfaRelatedPaths = ['/mfa-setup', '/mfa-challenge', '/login']
  const isInMFAFlow = mfaRelatedPaths.some(path => currentPath.startsWith(path))
  
  if (isAuthenticated && isAdmin && !hasMFA && !isInMFAFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse text-orange-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4l1.5-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">MFA設定が必要です...</p>
        </div>
      </div>
    )
  }

  // 管理者でMFAが設定済みの場合のみコンテンツを表示
  return <>{children}</>
}