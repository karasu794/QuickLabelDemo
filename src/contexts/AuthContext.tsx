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
  // ========== VERCEL DEBUG: 初期化情報 ==========
  console.log('[CLIENT] 🔍 VERCEL DEBUG - AuthProvider Initialization:', {
    hasInitialSession: !!initialSession,
    initialUser: initialSession?.user ? {
      id: initialSession.user.id,
      email: initialSession.user.email,
      emailConfirmed: initialSession.user.email_confirmed_at,
      lastSignIn: initialSession.user.last_sign_in_at,
      createdAt: initialSession.user.created_at,
      updatedAt: initialSession.user.updated_at
    } : null,
    initialSessionDetails: initialSession ? {
      hasAccessToken: !!initialSession.access_token,
      tokenLength: initialSession.access_token?.length || 0,
      hasRefreshToken: !!initialSession.refresh_token,
      expiresAt: initialSession.expires_at ? new Date(initialSession.expires_at * 1000).toISOString() : 'no expiry',
      tokenType: initialSession.token_type,
      isExpired: initialSession.expires_at ? Date.now() / 1000 > initialSession.expires_at : 'unknown'
    } : null,
    clientEnvironment: {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      timestamp: new Date().toISOString()
    }
  })

  // initialSessionを基に、userとauthStatusの初期値を設定
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [loading, setLoading] = useState(false) // サーバーサイド初期化により、初期状態でloadingは不要
  const [isAdmin, setIsAdmin] = useState(false)
  // 新しく追加：認証状態を管理するステート（サーバーから渡された情報で初期化）
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialSession ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
  )

  useEffect(() => {
    console.log('[CLIENT] 🔍 VERCEL DEBUG - AuthProvider useEffect started with session:', initialSession?.user?.email || 'no user')
    
    // ========== VERCEL DEBUG: 初期管理者権限チェック ==========
    if (initialSession?.user) {
      console.log('[CLIENT] 🔍 VERCEL DEBUG - Starting initial admin role check for user:', initialSession.user.id)
      
      const checkAdminRole = async () => {
        try {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - Querying profiles table for admin role...')
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', initialSession.user.id)
            .single()
          
          console.log('[CLIENT] 🔍 VERCEL DEBUG - Admin role query result:', {
            profileData: profile,
            error: error?.message || 'no error',
            isAdmin: profile?.role === 'admin',
            userId: initialSession.user.id,
            timestamp: new Date().toISOString()
          })
          
          setIsAdmin(profile?.role === 'admin')
        } catch (error) {
          console.error('[CLIENT] 🔍 VERCEL DEBUG - Admin role check error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            userId: initialSession.user.id
          })
          setIsAdmin(false)
        }
      }
      
      checkAdminRole()
    } else {
      console.log('[CLIENT] 🔍 VERCEL DEBUG - No initial session user, skipping admin role check')
    }

    // ========== VERCEL DEBUG: 認証状態変化リスナー設定 ==========
    console.log('[CLIENT] 🔍 VERCEL DEBUG - Setting up onAuthStateChange listener...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ========== VERCEL DEBUG: 認証イベント詳細 ==========
        console.log('[CLIENT] 🔍 VERCEL DEBUG - Auth State Change Event Details:', {
          event: event,
          eventTimestamp: new Date().toISOString(),
          hasSession: !!session,
          sessionDetails: session ? {
            userId: session.user?.id,
            userEmail: session.user?.email,
            hasAccessToken: !!session.access_token,
            tokenLength: session.access_token?.length || 0,
            hasRefreshToken: !!session.refresh_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry',
            isExpired: session.expires_at ? Date.now() / 1000 > session.expires_at : 'unknown',
            tokenType: session.token_type
          } : null,
          previousAuthStatus: authStatus,
          url: typeof window !== 'undefined' ? window.location.href : 'SSR'
        })
        
        if (event === 'SIGNED_OUT') {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - User signed out event detected')
        } else if (event === 'SIGNED_IN') {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - User signed in event detected')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - Token refresh event detected')
        }
        
        setUser(session?.user ?? null)
        setAuthStatus(session ? 'AUTHENTICATED' : 'UNAUTHENTICATED')
        
        // ========== VERCEL DEBUG: 管理者権限チェック（onAuthStateChange内） ==========
        if (session?.user) {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - Checking admin role for auth state change...')
          
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
            
            console.log('[CLIENT] 🔍 VERCEL DEBUG - Auth change admin role result:', {
              profileData: profile,
              error: error?.message || 'no error',
              isAdmin: profile?.role === 'admin',
              userId: session.user.id,
              event: event
            })
            
            setIsAdmin(profile?.role === 'admin')
          } catch (error) {
            console.error('[CLIENT] 🔍 VERCEL DEBUG - Auth change admin role error:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : 'No stack trace',
              userId: session.user.id,
              event: event
            })
            setIsAdmin(false)
          }
        } else {
          console.log('[CLIENT] 🔍 VERCEL DEBUG - No session user, clearing admin status')
          setIsAdmin(false)
        }
      }
    )

    // クリーンアップ関数
    return () => {
      subscription.unsubscribe()
    }
  }, [initialSession])

  // ========== VERCEL DEBUG: プロバイダー値出力 ==========
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    // 新しく追加：ステートマシンの状態を公開
    authStatus
  }
  
  console.log('[CLIENT] 🔍 VERCEL DEBUG - AuthProvider Final Value:', {
    hasUser: !!user,
    userDetails: user ? {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at,
      lastSignIn: user.last_sign_in_at
    } : null,
    loading: loading,
    isAuthenticated: !!user,
    isAdmin: isAdmin,
    authStatus: authStatus,
    timestamp: new Date().toISOString(),
    componentRenderCount: 'tracked in console'
  });

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