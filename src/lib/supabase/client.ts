import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

/**
 * クライアントコンポーネント用のSupabaseクライアントを作成
 * ブラウザ環境でのSupabase操作に使用
 */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

/**
 * Supabaseクライアントインスタンス（シングルトン）
 * 複数回のインポートでも同じインスタンスを使用
 */
export const supabase = createClient()

/**
 * 認証状態の変更を監視するヘルパー関数
 * @param callback 認証状態が変更された際に実行される関数
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * ユーザーのサインアップ
 * @param email メールアドレス
 * @param password パスワード
 */
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({
    email,
    password,
  })
}

/**
 * ユーザーのサインイン
 * @param email メールアドレス
 * @param password パスワード
 */
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

/**
 * ユーザーのサインアウト
 */
export const signOut = async () => {
  return await supabase.auth.signOut()
}

/**
 * 現在のユーザー情報を取得
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * 現在のセッション情報を取得
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * プロフィール情報を取得（クライアントサイド版）
 * @param userId ユーザーID
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile: data, error }
}

/**
 * プロフィール情報を更新
 * @param userId ユーザーID
 * @param updates 更新するプロフィール情報
 */
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { profile: data, error }
} 