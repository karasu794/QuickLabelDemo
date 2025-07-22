import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  contact_name: string | null
  company_name: string | null
  role?: string | null
  full_name?: string | null
  phone_number?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

// シンプルなプロフィール取得関数
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('📋 プロフィール取得開始:', userId)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📋 プロフィールが見つかりません（新規ユーザー）:', userId)
        return null
      }
      console.error('📋 プロフィール取得エラー:', error)
      return null
    }

    if (data) {
      // データベースから返される実際のデータを安全に取り扱う
      const rawData = data as any
      
      const profile: UserProfile = {
        id: rawData.id || userId,
        email: rawData.email || null,
        contact_name: rawData.contact_name || rawData.full_name || null,
        company_name: rawData.company_name || null,
        role: rawData.role || 'user',
        full_name: rawData.full_name || null,
        phone_number: rawData.phone_number || null,
        address: rawData.address || null,
        postal_code: rawData.postal_code || null,
        city: rawData.city || null,
        state: rawData.state || null,
        country: rawData.country || null
      }

      console.log('✅ プロフィール取得成功:', { 
        userId, 
        role: profile.role,
        email: profile.email,
        fullName: profile.full_name,
        isAdmin: profile.role === 'admin'
      })
      return profile
    }

    return null
  } catch (error) {
    console.error('📋 プロフィール取得例外:', error)
    return null
  }
}

export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
    isAdmin: false
  })

  // 認証状態を更新する関数
  const updateAuthState = async (user: User | null) => {
    console.log('🔄 認証状態更新開始:', user ? user.email : 'ログアウト')

    if (user) {
      // ユーザーがいる場合、プロフィールを取得
      const profile = await fetchUserProfile(user.id)
      const isAdmin = profile?.role === 'admin'

      console.log('✅ 認証状態更新完了:', {
        userEmail: user.email,
        role: profile?.role,
        isAdmin,
        profileId: profile?.id
      })

      setAuthState({
        user,
        profile,
        loading: false,
        isAuthenticated: true,
        isAdmin
      })
    } else {
      // ユーザーがいない場合
      console.log('🚫 認証状態更新: ログアウト状態')
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        isAuthenticated: false,
        isAdmin: false
      })
    }
  }

  useEffect(() => {
    let isMounted = true
    let authSubscription: any = null

    const initializeAuth = async () => {
      try {
        console.log('🎯 認証状態初期化開始')

        // 現在のセッションを取得
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ セッション取得エラー:', error)
        }

        console.log('📡 初期セッション状態:', {
          hasSession: !!session,
          userEmail: session?.user?.email,
          userId: session?.user?.id
        })

        // マウント済みの場合のみ状態を更新
        if (isMounted) {
          await updateAuthState(session?.user || null)
        }
      } catch (error) {
        console.error('❌ 認証初期化エラー:', error)
        if (isMounted) {
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    // 認証状態変更を監視
    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📡 認証状態変更検出:', {
        event,
        userEmail: session?.user?.email || 'ユーザーなし',
        userId: session?.user?.id || 'なし'
      })
      
      if (isMounted) {
        await updateAuthState(session?.user || null)
      }
    })

    // 初期化実行
    initializeAuth()

    // クリーンアップ
    return () => {
      console.log('🧹 useAuth クリーンアップ実行')
      isMounted = false
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe()
      }
    }
  }, []) // 空の依存配列で一度だけ実行

  // デバッグログ（詳細な値を表示）
  useEffect(() => {
    console.log('🎭 useAuth状態変更:', {
      loading: authState.loading,
      isAuthenticated: authState.isAuthenticated,
      isAdmin: authState.isAdmin,
      userEmail: authState.user?.email || '未ログイン',
      profileRole: authState.profile?.role || '未設定',
      profileId: authState.profile?.id || 'なし'
    })
  }, [authState])

  return authState
} 