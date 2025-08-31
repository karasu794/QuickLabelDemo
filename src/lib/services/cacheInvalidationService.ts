import { getCacheService } from './cacheService'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Cache Invalidation Service
 * 取引データ変更時の自動キャッシュ無効化機能を提供
 * 
 * 要件:
 * - 6.1: 取引データが変更された場合にキャッシュ済みPDFを削除
 * - 6.2: 次回要求時に新しいPDFを生成するためのキャッシュクリア
 * - 6.3: エラーハンドリングとログ記録
 */
export class CacheInvalidationService {
  private cacheService = getCacheService()

  /**
   * 単一取引のキャッシュを無効化
   * @param transactionId - 取引ID
   * @param reason - 無効化理由（ログ用）
   */
  async invalidateTransaction(transactionId: string, reason: string = 'データ変更'): Promise<void> {
    try {
      console.log(`🗑️ キャッシュ無効化開始: ${transactionId} (理由: ${reason})`)

      // キャッシュ存在確認
      const exists = await this.cacheService.exists(transactionId)
      
      if (!exists) {
        console.log(`ℹ️ キャッシュが存在しません: ${transactionId}`)
        return
      }

      // Vercel Blobからキャッシュ削除
      await this.cacheService.delete(transactionId)

      // データベースのキャッシュレコード削除
      await this.deleteCacheRecord(transactionId)

      console.log(`✅ キャッシュ無効化完了: ${transactionId}`)

    } catch (error) {
      console.error(`❌ キャッシュ無効化エラー (${transactionId}):`, error)
      // エラーが発生してもアプリケーションの主要機能に影響しないよう、
      // エラーを再スローせずにログのみ出力
    }
  }

  /**
   * 複数取引のキャッシュを一括無効化
   * @param transactionIds - 取引IDの配列
   * @param reason - 無効化理由（ログ用）
   */
  async invalidateMultipleTransactions(transactionIds: string[], reason: string = 'データ変更'): Promise<void> {
    console.log(`🗑️ 一括キャッシュ無効化開始: ${transactionIds.length}件 (理由: ${reason})`)

    const results = await Promise.allSettled(
      transactionIds.map(id => this.invalidateTransaction(id, reason))
    )

    const failed = results.filter(result => result.status === 'rejected').length
    const succeeded = results.length - failed

    console.log(`📊 一括キャッシュ無効化結果: 成功 ${succeeded}件, 失敗 ${failed}件`)

    if (failed > 0) {
      console.warn(`⚠️ ${failed}件のキャッシュ無効化に失敗しました`)
    }
  }

  /**
   * ユーザーの全取引キャッシュを無効化
   * @param userId - ユーザーID
   * @param reason - 無効化理由（ログ用）
   */
  async invalidateUserTransactions(userId: string, reason: string = 'ユーザーデータ変更'): Promise<void> {
    try {
      console.log(`🗑️ ユーザー全取引キャッシュ無効化開始: ${userId} (理由: ${reason})`)

      const transactionIds = await this.getUserTransactionIds(userId)
      
      if (transactionIds.length === 0) {
        console.log(`ℹ️ 対象取引が見つかりません: ${userId}`)
        return
      }

      await this.invalidateMultipleTransactions(transactionIds, reason)

      console.log(`✅ ユーザー全取引キャッシュ無効化完了: ${userId}`)

    } catch (error) {
      console.error(`❌ ユーザー全取引キャッシュ無効化エラー (${userId}):`, error)
    }
  }

