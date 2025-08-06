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
  
  // ========== VERCEL DEBUG: 環境情報 ==========
  console.log('[SERVER] 🔍 VERCEL DEBUG - Environment Info:', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    platform: process.platform,
    timestamp: new Date().toISOString()
  })
  
  // ========== VERCEL DEBUG: Supabase 環境変数 ==========
  console.log('[SERVER] 🔍 VERCEL DEBUG - Supabase Environment Variables:', {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  
  // ========== VERCEL DEBUG: Cookie詳細情報 ==========
  const allCookies = cookieStore.getAll()
  console.log('[SERVER] 🔍 VERCEL DEBUG - Cookie Details:', {
    totalCookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    authTokenExists: !!cookieStore.get('quicklabel-auth-token'),
    authTokenSize: cookieStore.get('quicklabel-auth-token')?.value?.length || 0,
    sbAuthTokenExists: !!cookieStore.get('sb-quicklabel-auth-token'),
    sbAuthTokenSize: cookieStore.get('sb-quicklabel-auth-token')?.value?.length || 0,
    supabaseSessionExists: !!cookieStore.get('sb-quicklabel-auth-token-session'),
    allSupabaseCookies: allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
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
    console.log('[SERVER] 🔍 VERCEL DEBUG - getSession: Starting detailed session retrieval...')
    
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // ========== VERCEL DEBUG: Supabase API レスポンス詳細 ==========
    console.log('[SERVER] 🔍 VERCEL DEBUG - Supabase API Response:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || 'no email',
      userId: session?.user?.id || 'no id',
      sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry',
      currentTime: new Date().toISOString(),
      isExpired: session?.expires_at ? Date.now() / 1000 > session.expires_at : 'unknown',
      tokenLength: session?.access_token?.length || 0,
      refreshTokenExists: !!session?.refresh_token,
      error: error?.message || 'no error',
      errorCode: error?.code || 'no error code'
    })

    if (session && !error) {
      console.log('[SERVER] getSession: Valid session found from Supabase')
      return session
    }

    // ========== VERCEL DEBUG: Cookie フォールバック開始 ==========
    console.log('[SERVER] 🔍 VERCEL DEBUG - getSession: Trying advanced cookie fallback...')
    const cookieStore = cookies()
    const authTokenCookie = cookieStore.get('quicklabel-auth-token')
    
    console.log('[SERVER] 🔍 VERCEL DEBUG - Cookie Fallback Details:', {
      authTokenCookieExists: !!authTokenCookie,
      cookieValue: authTokenCookie?.value ? 'present' : 'missing',
      cookieLength: authTokenCookie?.value?.length || 0,
      isBase64: authTokenCookie?.value?.startsWith('base64-') || false,
      cookiePreview: authTokenCookie?.value?.substring(0, 50) + '...'
    })
    
    if (authTokenCookie?.value) {
      try {
        let cookieData
        
        if (authTokenCookie.value.startsWith('base64-')) {
          console.log('[SERVER] 🔍 VERCEL DEBUG - Decoding base64 cookie data...')
          const base64Data = authTokenCookie.value.replace('base64-', '')
          const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8')
          cookieData = JSON.parse(decodedData)
        } else {
          console.log('[SERVER] 🔍 VERCEL DEBUG - Parsing plain JSON cookie data...')
          cookieData = JSON.parse(authTokenCookie.value)
        }
        
        console.log('[SERVER] 🔍 VERCEL DEBUG - Cookie Data Structure:', {
          hasAccessToken: !!cookieData.access_token,
          hasUser: !!cookieData.user,
          userEmail: cookieData.user?.email || 'no email',
          userId: cookieData.user?.id || 'no id',
          hasRefreshToken: !!cookieData.refresh_token,
          expiresAt: cookieData.expires_at || 'no expiry',
          tokenType: cookieData.token_type || 'no token type'
        })
        
        if (cookieData.access_token && cookieData.user) {
          console.log('[SERVER] 🔍 VERCEL DEBUG - Valid session constructed from cookie:', {
            email: cookieData.user?.email,
            userId: cookieData.user?.id,
            constructedAt: new Date().toISOString()
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
        console.error('[SERVER] 🔍 VERCEL DEBUG - Cookie parsing error details:', {
          error: cookieError instanceof Error ? cookieError.message : 'Unknown error',
          stack: cookieError instanceof Error ? cookieError.stack : 'No stack trace',
          cookieLength: authTokenCookie?.value?.length || 0,
          cookiePreview: authTokenCookie?.value?.substring(0, 100) + '...'
        })
      }
    } else {
      console.log('[SERVER] 🔍 VERCEL DEBUG - No auth token cookie found for fallback')
    }

    console.log('[SERVER] 🔍 VERCEL DEBUG - Final result: No valid session found')
    return null
  } catch (error) {
    console.error('[SERVER] 🔍 VERCEL DEBUG - Critical error in getSession:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    })
    return null
  }
} 