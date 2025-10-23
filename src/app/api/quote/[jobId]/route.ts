export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params;
    console.log(`ジョブステータス確認 - ジョブID: ${jobId}`);

    // E2E/開発用モック: Cookie `core-mode=mock` または env `CORE_MODE=mock`、もしくは jobId が `mock-` で始まる場合
    const cookieHeader = request.headers.get('cookie') || ''
    const hasMockCookie = /(?:^|;\s*)core-mode=mock(?:;|$)/i.test(cookieHeader)
    const envCoreMode = String(process.env.CORE_MODE || '').toLowerCase()
    if (hasMockCookie || envCoreMode === 'mock' || jobId.startsWith('mock-')) {
      // jobId 形式は任意（mock-UUID など）を許容し、DB照会をせず即 completed を返す
      const mockData = {
        rates: [
          {
            serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
            totalNetFedExCharge: '12345',
            deliveryDate: '2025-10-24',
            deliveryDayOfWeek: 'Fri',
            packagingType: 'YOUR_PACKAGING',
            rateType: 'ACCOUNT',
          }
        ]
      }
      return NextResponse.json({ status: 'completed', message: 'mock completed', jobId, data: mockData })
    }

    const supa = createServiceRoleClient()
    const { data: job, error: fetchError } = await supa
      .from('quote_jobs')
      .select('id,status,created_at,updated_at,completed_at,response_payload,error_message')
      .eq('id', jobId as any)
      .maybeSingle()

    if (fetchError || !job) {
      console.error('ジョブ取得エラー:', fetchError);
      return NextResponse.json(
        { error: 'ジョブが見つからないか、アクセス権限がありません' },
        { status: 404 }
      );
    }

    // ステータスに応じてレスポンスを返す
    switch (job.status) {
      case 'pending':
        return NextResponse.json({
          status: 'pending',
          message: '見積もりリクエストを処理待ちです...',
          jobId: jobId,
          createdAt: job.created_at
        });

      case 'processing_auth':
        return NextResponse.json({
          status: 'processing_auth',
          message: 'FedExサーバーに接続中です...',
          jobId: jobId,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        });

      case 'processing_rate_request':
        return NextResponse.json({
          status: 'processing_rate_request', 
          message: '料金を計算中です...',
          jobId: jobId,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        });

      case 'completed':
        // 成功時は結果データを返す
        const responseData = job.response_payload as any;
        return NextResponse.json({
          status: 'completed',
          message: '見積もりが完了しました',
          jobId: jobId,
          data: responseData,
          createdAt: job.created_at,
          completedAt: job.completed_at
        });

      case 'failed':
        // エラー時はエラー情報を返す
        return NextResponse.json({
          status: 'failed',
          message: '見積もりの取得に失敗しました',
          error: job.error_message || '不明なエラーが発生しました',
          jobId: jobId,
          createdAt: job.created_at,
          completedAt: job.completed_at
        });

      default:
        return NextResponse.json({
          status: 'unknown',
          message: '不明なステータスです',
          jobId: jobId
        });
    }

  } catch (error) {
    console.error('ジョブステータス確認エラー:', error);
    
    let errorMessage = 'ジョブステータスの確認に失敗しました';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'このエンドポイントはGETリクエストのみ対応しています' },
    { status: 405 }
  );
} 