  /**
   * 期限切れキャッシュの自動クリーンアップ
   * @param maxAge - 最大保持期間（時間）
   */
  async cleanupExpiredCache(maxAge: number = 24): Promise<void> {
    try {
      console.log(`🧹 期限切れキャッシュクリーンアップ開始 (${maxAge}時間以上)`)

      const expiredTransactionIds = await this.getExpiredTransactionIds(maxAge)
      
      if (expiredTransactionIds.length === 0) {
        console.log('ℹ️ 期限切れキャッシュが見つかりません')
        return
      }

      await this.invalidateMultipleTransactions(expiredTransactionIds, '期限切れ')

      console.log(`✅ 期限切れキャッシュクリーンアップ完了: ${expiredTransactionIds.length}件`)

    } catch (error) {
      console.error('❌ 期限切れキャッシュクリーンアップエラー:', error)
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  async getCacheStatistics(): Promise<{
    totalCached: number
    oldestCache: Date | null
    newestCache: Date | null
  }> {
    try {
      const supabase = createServiceRoleClient()
      
      const { data, error } = await (supabase as any)
        .from('receipt_cache')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        return {
          totalCached: 0,
          oldestCache: null,
          newestCache: null
        }
      }

      return {
        totalCached: data.length,
        oldestCache: new Date(data[0].created_at),
        newestCache: new Date(data[data.length - 1].created_at)
      }

    } catch (error) {
      console.error('キャッシュ統計取得エラー:', error)
      return {
        totalCached: 0,
        oldestCache: null,
        newestCache: null
      }
    }
  }

  /**
   * データベースのキャッシュレコードを削除
   */
  private async deleteCacheRecord(transactionId: string): Promise<void> {
    try {
      const supabase = createServiceRoleClient()
      
      const { error } = await (supabase as any)
        .from('receipt_cache')
        .delete()
        .eq('transaction_id', transactionId)

      if (error) {
        console.warn(`キャッシュレコード削除警告 (${transactionId}):`, error.message)
      }
    } catch (error) {
      console.warn(`キャッシュレコード削除警告 (${transactionId}):`, error)
    }
  }

  /**
   * ユーザーの全取引IDを取得
   */
  private async getUserTransactionIds(userId: string): Promise<string[]> {
    const supabase = createServiceRoleClient()
    const transactionIds: string[] = []

    // shipmentsテーブルから取得
    const { data: shipments, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('user_id', userId)

    if (!shipmentError && shipments) {
      transactionIds.push(...shipments.map(s => String((s as { id: string | number }).id)))
    }

    // open_shipmentsテーブルから取得
    const { data: openShipments, error: openShipmentError } = await supabase
      .from('open_shipments')
      .select('id')
      .eq('user_id', userId)

    if (!openShipmentError && openShipments) {
      transactionIds.push(
        ...openShipments.map((s: { id: string | number }) => String(s.id))
      )
    }

    return transactionIds
  }

  /**
   * 期限切れ取引IDを取得
   */
  private async getExpiredTransactionIds(maxAgeHours: number): Promise<string[]> {
    const supabase = createServiceRoleClient()
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

    const { data, error } = await (supabase as any)
      .from('receipt_cache')
      .select('transaction_id')
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      throw error
    }

    return data ? data.map(record => String((record as { transaction_id: string | number }).transaction_id)) : []
  }
}

// Export singleton instance
let _cacheInvalidationServiceInstance: CacheInvalidationService | null = null

export const getCacheInvalidationService = (): CacheInvalidationService => {
  if (!_cacheInvalidationServiceInstance) {
    _cacheInvalidationServiceInstance = new CacheInvalidationService()
  }
  return _cacheInvalidationServiceInstance
}

/**
 * 便利な関数エクスポート
 */

/**
 * 取引データ変更時に呼び出すキャッシュ無効化関数
 * @param transactionId - 変更された取引ID
 * @param reason - 変更理由（オプション）
 */
export async function invalidateTransactionCache(
  transactionId: string, 
  reason: string = 'データ変更'
): Promise<void> {
  const service = getCacheInvalidationService()
  await service.invalidateTransaction(transactionId, reason)
}

/**
 * ユーザーデータ変更時に呼び出すキャッシュ無効化関数
 * @param userId - 変更されたユーザーID
 * @param reason - 変更理由（オプション）
 */
export async function invalidateUserCache(
  userId: string, 
  reason: string = 'ユーザーデータ変更'
): Promise<void> {
  const service = getCacheInvalidationService()
  await service.invalidateUserTransactions(userId, reason)
}