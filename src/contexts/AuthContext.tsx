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
        const userId = initialSession.user.id
        
        try {
          console.log('[CLIENT] 🔍 ADMIN DEBUG - Querying profiles table for admin role...')
          console.log('[CLIENT] 🔍 ADMIN DEBUG - User ID for query:', userId)
          console.log('[CLIENT] 🔍 ADMIN DEBUG - Query details:', {
            table: 'profiles',
            select: 'role',
            filter: `id.eq.${userId}`,
            operation: 'single()'
          })
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
          
          // ★★★ 詳細なSupabaseレスポンス分析 ★★★
          if (error) {
            console.error('[CLIENT] 🚨 ADMIN DEBUG - Supabase returned error:', {
              errorObject: error,
              errorMessage: error.message,
              errorCode: error.code,
              errorDetails: error.details,
              errorHint: error.hint,
              userId: userId,
              timestamp: new Date().toISOString()
            })
          }
          
          console.log('[CLIENT] ✅ ADMIN DEBUG - Profile query SUCCESS - Full response:', {
            dataObject: profile,
            dataType: typeof profile,
            dataKeys: profile ? Object.keys(profile) : 'null',
            roleValue: profile?.role,
            roleType: typeof profile?.role,
            isAdmin: profile?.role === 'admin',
            adminCheckResult: {
              'profile?.role': profile?.role,
              'exact match "admin"': profile?.role === 'admin',
              'loose match "admin"': String(profile?.role).toLowerCase() === 'admin'
            },
            userId: userId,
            timestamp: new Date().toISOString()
          })
          
          const isAdminResult = profile?.role === 'admin'
          console.log('[CLIENT] 🎯 ADMIN DEBUG - Final admin status decision:', {
            isAdmin: isAdminResult,
            reasoning: `profile?.role (${profile?.role}) === 'admin' → ${isAdminResult}`,
            willSetIsAdmin: isAdminResult
          })
          
          setIsAdmin(isAdminResult)
          
        } catch (error) {
          console.error('[CLIENT] 🚨 ADMIN DEBUG - UNEXPECTED error in admin role check:', {
            errorObject: error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : 'No stack trace',
            errorType: typeof error,
            userId: userId,
            timestamp: new Date().toISOString()
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
        
        // ========== ADMIN DEBUG: 管理者権限チェック（onAuthStateChange内） ==========
        if (session?.user) {
          const userId = session.user.id
          console.log('[CLIENT] 🔍 ADMIN DEBUG - Checking admin role for auth state change...')
          console.log('[CLIENT] 🔍 ADMIN DEBUG - Auth event context:', {
            event: event,
            userId: userId,
            sessionExpiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry'
          })
          
          try {
            console.log('[CLIENT] 🔍 ADMIN DEBUG - Executing profiles query for auth state change...')
            console.log('[CLIENT] 🔍 ADMIN DEBUG - Query parameters:', {
              table: 'profiles',
              select: 'role', 
              filter: `id.eq.${userId}`,
              operation: 'single()',
              triggerEvent: event
            })
            
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .single()
            
            // ★★★ 詳細なSupabaseレスポンス分析 ★★★
            if (error) {
              console.error('[CLIENT] 🚨 ADMIN DEBUG - Auth change query error:', {
                errorObject: error,
                errorMessage: error.message,
                errorCode: error.code,
                errorDetails: error.details,
                errorHint: error.hint,
                userId: userId,
                event: event,
                timestamp: new Date().toISOString()
              })
            }
            
            console.log('[CLIENT] ✅ ADMIN DEBUG - Auth change query SUCCESS - Full response:', {
              dataObject: profile,
              dataType: typeof profile,
              dataKeys: profile ? Object.keys(profile) : 'null',
              roleValue: profile?.role,
              roleType: typeof profile?.role,
              isAdmin: profile?.role === 'admin',
              adminCheckResult: {
                'profile?.role': profile?.role,
                'exact match "admin"': profile?.role === 'admin',
                'loose match "admin"': String(profile?.role).toLowerCase() === 'admin'
              },
              userId: userId,
              event: event,
              timestamp: new Date().toISOString()
            })
            
            const isAdminResult = profile?.role === 'admin'
            console.log('[CLIENT] 🎯 ADMIN DEBUG - Auth change admin status decision:', {
              isAdmin: isAdminResult,
              reasoning: `profile?.role (${profile?.role}) === 'admin' → ${isAdminResult}`,
              willSetIsAdmin: isAdminResult,
              triggerEvent: event
            })
            
            setIsAdmin(isAdminResult)
            
          } catch (error) {
            console.error('[CLIENT] 🚨 ADMIN DEBUG - UNEXPECTED error in auth change admin role check:', {
              errorObject: error,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorStack: error instanceof Error ? error.stack : 'No stack trace',
              errorType: typeof error,
              userId: userId,
              event: event,
              timestamp: new Date().toISOString()
            })
            setIsAdmin(false)
          }
        } else {
          console.log('[CLIENT] 🔍 ADMIN DEBUG - No session user in auth change, clearing admin status')
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

  // ========== ADMIN DEBUG: 管理者権限状態の詳細出力 ==========
  console.log('[CLIENT] 🎯 ADMIN DEBUG - Current Admin Status Summary:', {
    isAdmin: isAdmin,
    isAdminType: typeof isAdmin,
    userExists: !!user,
    userId: user?.id || 'no user',
    authStatus: authStatus,
    adminStateSource: 'React state (isAdmin)',
    stateUpdatedAt: new Date().toISOString()
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