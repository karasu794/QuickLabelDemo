import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { receiptNumberService } from '@/lib/services/receiptNumberService'
import { getCacheService } from '@/lib/services/cacheService'
import { getPDFGenerationService, cleanupPDFService } from '@/lib/services/pdfGenerationService'
import { dataRetrievalService } from '@/lib/services/dataRetrievalService'
// receiptTemplate関数は動的にインポートして使用
import { ReceiptFormat, ReceiptAPIResponse } from '@/types/receipt'

/**
 * GET /api/receipts/[transactionId]
 * 
 * PDF領収書の生成・キャッシュ確認・レスポンス機能を実装
 * 
 * 要件:
 * - 1.1: 取引データに基づいてPDF領収書を生成・表示
 * - 1.2: PuppeteerでHTMLをPDFに変換
 * - 5.1: 適切なアクセス制御を実装
 * - 5.4: 不正アクセス防止機能
 */
export async function GET(
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
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 PDF領収書生成API開始 (transactionId):', transactionId)
    }

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

    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization')
    let user = null
    let session = null
    let sessionError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseClient.auth.getUser(token)
      user = tokenUser
      sessionError = tokenError
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 Bearerトークンで認証:', { hasUser: !!user, error: tokenError?.message })
      }
    } else {
      // クッキーベースの認証を試行
      const { data: { session: cookieSession }, error: cookieError } = await supabaseClient.auth.getSession()
      session = cookieSession
      user = session?.user
      sessionError = cookieError
      if (process.env.NODE_ENV === 'development') {
        console.log('🍪 クッキーで認証:', { hasSession: !!session, hasUser: !!user, error: cookieError?.message })
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 認証状態確認:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        sessionError: sessionError?.message,
        cookieCount: cookieStore.getAll().length
      })
    }
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ 認証失敗 - セッション情報:', { session, sessionError })
      }
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'ユーザー認証に失敗しました',
          timestamp: new Date().toISOString()
        }
      } as ReceiptAPIResponse, { status: 401 })
    }

    // 2. クエリパラメータの解析
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') as ReceiptFormat) || 'url'
    const forceRegenerate = url.searchParams.get('forceRegenerate') === 'true'

    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 リクエスト形式: ${format}, 強制再生成: ${forceRegenerate}`)
    }

    // 3. キャッシュサービスとPDF生成サービスを初期化
    const cacheService = getCacheService()
    const pdfService = getPDFGenerationService()

    try {
      // 4. 取引タイプの事前判定
      const transactionType = await determineTransactionType(transactionId)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📋 取引タイプ: ${transactionType}`)
      }

      // 5. キャッシュ確認 → 命中時は即応答（プレビュー最適化）
      let pdfBuffer: Buffer | null = null
      let receiptNumber: string | null = null

      if (!forceRegenerate) {
        try {
          const exists = await cacheService.exists(transactionId)
          if (exists) {
            if (format === 'url') {
              const signedUrl = await cacheService.generateSignedUrl(transactionId)
              return NextResponse.json({
                success: true,
                data: { url: signedUrl }
              } as ReceiptAPIResponse, { status: 200 })
            } else if (format === 'pdf') {
              const cached = await cacheService.get(transactionId)
              if (cached) {
                return await handlePDFResponse(cached, null, 'pdf', null, transactionId)
              }
            }
          }
        } catch (cacheError) {
          // トークン未設定/権限不足などのキャッシュ関連エラーは、
          // プレビュー体験を阻害しないようログのみ出して生成フローへフォールバック
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ キャッシュ確認スキップ（エラー）:', cacheError)
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 キャッシュ未ヒットまたは強制再生成 - PDF生成開始')
      }

      // 6. 取引データ取得と認可チェック
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 取引データ取得開始:', { transactionId, userId: user.id })
      }
      const receiptData = await dataRetrievalService.getReceiptData(transactionId, user.id)
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 取引データ取得完了:', { 
          hasData: !!receiptData,
          customerName: receiptData?.customerInfo?.name,
          totalAmount: receiptData?.totals?.total
        })
      }
      
      // 7. 領収書番号生成（既存がない場合）
      receiptNumber = await receiptNumberService.getExistingReceiptNumber(transactionId, transactionType)
      
      if (!receiptNumber) {
        receiptNumber = await receiptNumberService.generateReceiptNumber(
          new Date(),
          transactionId,
          transactionType
        )
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 新しい領収書番号を生成:', receiptNumber)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 既存の領収書番号を使用:', receiptNumber)
        }
      }

      // 領収書データに番号を設定
      receiptData.receiptNumber = receiptNumber

      // 8. データ検証とHTML生成
      if (process.env.NODE_ENV === 'development') {
        console.log('🌐 HTML生成中...')
      }
      const { validateReceiptData, renderReceiptToHTML } = await import('@/lib/utils/receiptTemplate')
      
      validateReceiptData(receiptData)
      const html = renderReceiptToHTML(receiptData)

      // 9. PDF生成
      if (process.env.NODE_ENV === 'development') {
        console.log('📄 PDF変換中...')
      }
      pdfBuffer = await pdfService.generatePDF(html)

      // 10. 生成結果をキャッシュ保存
      try {
        await cacheService.set(transactionId, pdfBuffer)
      } catch (e) {
        console.warn('⚠️ キャッシュ保存失敗（処理続行）:', e)
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PDF領収書生成完了（キャッシュ保存済み）')
      }

      // 11. レスポンス返却（URL形式なら署名付きURLを返す）
      return await handlePDFResponse(pdfBuffer, receiptNumber, format, cacheService, transactionId)

    } finally {
      // PDF生成サービスのクリーンアップ
      await cleanupPDFService()
    }

  } catch (error) {
    console.error('❌ PDF領収書生成エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      transactionId,
      timestamp: new Date().toISOString()
    })
    
    // エラーの種類に応じて適切なステータスコードを返す
    let statusCode = 500
    let errorCode = 'INTERNAL_ERROR'
    let errorMessage = 'PDF領収書の生成中にエラーが発生しました'

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
 * PDF レスポンスを処理する共通関数
 */
