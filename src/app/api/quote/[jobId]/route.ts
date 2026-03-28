export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CORE_MODE } from '@/lib/config/coreMode'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params;
    console.log(`ジョブステータス確認 - ジョブID: ${jobId}`);

    // CORE_MODE (boolean) または jobId が core- / mock- prefix の場合、DB照会なしでモックレートを返す
    if (CORE_MODE || jobId.startsWith('core-') || jobId.startsWith('mock-')) {
      const now = new Date()
      // 配送日: 3営業日後・5営業日後（土日スキップ）
      function addBusinessDays(from: Date, days: number): Date {
        const d = new Date(from)
        let added = 0
        while (added < days) {
          d.setDate(d.getDate() + 1)
          const dow = d.getDay()
          if (dow !== 0 && dow !== 6) added++
        }
        return d
      }
      const eta1 = addBusinessDays(now, 3)
      const eta2 = addBusinessDays(now, 5)
      const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
      const mockData = {
        rates: [
          {
            serviceType: 'FedEx International Priority®',
            totalNetFedExCharge: '8750',
            estimatedDeliveryTimestamp: eta1.toISOString(),
            deliveryDate: eta1.toISOString().slice(0, 10),
            deliveryDayOfWeek: days[eta1.getDay()],
            packagingType: 'YOUR_PACKAGING',
            rateType: 'ACCOUNT',
            breakdown: {
              baseRate: 6400,
              volumeDiscount: 0,
              quantityDiscount: 0,
              importProcessingSurcharge: 580,
              fuelSurcharge: 1280,
              peakSurcharge: 490,
              residentialSurcharge: 0,
              deliveryAreaSurcharge: 0,
              saturdayDeliverySurcharge: 0,
              otherSurcharge: 0,
              insuredValue: 0,
              extraSurchargesJa: [],
              specialHandling: {},
              chargesPreview: { subtotal: 8750, tax: 875, total: 9625, fees: { serviceFee: 219, processingFee: 284 } },
            }
          },
          {
            serviceType: 'FedEx International Economy®',
            totalNetFedExCharge: '5980',
            estimatedDeliveryTimestamp: eta2.toISOString(),
            deliveryDate: eta2.toISOString().slice(0, 10),
            deliveryDayOfWeek: days[eta2.getDay()],
            packagingType: 'YOUR_PACKAGING',
            rateType: 'ACCOUNT',
            breakdown: {
              baseRate: 4200,
              volumeDiscount: 0,
              quantityDiscount: 0,
              importProcessingSurcharge: 580,
              fuelSurcharge: 840,
              peakSurcharge: 360,
              residentialSurcharge: 0,
              deliveryAreaSurcharge: 0,
              saturdayDeliverySurcharge: 0,
              otherSurcharge: 0,
              insuredValue: 0,
              extraSurchargesJa: [],
              specialHandling: {},
              chargesPreview: { subtotal: 5980, tax: 598, total: 6578, fees: { serviceFee: 150, processingFee: 194 } },
            }
          }
        ]
      }
      return NextResponse.json({ status: 'completed', message: 'mock completed', jobId, data: { success: true, ...mockData } })
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