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
  const [loading, setLoading] = useState(false) // サーバーサイド初期化により、初期状態でloadingは不要
  const [isAdmin, setIsAdmin] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialSession ? 'AUTHENTICATED' : 'UNAUTHENTICATED'
  )

  useEffect(() => {
    // 初期セッションがある場合の管理者権限チェック
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
            return
          }

          const isUserAdmin = profile?.role === 'admin'
          setIsAdmin(isUserAdmin)
        } catch (error) {
          console.error('Error in admin check:', error)
          setIsAdmin(false)
        }
      }

      checkAdminRole()
    }

    // Supabaseの認証状態変更リスナーを設定
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
            return
          }

          const isUserAdmin = profile?.role === 'admin'
          setIsAdmin(isUserAdmin)
        } catch (error) {
          console.error('Error in admin check:', error)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [initialSession])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setIsAdmin(false)
      setAuthStatus('UNAUTHENTICATED')
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