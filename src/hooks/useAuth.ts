import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  contact_name: string | null
  company_name: string | null
  role?: string | null
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // 初期認証状態を取得
    const getInitialAuth = async () => {
      try {
        const { data: { user: initialUser }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('認証状態取得エラー:', error)
          setUser(null)
          setProfile(null)
          return
        }

        setUser(initialUser)

        // ユーザーが存在する場合、プロフィール情報を取得
        if (initialUser) {
          await fetchUserProfile(initialUser.id)
        }
      } catch (error) {
        console.error('初期認証状態取得エラー:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    // プロフィール情報を取得する関数
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, contact_name, company_name')
          .eq('id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // データが見つからない場合は無視
          console.error('プロフィール取得エラー:', error)
          return
        }

        if (data) {
          // 管理者判定ロジック（メールアドレスベース）
          const isAdmin = data.email?.includes('@admin.') || 
                          data.email === 'admin@quicklabel.com' ||
                          data.contact_name?.includes('管理者')

          setProfile({
            ...data,
            role: isAdmin ? 'admin' : 'user'
          })
        }
      } catch (error) {
        console.error('プロフィール取得例外:', error)
      }
    }

    getInitialAuth()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('認証状態変更:', event)
        
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin'
  }
} 