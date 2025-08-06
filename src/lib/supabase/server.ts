import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Session } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * サーバーコンポーネント用のSupabaseクライアントを作成
 * Cookie経由でセッション情報を管理
 */
export const createClient = () => {
  const cookieStore = cookies()
  
  // デバッグ：利用可能なCookieを確認
  console.log('[SERVER] createClient: Available cookies:', {
    'quicklabel-auth-token': !!cookieStore.get('quicklabel-auth-token'),
    'sb-quicklabel-auth-token': !!cookieStore.get('sb-quicklabel-auth-token'),
    allCookies: cookieStore.getAll().map(c => c.name)
  })

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          console.log(`[SERVER] Cookie get: ${name} = ${value ? 'found' : 'not found'}`)
          return value
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
 * サーバーコンポーネント用のSupabaseクライアントを作成（エイリアス）
 * 要求仕様に合わせた命名での同機能提供
 */
export const createSupabaseServerClient = () => {
  return createClient()
}

/**
 * Service Role Key用のSupabaseクライアントを作成
 * サーバーサイドAPIから全てのデータに安全にアクセスする際に使用
 * RLSポリシーをバイパスし、管理者権限でアクセス可能
 */
export const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL または Service Role Key が設定されていません');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

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
 * セッションを取得するヘルパー関数（ミドルウェアと同様のフォールバック付き）
 */
export const getSession = async () => {
  const supabase = createClient()
  
  try {
    console.log('[SERVER] getSession: Starting session retrieval...')
    
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    console.log('[SERVER] getSession: Supabase response:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || 'no email',
      error: error?.message || 'no error'
    })

    if (session && !error) {
      console.log('[SERVER] getSession: Valid session found from Supabase')
      return session
    }

    // Supabaseからセッションが取得できない場合、ミドルウェアと同様のCookieフォールバック
    console.log('[SERVER] getSession: Trying cookie fallback...')
    const cookieStore = cookies()
    const authTokenCookie = cookieStore.get('quicklabel-auth-token')
    
    if (authTokenCookie?.value) {
      try {
        let cookieData
        
        if (authTokenCookie.value.startsWith('base64-')) {
          const base64Data = authTokenCookie.value.replace('base64-', '')
          const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8')
          cookieData = JSON.parse(decodedData)
        } else {
          cookieData = JSON.parse(authTokenCookie.value)
        }
        
        if (cookieData.access_token && cookieData.user) {
          console.log('[SERVER] getSession: Valid session found from cookie:', {
            email: cookieData.user?.email,
            userId: cookieData.user?.id
          })
          
          // Cookie データからセッション形式に変換
          return {
            access_token: cookieData.access_token,
            refresh_token: cookieData.refresh_token,
            expires_at: cookieData.expires_at,
            expires_in: cookieData.expires_in,
            token_type: cookieData.token_type || 'bearer',
            user: cookieData.user
          } as Session
        }
      } catch (cookieError) {
        console.error('[SERVER] getSession: Cookie parsing error:', cookieError)
      }
    }

    console.log('[SERVER] getSession: No valid session found')
    return null
  } catch (error) {
    console.error('[SERVER] Error in getSession:', error)
    return null
  }
} 