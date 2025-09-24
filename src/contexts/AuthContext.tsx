'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// 認証状態の型定義
type AuthStatus = 'AUTHENTICATED' | 'UNAUTHENTICATED'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  authStatus: AuthStatus
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialSession: Session | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  // initialSessionを基に、userとauthStatusの初期値を設定
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  // 競合状態解消のため、初期状態でloading=trueに設定し、onAuthStateChangeの初回イベントまで待機
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialSession ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
  )
  
  // useRefを使用してクロージャ問題を回避
  const hasReceivedInitialAuthEventRef = useRef(false)
  
  // 認証状態変更コールバックを安定化
  const handleAuthStateChange = useCallback(async (event: any, session: Session | null) => {
    // デバッグログ（必要時のみ有効化）
    if (process.env.NODE_ENV === 'development' && false) {
      console.log('[AUTH_CONTEXT] Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user
      })
    }
    
    try {
      // 認証状態を更新（最重要処理）
      setUser(session?.user ?? null)
      setAuthStatus(session ? 'AUTHENTICATED' : 'UNAUTHENTICATED')
      
      // 初回認証イベントの追跡
      if (!hasReceivedInitialAuthEventRef.current) {
        hasReceivedInitialAuthEventRef.current = true
        // 初回認証イベントのログ（必要時のみ有効化）
        if (process.env.NODE_ENV === 'development' && false) {
          console.log('[AUTH_CONTEXT] First auth event:', {
            event,
            finalAuthStatus: session ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
          })
        }
      }
      
      // loading状態を即座に解除（管理者権限チェックより優先）
      setLoading(false)
      
      // 管理者権限チェック（非ブロッキング、UIの表示に影響させない）
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // 非同期で管理者権限チェックを実行（UIをブロックしない）
        const adminCheckPromise = async () => {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()

            if (error) {
              console.error('[AUTH_CONTEXT] Error fetching profile:', error)
              setIsAdmin(false)
            } else {
              const isUserAdmin = !!profile && (profile as any).role === 'admin'
              setIsAdmin(isUserAdmin)
            }
          } catch (error) {
            console.error('[AUTH_CONTEXT] Error in admin check:', error)
            setIsAdmin(false)
          }
        }
        
        // 非同期実行（awaitしない）
        adminCheckPromise()
      } else {
        setIsAdmin(false)
      }
      
    } catch (error) {
      console.error('[AUTH_CONTEXT] Critical error in auth state change:', error)
      // エラーが発生してもloading状態を解除
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 初期化ログ（必要時のみ有効化）
    if (process.env.NODE_ENV === 'development' && false) {
      console.log('[AUTH_CONTEXT] Initializing auth provider with session:', { hasInitialSession: !!initialSession })
    }
    
    // 初期セッションがある場合の管理者権限チェック（ただしloading状態は維持）
    if (initialSession?.user) {
      const userId = initialSession.user.id
      
      const checkAdminRole = async () => {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

          if (error) {
            console.error('Error fetching profile:', error)
            setIsAdmin(false)
          } else {
            const isUserAdmin = !!profile && (profile as any).role === 'admin'
            setIsAdmin(isUserAdmin)
          }
          
        } catch (error) {
          console.error('Error in admin check:', error)
          setIsAdmin(false)
        }
      }

      checkAdminRole()
    }

    // Supabaseの認証状態変更リスナーを設定（安定化されたコールバックを使用）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => subscription.unsubscribe()
  }, [initialSession, handleAuthStateChange])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // サインアウト時は即座に状態をリセット（loading状態は必要なし）
      setUser(null)
      setIsAdmin(false)
      setAuthStatus('UNAUTHENTICATED')
      hasReceivedInitialAuthEventRef.current = false // 次回の認証チェックのためにリセット
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    authStatus,
    signOut,
  }

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