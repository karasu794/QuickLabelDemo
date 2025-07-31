'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

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
        
        // ユーザーの管理者権限をチェック
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
    isAdmin
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