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
    // 環境変数の確認
    console.log('環境変数確認:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定',
      nodeEnv: process.env.NODE_ENV
    });

    // 重要な環境変数の確認
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URLが設定されていません');
      return NextResponse.json(
        { error: 'データベース設定エラー: SUPABASE_URLが未設定' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabaseの認証キーが設定されていません');
      return NextResponse.json(
        { error: 'データベース設定エラー: 認証キーが未設定' },
        { status: 500 }
      );
    }

    // ユーザー認証チェック（user_id取得のため）
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('ユーザー認証状態:', {
      authenticated: !!user,
      userId: user?.id || 'null',
      userError: userError?.message || 'none'
    });

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

    console.log('Supabaseクライアント作成完了');

    // Service Role Keyでのクライアント作成も試す
    let serviceSupabase = null;
    try {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('Service Role Keyでのクライアント作成完了');
    } catch (serviceError) {
      console.log('Service Role Keyでのクライアント作成失敗:', serviceError);
    }

    // 使用するクライアントを決定
    const activeSupabase = serviceSupabase || supabase;
    console.log('使用するクライアント:', serviceSupabase ? 'Service Role' : 'Anonymous');

    // Supabase接続テスト
    try {
      console.log('Supabase接続テスト開始...');
      const { data: testData, error: testError } = await activeSupabase
        .from('quote_jobs')
        .select('count')
        .limit(1);
      
      console.log('Supabase接続テスト結果:', {
        success: !testError,
        error: testError
      });

      if (testError) {
        console.error('Supabase接続テストエラー:', testError);
        return NextResponse.json(
          { error: `データベース接続エラー: ${testError.message}` },
          { status: 500 }
        );
      }
    } catch (connectionError) {
      console.error('Supabase接続例外:', connectionError);
      return NextResponse.json(
        { error: 'データベース接続に失敗しました' },
        { status: 500 }
      );
    }

    // リクエストペイロードを準備
    const requestPayload = {
      quoteParams,
      packages,
      timestamp: new Date().toISOString()
    };

    console.log('リクエストペイロード準備完了:', JSON.stringify(requestPayload, null, 2));

    // quote_jobsテーブルにジョブを作成（user_idを追加）
    console.log('quote_jobsテーブルへの書き込みを開始...');
    const insertData: any = {
      status: 'pending',
      request_payload: requestPayload
    };

    // ユーザーがログインしている場合はuser_idを追加
    if (user) {
      insertData.user_id = user.id;
      console.log('ユーザーID追加:', user.id);
    } else {
      console.log('未ログインユーザー - user_idはnull');
    }

    const { data: jobData, error: insertError } = await activeSupabase
      .from('quote_jobs')
      .insert(insertData)
      .select('id')
      .single();

    console.log('Supabase書き込み結果:', {
      success: !insertError,
      jobData: jobData,
      error: insertError
    });

    if (insertError) {
      console.error('ジョブ作成エラー詳細:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      return NextResponse.json(
        { 
          error: `ジョブの作成に失敗しました: ${insertError.message}`,
          details: insertError.details,
          hint: insertError.hint
        },
        { status: 500 }
      );
    }

    if (!jobData || !jobData.id) {
      console.error('ジョブデータが返されませんでした:', jobData);
      return NextResponse.json(
        { error: 'ジョブIDが取得できませんでした' },
        { status: 500 }
      );
    }

    console.log('見積もりジョブを作成しました:', jobData.id);

    // バックグラウンド処理をトリガー
    try {
      // Next.js API Routeの場合、別エンドポイントを非同期で呼び出し
      const { siteUrl } = await import('@/lib/config');
      const processingUrl = `${siteUrl}/api/quote/process/${jobData.id}`;
      
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
            const { createClient: createServiceClient } = await import('@supabase/supabase-js');
            const errorSupabase = createServiceClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            await errorSupabase
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