async function handlePDFResponse(
  pdfBuffer: Buffer,
  receiptNumber: string | null,
  format: ReceiptFormat,
  cacheService: any,
  transactionId: string
): Promise<NextResponse> {
  if (format === 'pdf') {
    // PDFバイナリを直接返す（ArrayBufferに変換）
    const arrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
    return new NextResponse(arrayBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt_${receiptNumber || transactionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } else {
    // キャッシュサービスが無効の場合は、PDFバイナリを直接返す
    if (!cacheService) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ キャッシュサービス無効 - PDFバイナリを直接返却')
      }
      
      const arrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
      return new NextResponse(arrayBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="receipt_${receiptNumber || transactionId}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
    }

    // 署名付きURLを返す
    try {
      const signedUrl = await cacheService.generateSignedUrl(transactionId)
      
      return NextResponse.json({
        success: true,
        data: {
          url: signedUrl,
          receiptNumber: receiptNumber || undefined
        }
      } as ReceiptAPIResponse, { status: 200 })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('署名付きURL生成エラー:', error)
      }
      
      // フォールバック: PDFバイナリを返す（ArrayBufferに変換）
      const arrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
      return new NextResponse(arrayBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="receipt_${receiptNumber || transactionId}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
    }
  }
}

/**
 * 取引タイプを判定するヘルパー関数
 */
async function determineTransactionType(transactionId: string): Promise<'shipment' | 'open_shipment'> {
  try {
    // dataRetrievalServiceを使用して取引タイプを判定
    return await dataRetrievalService.getTransactionType(transactionId)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('取引タイプ判定エラー、shipmentとして処理:', error)
    }
    // open_shipmentsテーブルが存在しない場合は、shipmentとして処理
    return 'shipment'
  }
}