import { NextRequest, NextResponse } from 'next/server'
import { getCacheInvalidationService } from '@/lib/services/cacheInvalidationService'
import { ReceiptAPIResponse } from '@/types/receipt'

/**
 * POST /api/receipts/invalidate/webhook
 * 
 * 外部システムからのキャッシュ無効化Webhook
 * 取引データ変更時の自動無効化トリガー用
 * 
 * 要件:
 * - 6.1: 取引データが変更された場合にキャッシュ済みPDFを削除
 * - 6.2: 次回要求時に新しいPDFを生成するためのキャッシュクリア
 * - 6.3: エラーハンドリングとログ記録
 */

interface WebhookPayload {
  action: 'invalidate_transaction' | 'invalidate_user' | 'cleanup_expired'
  transactionId?: string
  transactionIds?: string[]
  userId?: string
  reason?: string
  maxAgeHours?: number
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 キャッシュ無効化Webhook受信')

    // 1. Webhook認証
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.CACHE_INVALIDATION_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('❌ CACHE_INVALIDATION_WEBHOOK_SECRET が設定されていません')
      return NextResponse.json({
        success: false,
        error: {
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: 'Webhook設定が不完全です',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error('❌ Webhook認証失敗')
      return NextResponse.json({
        success: false,
        error: {
          code: 'WEBHOOK_UNAUTHORIZED',
          message: 'Webhook認証に失敗しました',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 401 })
    }

    // 2. ペイロード解析
    let payload: WebhookPayload
    try {
      payload = await request.json()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'リクエストボディの解析に失敗しました',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 400 })
    }

    // 3. アクション実行
    const invalidationService = getCacheInvalidationService()
    let result: any = {}

    switch (payload.action) {
      case 'invalidate_transaction':
        if (!payload.transactionId) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'MISSING_TRANSACTION_ID',
              message: 'transactionIdが指定されていません',
              timestamp: new Date().toISOString()
            }
          } as ReceiptAPIResponse, { status: 400 })
        }

        await invalidationService.invalidateTransaction(
          payload.transactionId,
          payload.reason || 'Webhook経由での無効化'
        )

        result = {
          action: 'invalidate_transaction',
          transactionId: payload.transactionId,
          message: 'キャッシュを無効化しました'
        }
        break

      case 'invalidate_user':
        if (!payload.userId) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'MISSING_USER_ID',
              message: 'userIdが指定されていません',
              timestamp: new Date().toISOString()
            }
          } as ReceiptAPIResponse, { status: 400 })
        }

        await invalidationService.invalidateUserTransactions(
          payload.userId,
          payload.reason || 'Webhook経由でのユーザーキャッシュ無効化'
        )

        result = {
          action: 'invalidate_user',
          userId: payload.userId,
          message: 'ユーザーの全キャッシュを無効化しました'
        }
        break

      case 'cleanup_expired':
        const maxAge = payload.maxAgeHours || 24
        await invalidationService.cleanupExpiredCache(maxAge)

        result = {
          action: 'cleanup_expired',
          maxAgeHours: maxAge,
          message: '期限切れキャッシュをクリーンアップしました'
        }
        break

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: `無効なアクション: ${payload.action}`,
            timestamp: new Date().toISOString()
          }
        } as ReceiptAPIResponse, { status: 400 })
    }

    console.log('✅ Webhook処理完了:', result)

    return NextResponse.json({
      success: true,
      data: result
    } as ReceiptAPIResponse, { status: 200 })

  } catch (error) {
    console.error('❌ Webhook処理エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'WEBHOOK_PROCESSING_ERROR',
        message: 'Webhook処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    } as ReceiptAPIResponse, { status: 500 })
  }
}

// GET method for webhook health check
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      message: 'キャッシュ無効化Webhookは正常に動作しています',
      timestamp: new Date().toISOString(),
      supportedActions: [
        'invalidate_transaction',
        'invalidate_user', 
        'cleanup_expired'
      ]
    }
  } as ReceiptAPIResponse, { status: 200 })
}