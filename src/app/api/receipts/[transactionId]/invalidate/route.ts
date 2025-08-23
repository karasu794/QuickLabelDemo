import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCacheService } from '@/lib/services/cacheService'
import { ReceiptAPIResponse } from '@/types/receipt'

/**
 * POST /api/receipts/[transactionId]/invalidate
 * 
 * キャッシュ無効化API - 取引データ変更時のキャッシュ削除機能
 * 
 * 要件:
 * - 6.1: 取引データが変更された場合にキャッシュ済みPDFを削除
 * - 6.2: 次回要求時に新しいPDFを生成するためのキャッシュクリア
 * - 6.3: エラーハンドリングとログ記録
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const { transactionId } = params
  
  if (!transactionId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'MISSING_TRANSACTION_ID',
        message: 'transactionIdが指定されていません',
        timestamp: new Date().toISOString()
      }
    } as ReceiptAPIResponse, { status: 400 })
  }

  try {
    console.log('🗑️ キャッシュ無効化API開始 (transactionId):', transactionId)

    // 1. ユーザー認証確認
    const cookieStore = cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { data: { session } } = await supabaseClient.auth.getSession()
    const user = session?.user
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ユーザー認証に失敗しました',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 401 })
    }

    // 2. 取引の所有者確認
    const hasAccess = await verifyTransactionAccess(transactionId, user.id)
    
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'この取引にアクセスする権限がありません',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 403 })
    }

    // 3. キャッシュサービス初期化
    const cacheService = getCacheService()

    // 4. キャッシュ存在確認
    const cacheExists = await cacheService.exists(transactionId)
    
    if (!cacheExists) {
      console.log('ℹ️ キャッシュが存在しません - 無効化不要')
      return NextResponse.json({
        success: true,
        data: {
          message: 'キャッシュが存在しないため、無効化は不要です'
        }
      } as ReceiptAPIResponse, { status: 200 })
    }

    // 5. キャッシュ削除実行
    console.log('🗑️ キャッシュ削除実行中...')
    await cacheService.delete(transactionId)

    // 6. データベースのキャッシュレコードも削除
    await deleteCacheRecord(transactionId)

    console.log('✅ キャッシュ無効化完了')

    return NextResponse.json({
      success: true,
      data: {
        message: 'キャッシュが正常に無効化されました'
      }
    } as ReceiptAPIResponse, { status: 200 })

  } catch (error) {
    console.error('❌ キャッシュ無効化エラー:', error)
    
    // エラーの種類に応じて適切なステータスコードを返す
    let statusCode = 500
    let errorCode = 'CACHE_INVALIDATION_ERROR'
    let errorMessage = 'キャッシュの無効化中にエラーが発生しました'

    if (error instanceof Error) {
      if (error.message.includes('見つからない') || error.message.includes('not found')) {
        statusCode = 404
        errorCode = 'TRANSACTION_NOT_FOUND'
        errorMessage = '指定された取引が見つかりません'
      } else if (error.message.includes('権限') || error.message.includes('access')) {
        statusCode = 403
        errorCode = 'ACCESS_DENIED'
        errorMessage = 'この取引にアクセスする権限がありません'
      } else if (error.message.includes('認証') || error.message.includes('auth')) {
        statusCode = 401
        errorCode = 'AUTHENTICATION_FAILED'
        errorMessage = 'ユーザー認証に失敗しました'
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    } as ReceiptAPIResponse, { status: statusCode })
  }
}

/**
 * 取引へのアクセス権限を確認する
 */
async function verifyTransactionAccess(transactionId: string, userId: string): Promise<boolean> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()
    
    // shipmentsテーブルを確認
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, user_id')
      .eq('id', Number(transactionId))
      .eq('user_id', userId)
      .single()

    if (!shipmentError && shipment) {
      return true
    }

    // open_shipmentsテーブルを確認
    const { data: openShipment, error: openShipmentError } = await supabase
      .from('open_shipments')
      .select('id, user_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (!openShipmentError && openShipment) {
      return true
    }

    return false
  } catch (error) {
    console.error('アクセス権限確認エラー:', error)
    return false
  }
}

/**
 * データベースのキャッシュレコードを削除する
 */
async function deleteCacheRecord(transactionId: string): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()
    
    // 型に存在しない旧テーブル名のため型回避して削除
    const { error } = await (supabase as any)
      .from('receipt_cache')
      .delete()
      .eq('transaction_id', transactionId)

    if (error) {
      console.warn('キャッシュレコード削除警告:', error.message)
      // データベースレコードの削除に失敗してもBlobの削除は成功しているため、
      // エラーとして扱わずに警告ログのみ出力
    }
  } catch (error) {
    console.warn('キャッシュレコード削除警告:', error)
    // 同様に警告のみ
  }
}