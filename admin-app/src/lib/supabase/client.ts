import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

/**
 * 最適化されたSupabaseクライアント設定
 * セッション永続化とクライアントサイド遷移の安定性を向上
 */
const createOptimizedClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // セッションの永続化設定を最適化
        persistSession: true,
        // セッション検出の積極性を向上
        detectSessionInUrl: true,
        // 自動リフレッシュの有効化
        autoRefreshToken: true,
        // ストレージからのセッション復元を有効化
        storageKey: 'quicklabel-auth-token',
        // より短い間隔でセッション状態をチェック
        flowType: 'pkce'
      },
      // リアルタイム機能の設定（認証状態同期に有用）
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    }
  )
}

/**
 * カスタムストレージ設定でSupabaseクライアントを作成
 * ログイン時の永続化オプションに応じてストレージ方式を切り替える
 */
const createClientWithCustomStorage = (storageType: 'localStorage' | 'sessionStorage' = 'localStorage') => {
  // カスタムストレージの実装
  const customStorage = {
    getItem: (key: string) => {
      if (typeof window === 'undefined') return null
      
      if (storageType === 'sessionStorage') {
        return window.sessionStorage.getItem(key)
      } else {
        return window.localStorage.getItem(key)
      }
    },
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return
      
      if (storageType === 'sessionStorage') {
        window.sessionStorage.setItem(key, value)
      } else {
        window.localStorage.setItem(key, value)
      }
    },
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return
      
      if (storageType === 'sessionStorage') {
        window.sessionStorage.removeItem(key)
      } else {
        window.localStorage.removeItem(key)
      }
    }
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storageKey: storageType === 'sessionStorage' ? 'quicklabel-auth-session' : 'quicklabel-auth-token',
        flowType: 'pkce',
        // カスタムストレージを設定
        storage: customStorage
      },
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    }
  )
}

/**
 * クライアントコンポーネント用のSupabaseクライアントを作成
 * ブラウザ環境でのSupabase操作に使用
 * @deprecated 新規コードではシングルトンインスタンス'supabase'を使用してください
 */
export const createClient = () => createOptimizedClient()

/**
 * Supabaseクライアントインスタンス（シングルトン）
 * 複数回のインポートでも同じインスタンスを使用
 * 認証状態の一貫性を保つため、常にこのインスタンスを使用してください
 */
export const supabase = createOptimizedClient()

/**
 * 認証状態の変更を監視するヘルパー関数
 * @param callback 認証状態変更時に呼ばれるコールバック関数
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * ユーザーの登録
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
 * ユーザーのサインイン（永続化制御対応）
 * @param email メールアドレス
 * @param password パスワード
 * @param persistSession ログイン状態を保持するかどうか（デフォルト: true）
 */
export const signIn = async (email: string, password: string, persistSession: boolean = true) => {
  console.log('🔐 サインイン開始:', { email, persistSession })
  
  // 永続化オプションに応じてクライアントを作成
  const storageType = persistSession ? 'localStorage' : 'sessionStorage'
  const clientWithCustomStorage = createClientWithCustomStorage(storageType)
  
  console.log(`📱 ストレージタイプ: ${storageType}`)
  
  try {
    const result = await clientWithCustomStorage.auth.signInWithPassword({
      email,
      password,
    })
    
    if (result.data?.session && !persistSession) {
      // セッション非永続化の場合、古いlocalStorageデータをクリア
      console.log('🧹 非永続化ログイン: localStorageデータをクリア')
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('quicklabel-auth-token')
        window.localStorage.removeItem('sb-quicklabel-auth-token')
      }
    }
    
    console.log('✅ サインイン完了:', { 
      success: !!result.data?.session, 
      storageUsed: storageType 
    })
    
    return result
    
  } catch (error) {
    console.error('❌ サインインエラー:', error)
    throw error
  }
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