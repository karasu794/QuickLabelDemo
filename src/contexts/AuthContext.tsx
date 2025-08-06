'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// 認証状態の型定義（サーバーサイド初期化により'AUTHENTICATING'は不要）
type AuthStatus = 'AUTHENTICATED' | 'UNAUTHENTICATED'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  // 新しく追加：明確な認証状態
  authStatus: AuthStatus
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialSession: Session | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  // initialSessionを基に、userとauthStatusの初期値を設定
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [loading, setLoading] = useState(false) // サーバーサイド初期化により、初期状態でloadingは不要
  const [isAdmin, setIsAdmin] = useState(false)
  // 新しく追加：認証状態を管理するステート（サーバーから渡された情報で初期化）
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialSession ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
  )

  useEffect(() => {
    console.log('[CLIENT] AuthProvider initialized with server session:', initialSession?.user?.email || 'no user')
    
    // 初期セッション情報から管理者権限を確認
    if (initialSession?.user) {
      const checkAdminRole = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', initialSession.user.id)
            .single()
          
          setIsAdmin(profile?.role === 'admin')
          console.log('[CLIENT] Initial admin role set:', profile?.role === 'admin')
        } catch (error) {
          console.error('初期プロフィール取得エラー:', error)
          setIsAdmin(false)
        }
      }
      
      checkAdminRole()
    }

    // 初期ロード後の認証状態の変化を監視するリスナー
    // ログイン・ログアウト・別タブでのセッション切れ等を検知
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[CLIENT] Auth state changed! Event: ${event}, User:`, session?.user?.email || 'no user');
        
        if (event === 'SIGNED_OUT') {
          console.log('[CLIENT] User signed out detected in AuthContext')
        }
        
        setUser(session?.user ?? null)
        setAuthStatus(session ? 'AUTHENTICATED' : 'UNAUTHENTICATED')
        
        // 管理者権限をチェック
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            setIsAdmin(profile?.role === 'admin')
          } catch (error) {
            console.error('プロフィール取得エラー:', error)
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }
      }
    )

    // クリーンアップ関数
    return () => {
      subscription.unsubscribe()
    }
  }, [initialSession])

  // ▼▼▼ ログ5: プロバイダーの値 ▼▼▼
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    // 新しく追加：ステートマシンの状態を公開
    authStatus
  }
  console.log('[CLIENT] AuthProvider value:', value);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuthカスタムフック
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 