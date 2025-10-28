import { NextRequest, NextResponse } from 'next/server'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 動的レンダリングを強制（Vercelビルドエラー対策）
export const dynamic = 'force-dynamic'

// FedX認証トークン取得（/api/shipと同じ実装）
// 🚨 基幹仕様: FedX アクセストークンを取得（動的認証情報切り替え対応）
async function getFedExAccessToken(originCountry: string): Promise<string> {
  const authUrl = 'https://apis.fedex.com/oauth/token'

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        // 基幹仕様に従って認証情報を動的選択
        client_id: originCountry === 'JP' ? process.env.FEDEX_EXPORT_API_KEY! : process.env.FEDEX_IMPORT_API_KEY!,
        client_secret: originCountry === 'JP' ? process.env.FEDEX_EXPORT_SECRET_KEY! : process.env.FEDEX_IMPORT_SECRET_KEY!,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FedX認証エラー:', errorText)
      throw new Error(`FedX認証に失敗しました: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.access_token) {
      throw new Error('FedXアクセストークンが取得できませんでした')
    }

    return data.access_token
  } catch (error) {
    console.error('FedX認証処理エラー:', error)
    throw new Error('FedX認証処理に失敗しました')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'inline'
    const shipmentId = searchParams.get('shipmentId')
    if (!shipmentId) {
      return NextResponse.json({ ok: false, error: 'shipmentId_required' }, { status: 400 })
    }

    const { user } = await getUserOrThrow()
    const sb = createServiceRoleClient()
    const { data: row, error } = await (sb as any)
      .from('shipments')
      .select('id, user_id, label_blob_url, label_url')
      .eq('id', shipmentId as any)
      .maybeSingle()
    if (error || !row) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }
    if (String((row as any).user_id) !== String(user.id)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    const labelUrl = (row as any).label_blob_url || (row as any).label_url
    if (!labelUrl) return NextResponse.json({ ok: false, error: 'label_not_ready' }, { status: 409 })

    console.log('📄 送り状PDFダウンロード開始:', labelUrl)

    // FedX認証トークンを取得（基幹仕様対応）
    let accessToken: string
    try {
      // 🚨 基幹仕様: ラベルダウンロードでは日本発送を前提として輸出用認証を使用
      accessToken = await getFedExAccessToken('JP')
      console.log('✅ FedX認証完了（輸出用認証使用）')
    } catch (error) {
      console.error('❌ FedX認証エラー:', error)
      return NextResponse.json(
        { 
          error: 'FedX認証に失敗しました',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 500 }
      )
    }

    // 直URLをサーバでプロキシ
    try {
      console.log('📥 PDFデータ取得中...')
      const pdfResponse = await fetch(labelUrl)

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text()
        console.error('FedX PDFダウンロードエラー:', errorText)
        throw new Error(`PDF取得に失敗しました: ${pdfResponse.status}`)
      }

      // PDFデータをArrayBufferとして取得
      const pdfBuffer = await pdfResponse.arrayBuffer()
      console.log(`✅ PDFデータ取得完了: ${pdfBuffer.byteLength} bytes`)

      // ファイル名を生成（タイムスタンプ付き）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `fedex-label-${timestamp}.pdf`

      // actionパラメータに基づいてContent-Dispositionを設定
      const contentDisposition = action === 'attachment' 
        ? `attachment; filename="${filename}"`
        : 'inline'

      console.log(`📋 Content-Disposition: ${contentDisposition} (action: ${action || 'download'})`)

      // PDFデータをユーザーに返却
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition,
          'Content-Length': pdfBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })

    } catch (error) {
      console.error('❌ PDF取得エラー:', error)
      return NextResponse.json(
        {
          error: 'PDFファイルの取得に失敗しました',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 