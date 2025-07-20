'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// サービスロールキーを使用したSupabase client（サーバーサイド専用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Server Action: 個別通知を既読にする
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔔 通知既読処理開始:', notificationId)

    // バリデーション
    if (!notificationId || typeof notificationId !== 'string') {
      console.error('❌ バリデーションエラー: 無効な通知ID')
      return { success: false, error: '無効な通知IDです' }
    }

    // 既読状態に更新
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select('id, is_read')
      .single()

    if (error) {
      console.error('❌ 通知更新エラー:', error)
      return { success: false, error: 'データベースの更新に失敗しました' }
    }

    if (!data) {
      console.error('❌ 通知が見つかりません:', notificationId)
      return { success: false, error: '通知が見つかりません' }
    }

    console.log('✅ 通知既読処理成功:', data.id)

    // ページを再検証して最新データを反映
    revalidatePath('/admin/notifications')
    
    return { success: true }

  } catch (error) {
    console.error('❌ Server Action エラー:', error)
    return { success: false, error: 'サーバーエラーが発生しました' }
  }
}

// Server Action: 全ての未読通知を既読にする
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    console.log('🔔 一括既読処理開始')

    // 全ての未読通知を既読に更新
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('is_read', false)
      .select('id')

    if (error) {
      console.error('❌ 一括更新エラー:', error)
      return { success: false, error: 'データベースの更新に失敗しました' }
    }

    const updatedCount = data?.length || 0
    console.log('✅ 一括既読処理成功:', `${updatedCount}件更新`)

    // ページを再検証して最新データを反映
    revalidatePath('/admin/notifications')
    
    return { success: true, updatedCount }

  } catch (error) {
    console.error('❌ Server Action エラー:', error)
    return { success: false, error: 'サーバーエラーが発生しました' }
  }
}

// Server Action: 通知を削除する（将来の拡張用）
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ 通知削除処理開始:', notificationId)

    // バリデーション
    if (!notificationId || typeof notificationId !== 'string') {
      console.error('❌ バリデーションエラー: 無効な通知ID')
      return { success: false, error: '無効な通知IDです' }
    }

    // 通知を削除
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('❌ 通知削除エラー:', error)
      return { success: false, error: 'データベースの削除に失敗しました' }
    }

    console.log('✅ 通知削除処理成功:', notificationId)

    // ページを再検証して最新データを反映
    revalidatePath('/admin/notifications')
    
    return { success: true }

  } catch (error) {
    console.error('❌ Server Action エラー:', error)
    return { success: false, error: 'サーバーエラーが発生しました' }
  }
} 