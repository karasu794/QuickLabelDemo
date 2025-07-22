'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { notFound } from 'next/navigation'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth()
  const router = useRouter()
  const [accessChecked, setAccessChecked] = useState(false)

  // 詳細な状態ログ
  useEffect(() => {
    console.log('🛡️ AdminGuard状態監視:', {
      loading,
      isAuthenticated,
      isAdmin,
      accessChecked,
      userEmail: user?.email || '未ログイン',
      profileRole: profile?.role || '未設定',
      profileId: profile?.id || 'なし',
      timestamp: new Date().toISOString()
    })
  }, [loading, isAuthenticated, isAdmin, accessChecked, user, profile])

  useEffect(() => {
    console.log('🔐 AdminGuardアクセスチェック useEffect実行:', {
      loading,
      isAuthenticated,
      isAdmin,
      userEmail: user?.email,
      profileRole: profile?.role
    })

    // ローディング完了後に厳密なアクセスチェックを実行
    if (!loading) {
      console.log('✅ ローディング完了 - アクセスチェック開始:', {
        isAuthenticated,
        isAdmin,
        userEmail: user?.email,
        profileRole: profile?.role,
        timestamp: new Date().toISOString()
      })

      // 未認証の場合：即座にログインページにリダイレクト
      if (!isAuthenticated) {
        console.log('❌ 未認証ユーザーの管理者ページアクセス拒否')
        router.replace('/login?redirect_to=/admin')
        return
      }

      // 認証済みだが管理者権限がない場合：404ページに飛ばす
      if (isAuthenticated && !isAdmin) {
        console.log('❌ 非管理者ユーザーの管理者ページアクセス拒否:', {
          userEmail: user?.email,
          role: profile?.role,
          isAuthenticated,
          isAdmin
        })
        
        // セキュリティログ（本番環境では外部ログサービスに送信）
        console.warn('🚨 セキュリティアラート: 非管理者による管理者ページアクセス試行', {
          userId: user?.id,
          userEmail: user?.email,
          attemptedPath: window.location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })

        // 404ページに強制リダイレクト
        notFound()
        return
      }

      // 管理者として認証完了
      if (isAuthenticated && isAdmin) {
        console.log('✅ 管理者アクセス許可決定:', {
          userEmail: user?.email,
          role: profile?.role,
          isAuthenticated,
          isAdmin,
          settingAccessChecked: true
        })
        setAccessChecked(true)
      } else {
        console.log('⏳ 管理者アクセス判定保留:', {
          isAuthenticated,
          isAdmin,
          reason: !isAuthenticated ? '未認証' : !isAdmin ? '非管理者' : '不明'
        })
      }
    } else {
      console.log('⏳ まだローディング中:', { loading })
    }
  }, [loading, isAuthenticated, isAdmin, user, profile, router])

  // accessCheckedの変更を監視
  useEffect(() => {
    console.log('🎯 accessChecked状態変更:', {
      accessChecked,
      willShowContent: accessChecked && isAuthenticated && isAdmin
    })
  }, [accessChecked, isAuthenticated, isAdmin])

  // 二重チェック：プロフィール直接確認
  useEffect(() => {
    if (accessChecked && profile && profile.role !== 'admin') {
      console.error('🚨 セキュリティ違反: プロフィールロール改ざんの可能性')
      notFound()
    }
  }, [accessChecked, profile])

  // 開発者ツール検知とタンパリング防止（本番環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // 開発者ツールの検知
      const detectDevTools = () => {
        const threshold = 160
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          console.warn('🚨 開発者ツール検知')
          // 本番環境では適切な対応（ログアウトなど）を実装
        }
      }

      // 定期的なチェック
      const devToolsInterval = setInterval(detectDevTools, 1000)

      // コンソール操作の警告
      const originalConsole = { ...console }
      Object.keys(console).forEach(key => {
        if (typeof (console as any)[key] === 'function') {
          (console as any)[key] = (...args: any[]) => {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('管理者')) {
              console.warn('🚨 コンソール操作検知: 管理者関連の操作が検出されました')
            }
            return (originalConsole as any)[key](...args)
          }
        }
      })

      return () => {
        clearInterval(devToolsInterval)
        Object.assign(console, originalConsole)
      }
    }
  }, [])

  // アクセス権限の定期再検証（5分ごと）
  useEffect(() => {
    if (accessChecked) {
      const revalidateInterval = setInterval(async () => {
        try {
          // サーバーサイドでの権限再確認
          const response = await fetch('/api/auth/verify-admin', {
            method: 'GET',
            credentials: 'include'
          })
          
          if (!response.ok) {
            console.warn('🚨 権限再検証失敗: セッション無効化')
            router.replace('/login')
          }
        } catch (error) {
          console.error('権限再検証エラー:', error)
        }
      }, 5 * 60 * 1000) // 5分

      return () => clearInterval(revalidateInterval)
    }
  }, [accessChecked, router])

  // 現在の状態をログ出力
  console.log('🛡️ AdminGuard レンダリング状態:', {
    loading,
    accessChecked,
    isAuthenticated,
    isAdmin,
    shouldShowLoading: loading || !accessChecked,
    shouldShowContent: !loading && accessChecked && isAuthenticated && isAdmin
  })

  // ローディング中の表示
  if (loading || !accessChecked) {
    console.log('⏳ AdminGuard: ローディング画面表示中:', {
      loading,
      accessChecked,
      reason: loading ? 'useAuth loading' : 'access not checked'
    })
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">管理者権限を確認中...</p>
          <p className="text-gray-400 text-sm">
            認証情報を検証しています
          </p>
          {/* デバッグ情報（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-left">
              <p><strong>デバッグ情報:</strong></p>
              <p>loading: {loading.toString()}</p>
              <p>accessChecked: {accessChecked.toString()}</p>
              <p>isAuthenticated: {isAuthenticated.toString()}</p>
              <p>isAdmin: {isAdmin.toString()}</p>
              <p>user: {user?.email || 'なし'}</p>
              <p>role: {profile?.role || 'なし'}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 未認証またはローディング中は何も表示しない
  if (!isAuthenticated || !isAdmin) {
    console.log('❌ AdminGuard: アクセス拒否:', {
      isAuthenticated,
      isAdmin,
      userEmail: user?.email
    })
    return null
  }

  console.log('✅ AdminGuard: 管理者コンテンツ表示:', {
    userEmail: user?.email,
    role: profile?.role
  })

  // 管理者として認証済み：管理者コンテンツを表示
  return (
    <>
      {/* 開発環境での管理者ステータス確認 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-green-500 text-white text-xs px-4 py-1 text-center">
          🛡️ 管理者モード | ユーザー: {user?.email} | ロール: {profile?.role}
        </div>
      )}
      {children}
    </>
  )
} 