import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

/**
 * サーバーコンポーネント用のSupabaseクライアントを作成
 * Cookie経由でセッション情報を管理
 */
export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // SSR中にSet-Cookieヘッダーを設定できない場合のエラーハンドリング
            // これはサーバーコンポーネントで起こる可能性がある
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // SSR中にSet-Cookieヘッダーを設定できない場合のエラーハンドリング
          }
        },
      },
    }
  )
}

/**
 * Route Handler用のSupabaseクライアントを作成
 * Cookie操作が可能なコンテキストで使用
 */
export const createRouteHandlerClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * ユーザー情報を取得するヘルパー関数
 */
export const getUser = async () => {
  const supabase = createClient()
  
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Error getting user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

/**
 * プロフィール情報を取得するヘルパー関数
 */
export const getUserProfile = async () => {
  const supabase = createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error getting profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

/**
 * セッションを取得するヘルパー関数
 */
export const getSession = async () => {
  const supabase = createClient()
  
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Error in getSession:', error)
    return null
  }
} 