'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// 認証状態の型定義（ステートマシンパターン）
type AuthStatus = 'AUTHENTICATING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'

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
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  // 新しく追加：認証状態を管理するステート（初期値は認証処理中）
  const [authStatus, setAuthStatus] = useState<AuthStatus>('AUTHENTICATING')

  useEffect(() => {
    console.log('[CLIENT] useEffect for AuthProvider started')
    
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
        
        // Cookie からセッションが見つかった場合、すぐに状態を更新
        if (cookieSessionFound && session) {
          console.log('[CLIENT] Setting user from cookie session')
          setUser(session.user)
          setIsAdmin(false) // 簡略化：管理者チェックは省略
          // ステートマシン：認証済み状態に変更
          setAuthStatus('AUTHENTICATED')
          clearTimeout(forceFinishTimer)
          setLoading(false)
          return
        }
        
        console.log('[CLIENT] No cookie session, setting as logged out')
        setUser(null)
        setIsAdmin(false)
        // ステートマシン：未認証状態に変更
        setAuthStatus('UNAUTHENTICATED')
        
      } catch (error) {
        console.error('[CLIENT] Error in getInitialSession:', error)
        setUser(null)
        setIsAdmin(false)
        // ステートマシン：エラー時も未認証状態に変更
        setAuthStatus('UNAUTHENTICATED')
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
        
        // ステートマシン：セッションの有無に応じて認証状態を更新
        if (session?.user) {
          setAuthStatus('AUTHENTICATED')
          
          // ユーザーの管理者権限をチェック
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
          setAuthStatus('UNAUTHENTICATED')
          setIsAdmin(false)
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