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
        // フローをPKCEに固定（セキュリティ向上）
        flowType: 'pkce'
      },
      // Cookieの設定を最適化
      cookies: {
        // Cookieの設定をデフォルトのままにして、@supabase/ssrの最適化を活用
      },
      // リアルタイム機能の最適化（必要に応じて調整）
      realtime: {
        // イベント頻度制限（デフォルト: 10/秒, 節約: 2/秒）
        eventsPerSecond: 2,
      }
    }
  )
}

// シングルトンパターンでクライアントを作成
export const supabase = createOptimizedClient()