'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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
  // Supabaseからの初回認証状態イベントを受け取ったかを追跡
  const [hasReceivedInitialAuthEvent, setHasReceivedInitialAuthEvent] = useState(false)

  useEffect(() => {
    console.log('[AUTH_CONTEXT] Initializing auth provider with session:', { hasInitialSession: !!initialSession })
    
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
            const isUserAdmin = profile?.role === 'admin'
            setIsAdmin(isUserAdmin)
          }
          
          console.log('[AUTH_CONTEXT] Initial session admin check completed, but loading remains true until first auth event')
        } catch (error) {
          console.error('Error in admin check:', error)
          setIsAdmin(false)
        }
      }

      checkAdminRole()
    }
    
    // 初期セッションの有無に関わらず、onAuthStateChangeの初回イベントまでloading=trueを維持
    console.log('[AUTH_CONTEXT] Waiting for first onAuthStateChange event before setting loading=false')

    // Supabaseの認証状態変更リスナーを設定
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH_CONTEXT] Auth state change event:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        isFirstAuthEvent: !hasReceivedInitialAuthEvent
      })
      
      // 認証状態を更新
      setUser(session?.user ?? null)
      setAuthStatus(session ? 'AUTHENTICATED' : 'UNAUTHENTICATED')
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // 管理者権限チェック
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (error) {
            console.error('Error fetching profile:', error)
            setIsAdmin(false)
          } else {
            const isUserAdmin = profile?.role === 'admin'
            setIsAdmin(isUserAdmin)
          }
        } catch (error) {
          console.error('Error in admin check:', error)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      
      // 初回認証イベントを受け取った場合のみloading状態を解除
      if (!hasReceivedInitialAuthEvent) {
        setHasReceivedInitialAuthEvent(true)
        setLoading(false)
        console.log('[AUTH_CONTEXT] First auth state event received, loading set to false:', {
          event,
          finalAuthStatus: session ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
        })
      } else {
        console.log('[AUTH_CONTEXT] Subsequent auth state event, loading already false:', { event })
      }
    })

    return () => subscription.unsubscribe()
  }, [initialSession, hasReceivedInitialAuthEvent])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // サインアウト時は即座に状態をリセット（loading状態は必要なし）
      setUser(null)
      setIsAdmin(false)
      setAuthStatus('UNAUTHENTICATED')
      setHasReceivedInitialAuthEvent(false) // 次回の認証チェックのためにリセット
      console.log('[AUTH_CONTEXT] Sign out completed, states reset')
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