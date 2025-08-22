'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import HeaderSkeleton from './HeaderSkeleton'

export default function Header() {
  const { isAuthenticated, isAdmin, loading, authStatus, user } = useAuth()
  const router = useRouter()

  // デバッグログ（開発環境でのみ、必要時のみ有効化）
  if (process.env.NODE_ENV === 'development' && false) {
    console.log('[CLIENT] Header Component Render:', {
      authStatus,
      isAuthenticated,
      loading,
      hasUser: !!user
    })
  }

  const handleLogout = async () => {
    try {
      console.log('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Logout initiated')
      
      // 1. Supabase のセッションを削除（タイムアウト付き）
      console.log('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Calling supabase.auth.signOut() with timeout...')
      
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SignOut timeout after 8 seconds')), 8000)
      })
      
      const result = await Promise.race([signOutPromise, timeoutPromise]) as { error: any }
      
      if (result.error) {
        throw result.error
      }
      
      console.log('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Supabase sign out completed successfully')
      
      // 2. Cookie を手動で削除（確実にクリアするため）
      if (typeof window !== 'undefined') {
        console.log('[CLIENT] Clearing cookies and localStorage')
        document.cookie = 'quicklabel-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'sb-quicklabel-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        localStorage.removeItem('quicklabel-auth-token')
        localStorage.removeItem('sb-quicklabel-auth-token')
      }
      
      // 3. 成功トースト通知を表示
      console.log('[CLIENT] Showing success toast')
      toast.success('ログアウトしました。', {
        duration: 2500,
        icon: '👋',
      })
      
      // 4. 少し待ってからリダイレクト（認証状態の更新を待つ）
      console.log('[CLIENT] Waiting for auth state to update...')
      setTimeout(() => {
        console.log('[CLIENT] Redirecting to home page')
        
        // router.push() と window.location.href の両方を試行
        router.push('/')
        
        // フォールバック：router.push が動作しない場合のためのハードリダイレクト
        setTimeout(() => {
          console.log('[CLIENT] Fallback: using window.location.href')
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        }, 500)
      }, 100)
      
    } catch (error) {
      console.error('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Logout failed:', {
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        isTimeout: error instanceof Error && error.message.includes('timeout'),
        fullError: error
      })
      
      if (error instanceof Error && error.message.includes('timeout')) {
        toast.error('ログアウト処理がタイムアウトしました。ページを再読み込みしてください。', {
          duration: 6000,
          icon: '⏰',
        })
        // タイムアウト時は強制的に手動クリーンアップとリダイレクト
        if (typeof window !== 'undefined') {
          console.log('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Forcing manual cleanup due to timeout')
          document.cookie = 'quicklabel-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'sb-quicklabel-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          localStorage.removeItem('quicklabel-auth-token')
          localStorage.removeItem('sb-quicklabel-auth-token')
          setTimeout(() => window.location.href = '/', 1000)
        }
      } else {
        // エラートースト通知を表示
        toast.error('ログアウト中にエラーが発生しました。', {
          duration: 4000,
          icon: '⚠️',
        })
      }
      
      // エラーが発生した場合も確実にリダイレクト（少し遅らせてトースト表示を確保）
      console.log('[CLIENT] 🚨 EMERGENCY LOGOUT DEBUG - Error occurred, forcing redirect')
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }, 1000)
    }
  }

  // 認証状態が確定するまではスケルトンを表示（競合状態解消）
  if (loading) {
    return <HeaderSkeleton />
  }

  // 認証済みユーザー向けヘッダー
  if (authStatus === 'AUTHENTICATED') {
    return (
      <header className="bg-purple-900">
        <div className="container mx-auto px-6 h-16">
          <nav className="flex justify-between items-center h-full">
            {/* ロゴ部分 */}
            <Link 
              href="/" 
              className="text-white text-xl font-normal hover:opacity-80 transition-opacity"
            >
              QuickLabel
            </Link>

            {/* 認証済みユーザー向けナビゲーション */}
            <div className="flex items-center space-x-8">
              <Link 
                href="/shipping/new/shipper" 
                className="text-white hover:opacity-80 transition-opacity"
              >
                送り状作成
              </Link>
              <Link 
                href="/mypage/profile" 
                className="text-white hover:opacity-80 transition-opacity"
              >
                マイページ
              </Link>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                  <Link 
                    href="/admin" 
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    管理者ページ
                  </Link>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </nav>
        </div>
      </header>
    )
  }

  // 未認証ユーザー向けヘッダー
  
  // 未認証ユーザー向けヘッダー (authStatus === 'UNAUTHENTICATED')
  return (
    <header className="bg-purple-900">
      <div className="container mx-auto px-6 h-16">
        <nav className="flex justify-between items-center h-full">
          {/* ロゴ部分 */}
          <Link 
            href="/" 
            className="text-white text-xl font-normal hover:opacity-80 transition-opacity"
          >
            QuickLabel
          </Link>

          {/* 未認証ユーザー向けナビゲーション */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/login" 
              className="text-white hover:opacity-80 transition-opacity"
            >
              ログイン
            </Link>
            <Link 
              href="/signup" 
              className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors"
            >
              新規登録
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
} 