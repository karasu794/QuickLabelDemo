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
  isEmailVerified: boolean
  authStatus: AuthStatus
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialSession: Session | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  // initialSession は参考値。最終状態は getUser と購読で確定させる
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  // 初期は loading=true とし、初回の getUser 完了で解除
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
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        // 非同期で管理者権限チェックを実行（UIをブロックしない）
        const adminCheckPromise = async () => {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role,is_admin')
              .eq('id', session.user.id)
              .single()

            if (error) {
              console.error('[AUTH_CONTEXT] Error fetching profile:', error)
              setIsAdmin(false)
            } else {
              const p: any = profile || {}
              const roleNormalized = String(p.role ?? '').trim().toLowerCase()
              const isUserAdmin = p.is_admin === true || roleNormalized === 'admin'
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
    
    // 初回に getUser でサーバーCookieと同期されたセッションを取得し、状態を確定
    const init = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        if (error) {
          setUser(null)
          setAuthStatus('UNAUTHENTICATED')
          setIsAdmin(false)
        } else {
          setUser(currentUser ?? null)
          setAuthStatus(currentUser ? 'AUTHENTICATED' : 'UNAUTHENTICATED')
          // 管理者チェック（非同期）
          if (currentUser) {
            ;(async () => {
              try {
                const { data: profile, error: pErr } = await supabase
                  .from('profiles')
                  .select('role,is_admin')
                  .eq('id', currentUser.id)
                  .single()
                if (pErr) {
                  setIsAdmin(false)
                } else {
                  const p: any = profile || {}
                  const roleNormalized = String(p.role ?? '').trim().toLowerCase()
                  const isUserAdmin = p.is_admin === true || roleNormalized === 'admin'
                  setIsAdmin(isUserAdmin)
                }
              } catch {
                setIsAdmin(false)
              }
            })()
          } else {
            setIsAdmin(false)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    init()

    // Supabaseの認証状態変更リスナーを設定（安定化されたコールバックを使用）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

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
    isEmailVerified: !!user?.email_confirmed_at,
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