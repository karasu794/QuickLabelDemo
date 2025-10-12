import { createServerComponentClient, createRouteHandlerClient as createRouteHelperClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Session } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * サーバーコンポーネント用のSupabaseクライアントを作成
 * Cookie経由でセッション情報を管理
 */
export const createClient = () => {
  // Server Component 用クライアント（helpers流儀 / middlewareと統一）
  return createServerComponentClient<Database>({ cookies })
}

/**
 * Service Role Key用のSupabaseクライアントを作成
 * サーバーサイドAPIから全てのデータに安全にアクセスする際に使用
 * RLSポリシーをバイパスし、管理者権限でアクセス可能
 */
export const createServiceRoleClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
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
  // Route Handler 用クライアント（helpers流儀 / middlewareと統一）
  return createRouteHelperClient<Database>({ cookies })
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
export const getSession = async (): Promise<Session | null> => {
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