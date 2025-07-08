import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 新しいリクエストボディの型定義
interface QuoteParams {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  originStateCode: string
  originCityName: string
  destinationStateCode: string
  destinationCityName: string
}

interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
}

interface QuoteRequest {
  quoteParams: QuoteParams
  packages: Package[]
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    console.log('見積もりジョブリクエスト受信:', JSON.stringify(body, null, 2));

    const { quoteParams, packages } = body;

    // バリデーション
    if (!quoteParams.originCountry || !quoteParams.destinationCountry) {
      return NextResponse.json(
        { error: '出荷地と仕向地の国を選択してください' },
        { status: 400 }
      );
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json(
        { error: 'パッケージ情報が必要です' },
        { status: 400 }
      );
    }

    // パッケージの重量をチェック
    for (const pkg of packages) {
      if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
        return NextResponse.json(
          { error: 'すべてのパッケージの重量を入力してください' },
          { status: 400 }
        );
      }
    }

    // Supabaseクライアントを作成
    const supabase = createClient();

    // リクエストペイロードを準備
    const requestPayload = {
      quoteParams,
      packages,
      timestamp: new Date().toISOString()
    };

    // quote_jobsテーブルにジョブを作成
    const { data: jobData, error: insertError } = await supabase
      .from('quote_jobs')
      .insert({
        status: 'pending',
        request_payload: requestPayload as any
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('ジョブ作成エラー:', insertError);
      return NextResponse.json(
        { error: 'ジョブの作成に失敗しました' },
        { status: 500 }
      );
    }

    console.log('見積もりジョブを作成しました:', jobData.id);

    // バックグラウンド処理をトリガー
    try {
      // Next.js API Routeの場合、別エンドポイントを非同期で呼び出し
      const processingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/quote/process/${jobData.id}`;
      
      // 非同期で処理を開始（await不要）
      setTimeout(async () => {
        try {
          console.log('バックグラウンド処理を開始します:', processingUrl);
          
          // タイムアウト処理を手動で実装
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000); // 55秒でタイムアウト
          
          const response = await fetch(processingUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.error('バックグラウンド処理が失敗しました:', response.status, response.statusText);
          } else {
            console.log('バックグラウンド処理が正常に完了しました');
          }
        } catch (fetchError) {
          console.error('バックグラウンド処理でエラーが発生しました:', fetchError);
          
          // エラーの場合、ジョブステータスを更新
          try {
            const supabase = createClient();
            await supabase
              .from('quote_jobs')
              .update({
                status: 'failed',
                error_message: fetchError instanceof Error ? fetchError.message : 'バックグラウンド処理でエラーが発生しました',
                completed_at: new Date().toISOString()
              })
              .eq('id', jobData.id);
          } catch (dbError) {
            console.error('エラー状態の更新に失敗しました:', dbError);
          }
        }
      }, 0); // 即座に実行
    } catch (error) {
      console.error('バックグラウンド処理トリガーエラー:', error);
    }

    // ジョブIDをすぐに返却
    return NextResponse.json({
      success: true,
      jobId: jobData.id,
      message: '見積もりリクエストを受け付けました。処理中です...'
    });

  } catch (error) {
    console.error('見積もりジョブ作成エラー:', error);
    
    let errorMessage = '見積もりリクエストの受付に失敗しました';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'このエンドポイントはPOSTリクエストのみ対応しています' },
    { status: 405 }
  );
} 