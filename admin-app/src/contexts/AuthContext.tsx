'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  hasMFA: boolean
  mfaLoading: boolean
  refreshMFAStatus: () => Promise<boolean | undefined>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasMFA, setHasMFA] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  
  // 初期化状態管理
  const initStarted = useRef(false)
  const mfaCheckInProgress = useRef(false)
  
  // 認証結果キャッシュ（高速化のため）
  const [adminCheckCache, setAdminCheckCache] = useState<{
    result: boolean
    timestamp: number
    userId: string
  } | null>(null)
  
  const [mfaCheckCache, setMfaCheckCache] = useState<{
    result: boolean
    timestamp: number
    userId: string
  } | null>(null)
  
  const CACHE_DURATION = 7200000 // 2時間キャッシュ（ユーザビリティとセキュリティのバランス）
  const SESSION_CHECK_INTERVAL = 300000 // 5分毎の軽量セッションチェック
  
  // 軽量セッション有効性チェック
  const isSessionValid = async (): Promise<boolean> => {
    try {
      const { data: session, error } = await supabase.auth.getSession()
      if (error || !session?.session) {
        console.log('[CLIENT] Session invalid or expired')
        return false
      }
      return true
    } catch (error) {
      console.error('[CLIENT] Session check error:', error)
      return false
    }
  }
  
  // 管理者ステータスを確認する関数（キャッシュ付き）
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    // キャッシュチェック
    const now = Date.now()
    if (adminCheckCache && 
        adminCheckCache.userId === userId && 
        (now - adminCheckCache.timestamp) < CACHE_DURATION) {
      
      // 5分毎にセッション有効性の軽量チェック
      if ((now - adminCheckCache.timestamp) > SESSION_CHECK_INTERVAL) {
        const sessionValid = await isSessionValid()
        if (!sessionValid) {
          console.log('[CLIENT] Session expired, clearing cache')
          setAdminCheckCache(null)
          setMfaCheckCache(null)
          return false
        }
      }
      
      console.log('[CLIENT] Using cached admin status:', adminCheckCache.result)
      return adminCheckCache.result
    }
    
    try {
      console.log('[CLIENT] Fetching admin status for user:', userId)
      const startTime = Date.now()
      
      const response = await fetch('/api/auth/check-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })
      
      const endTime = Date.now()
      console.log('[CLIENT] Admin check completed in:', endTime - startTime, 'ms')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      const isAdminUser = result.isAdmin || false
      
      // 結果をキャッシュ
      setAdminCheckCache({
        result: isAdminUser,
        timestamp: now,
        userId: userId
      })
      
      return isAdminUser
    } catch (error) {
      console.error('[CLIENT] Admin check error:', error)
      return false
    }
  }

    // MFAステータスを確認する関数（キャッシュ付き）
  const checkMFAStatus = async (userId: string): Promise<boolean> => {
    // 既に実行中の場合は待機
    if (mfaCheckInProgress.current) {
      console.log('[CLIENT] MFA check already in progress, skipping duplicate request')
      return hasMFA
    }
    
    // キャッシュチェック
    const now = Date.now()
    if (mfaCheckCache && 
        mfaCheckCache.userId === userId && 
        (now - mfaCheckCache.timestamp) < CACHE_DURATION) {
      
      // 5分毎にセッション有効性の軽量チェック
      if ((now - mfaCheckCache.timestamp) > SESSION_CHECK_INTERVAL) {
        const sessionValid = await isSessionValid()
        if (!sessionValid) {
          console.log('[CLIENT] Session expired during MFA check, clearing cache')
          setAdminCheckCache(null)
          setMfaCheckCache(null)
          return false
        }
      }
      
      console.log('[CLIENT] Using cached MFA status:', mfaCheckCache.result)
      return mfaCheckCache.result
    }
    
    try {
      console.log('[CLIENT] Starting MFA status check for user:', userId)
      mfaCheckInProgress.current = true
      setMfaLoading(true)
      
      console.log('[CLIENT] About to call supabase.auth.mfa.listFactors()')
      const startTime = Date.now()
      
      // タイムアウト処理を追加
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('[CLIENT] MFA check timeout after 5 seconds')
          reject(new Error('MFA check timeout'))
        }, 5000) // 5秒でタイムアウト（安定性重視）
      })
      
      const mfaPromise = supabase.auth.mfa.listFactors()
      
      const result = await Promise.race([mfaPromise, timeoutPromise]) as any
      const { data: factors, error: mfaError } = result
      
      const endTime = Date.now()
      console.log('[CLIENT] MFA listFactors completed in:', endTime - startTime, 'ms')
      console.log('[CLIENT] MFA listFactors result:', { factors, error: mfaError })
      
      if (mfaError) {
        console.error('[CLIENT] MFA listFactors error:', mfaError)
        setHasMFA(false)
        return false
      }
      
      const totpFactor = factors?.totp?.find(factor =>
        factor.factor_type === 'totp' && factor.status === 'verified'
      )
      const mfaEnabled = !!totpFactor
      console.log('[CLIENT] MFA status result:', { userId, mfaEnabled, totpFactor })
      setHasMFA(mfaEnabled)
      // 結果をキャッシュ
      setMfaCheckCache({
        result: mfaEnabled,
        timestamp: Date.now(),
        userId: userId
      })
      
      return mfaEnabled
    } catch (error) {
      console.error('[CLIENT] MFA status check error:', error)
      if (error.message === 'MFA check timeout') {
        console.error('[CLIENT] MFA check timed out - setting hasMFA to false')
      }
      setHasMFA(false)
      
      // エラー時は結果をキャッシュしない（falseで固定キャッシュしない）
      return false
    } finally {
      console.log('[CLIENT] MFA status check completed, setting mfaLoading to false')
      mfaCheckInProgress.current = false
      setMfaLoading(false)
    }
  }

  // MFAステータスを再取得する関数
  const refreshMFAStatus = async () => {
    if (user) {
      // キャッシュをクリアして最新データを取得
      console.log('[CLIENT] Refreshing MFA status - clearing cache')
      mfaCheckInProgress.current = false // 進行中フラグもリセット
      setMfaCheckCache(null)
      setAdminCheckCache(null) // 管理者キャッシュもクリア
      const result = await checkMFAStatus(user.id)
      console.log('[CLIENT] MFA status refreshed:', result)
      return result
    }
  }

  // ログアウト関数
  const signOut = async () => {
    try {
      console.log('[CLIENT] Signing out...')
      await supabase.auth.signOut()
      setUser(null)
      setIsAdmin(false)
      setHasMFA(false)
      // キャッシュをクリア
      setAdminCheckCache(null)
      setMfaCheckCache(null)
    } catch (error) {
      console.error('[CLIENT] Sign out error:', error)
    }
  }

  useEffect(() => {
    // 初期化の重複実行を防ぐ
    if (initStarted.current) {
      console.log('[CLIENT] AuthProvider initialization already started, skipping duplicate')
      return
    }
    
    initStarted.current = true
    console.log('[CLIENT] useEffect for AuthProvider started')
    console.log('[CLIENT] Environment variables check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV || 'NOT SET'
    })
    
    // ▼▼▼ ログ3: 初期セッション取得 ▼▼▼
    const getInitialSession = async () => {
      console.log('[CLIENT] Starting getInitialSession...')
      
      // 最初に必ず 2 秒後にローディングを終了させるタイマーを設定
      const forceFinishTimer = setTimeout(() => {
        console.log('[CLIENT] Force finishing loading state')
        setLoading(false)
      }, 2000)
      
      try {
        let session = null
        let cookieSessionFound = false
        
        // まず cookie から高速取得を試行
        if (typeof window !== 'undefined') {
          try {
            console.log('[CLIENT] Trying to extract session from cookie first...')
            console.log('[CLIENT] Current localStorage keys:', Object.keys(localStorage))
            console.log('[CLIENT] Looking for quicklabel-auth-token in localStorage:', localStorage.getItem('quicklabel-auth-token'))
            console.log('[CLIENT] All cookies:', document.cookie)
            
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith('quicklabel-auth-token='))
              ?.split('=')[1]
            
            console.log('[CLIENT] Cookie value exists:', !!cookieValue)
            
            if (cookieValue && cookieValue.startsWith('base64-')) {
              const base64Data = cookieValue.replace('base64-', '')
              const decodedData = atob(base64Data)
              const cookieSession = JSON.parse(decodedData)
              
              if (cookieSession.access_token && cookieSession.user) {
                console.log('[CLIENT] Session extracted from cookie:', cookieSession.user.email)
                session = cookieSession
                cookieSessionFound = true
              }
            } else {
              console.log('[CLIENT] No valid base64 auth cookie found')
            }
          } catch (cookieError) {
            console.log('[CLIENT] Failed to extract session from cookie:', cookieError)
          }
        }
        
        // Supabaseの標準getSession()も試行
        try {
          console.log('[CLIENT] Trying Supabase standard getSession()...')
          const { data: { session: supabaseSession }, error: supabaseError } = await supabase.auth.getSession()
          console.log('[CLIENT] Supabase getSession result:', {
            hasSession: !!supabaseSession,
            userEmail: supabaseSession?.user?.email,
            error: supabaseError
          })
          
          if (supabaseError) {
            console.error('[CLIENT] Supabase getSession error details:', supabaseError)
          }
          
          if (!cookieSessionFound && supabaseSession) {
            console.log('[CLIENT] Using Supabase standard session')
            session = supabaseSession
            cookieSessionFound = true
          }
        } catch (supabaseSessionError) {
          console.error('[CLIENT] Supabase getSession error:', supabaseSessionError)
        }
        
        // Cookie からセッションが見つかった場合、すぐに状態を更新
        if (cookieSessionFound && session) {
          console.log('[CLIENT] Setting user from cookie session')
          setUser(session.user)
          
          // 管理者権限とMFAステータスをチェック
          try {
            console.log('[CLIENT] Starting profile check for user:', session.user.id)
            
            // 削除：ハードコード部分を削除してプロフィールクエリをテスト
            
            // キャッシュを活用した高速認証チェック
            const isAdminUser = await checkAdminStatus(session.user.id)
            setIsAdmin(isAdminUser)
            console.log('[CLIENT] Admin check from cookie session (cached):', isAdminUser)
            
            // 管理者の場合のみMFAステータスをチェック
            if (isAdminUser) {
              const mfaStatus = await checkMFAStatus(session.user.id)
              setHasMFA(mfaStatus)
            } else {
              setHasMFA(false)
            }
          } catch (error) {
            console.error('[CLIENT] プロフィール取得エラー（Cookie）:', error)
            setIsAdmin(false)
            setHasMFA(false)
          }
          
          clearTimeout(forceFinishTimer)
          setLoading(false)
          return
        }
        
        console.log('[CLIENT] No cookie session, setting as logged out')
        setUser(null)
        setIsAdmin(false)
        
      } catch (error) {
        console.error('[CLIENT] Error in getInitialSession:', error)
        setUser(null)
        setIsAdmin(false)
      } finally {
        // 必ずローディング状態を終了
        console.log('[CLIENT] Initial session loading completed')
        clearTimeout(forceFinishTimer)
        setLoading(false)
      }
    }

    getInitialSession()

    // ▼▼▼ ログ4: 認証状態変化の監視 ▼▼▼
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[CLIENT] Auth state changed! Event: ${event}, User:`, session?.user ?? null);
        console.log('認証状態変化:', event, session?.user?.email || 'ユーザーなし')
        
        // ログアウトイベントの詳細ログ
        if (event === 'SIGNED_OUT') {
          console.log('[CLIENT] User signed out detected in AuthContext')
        }
        
        setUser(session?.user ?? null)
        
        // ユーザーの管理者権限とMFAステータスをチェック
        if (session?.user) {
          try {
            console.log('[CLIENT] Starting profile check (auth state change) for user:', session.user.id)
            
            // 削除：ハードコード部分を削除してプロフィールクエリをテスト
            
            // キャッシュを活用した高速認証チェック（auth state change）
            const isAdminUser = await checkAdminStatus(session.user.id)
            setIsAdmin(isAdminUser)
            console.log('[CLIENT] Admin check (auth state change, cached):', isAdminUser)
            
            // 管理者の場合のみMFAステータスをチェック
            if (isAdminUser) {
              const mfaStatus = await checkMFAStatus(session.user.id)
              setHasMFA(mfaStatus)
            } else {
              setHasMFA(false)
            }
          } catch (error) {
            console.error('[CLIENT] プロフィール取得エラー (auth state change):', error)
            setIsAdmin(false)
            setHasMFA(false)
          }
        } else {
          setIsAdmin(false)
          setHasMFA(false)
        }
        
        // INITIAL_SESSION以外の場合のみローディングを終了
        if (event !== 'INITIAL_SESSION') {
          setLoading(false)
        }
      }
    )

    // クリーンアップ関数
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ▼▼▼ ログ5: プロバイダーの値 ▼▼▼
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    hasMFA,
    mfaLoading,
    refreshMFAStatus,
    signOut
  }
  
  // 重要な認証状態変化のみログ出力（ログスパム防止）
  const prevState = useRef<{isAuthenticated: boolean; isAdmin: boolean; hasMFA: boolean; loading: boolean; mfaLoading: boolean} | null>(null)
  
  useEffect(() => {
    const isAuthenticated = !!user
    const currentState = {
      isAuthenticated,
      isAdmin,
      hasMFA,
      loading,
      mfaLoading
    }
    
    if (!prevState.current || 
        prevState.current.isAuthenticated !== currentState.isAuthenticated ||
        prevState.current.isAdmin !== currentState.isAdmin ||
        prevState.current.hasMFA !== currentState.hasMFA ||
        (prevState.current.loading && !currentState.loading) ||
        (prevState.current.mfaLoading && !currentState.mfaLoading)) {
      
      console.log('[CLIENT] Significant auth state change:', {
        isAuthenticated: currentState.isAuthenticated,
        isAdmin: currentState.isAdmin,
        hasMFA: currentState.hasMFA,
        loading: currentState.loading,
        mfaLoading: currentState.mfaLoading,
        userEmail: user?.email
      })
    }
    
    prevState.current = currentState
  }, [user, isAdmin, hasMFA, loading, mfaLoading])

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