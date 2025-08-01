import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
 * Service Role Key用のSupabaseクライアントを作成
 * サーバーサイドAPIから全てのデータに安全にアクセスする際に使用
 * RLSポリシーをバイパスし、管理者権限でアクセス可能
 */
export const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for Service Role Key');
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * プロフィール情報を取得（サーバーサイド版）
 * Service Role Keyを使用してRLSをバイパス
 * @param userId ユーザーID
 */
export const getUserProfileServer = async (userId: string) => {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile: data, error }
}

/**
 * 全プロフィール情報を取得（管理者用）
 * Service Role Keyを使用してRLSをバイパス
 */
export const getAllProfilesServer = async () => {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return { profiles: data, error }
}

/**
 * プロフィール情報を更新（サーバーサイド版）
 * Service Role Keyを使用してRLSをバイパス
 * @param userId ユーザーID
 * @param updates 更新するプロフィール情報
 */
export const updateUserProfileServer = async (
  userId: string, 
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
) => {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { profile: data, error }
}