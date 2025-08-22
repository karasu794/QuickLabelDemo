import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

/**
 * 最適化されたSupabaseクライアント設定
 * セッション永続化とクライアントサイド遷移の安定性を向上
 */
const createOptimizedClient = () => createClientComponentClient<Database>()

// シングルトンパターンでクライアントを作成
export const supabase = createOptimizedClient()

// 認証関数のエクスポート（既存コードとの互換性のため）
export const signIn = (email: string, password: string, persistSession?: boolean) => 
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) => 
  supabase.auth.signUp({ email, password })

export const signOut = () => 
  supabase.auth.signOut()

// createClient のエイリアス（既存コードとの互換性のため）
export const createClient = () => supabase