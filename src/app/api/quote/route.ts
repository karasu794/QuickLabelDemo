import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireOrg } from '@/lib/org'
import { checkRate } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { validateQuoteRequest, formatValidationErrors, type ValidatedQuoteRequest } from '@/lib/validators/quote'
// CORE_MODE
import { CORE_MODE } from '@/lib/config/coreMode'
import { randomUUID } from 'crypto'

// 📝 注意: 型定義はZodから自動生成されるValidatedQuoteRequestを使用します
// 以前のQuoteParams, Package, QuoteRequestインターフェースは
// /lib/validators/quote.ts のZodスキーマから自動生成される型に置き換えられました

export async function POST(request: NextRequest) {
  try {
    // CORE_MODE: 未ログイン許可・擬似ジョブ応答（DB書き込みなし、Service Role未使用）
    if (CORE_MODE) {
      let rawBody: any
      try { rawBody = await request.json() } catch { return NextResponse.json({ error: '無効なリクエスト形式です' }, { status: 400 }) }
      const validationResult = validateQuoteRequest(rawBody)
      if (!validationResult.success) {
        const formattedErrors = formatValidationErrors(validationResult.error.format())
        return NextResponse.json({ error: '入力データが不正です', validationErrors: formattedErrors }, { status: 400 })
      }
      const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
      await checkRate(`ip:${ip}`)
      const jobId = `core-${randomUUID()}`
      return NextResponse.json({ success: true, jobId, message: 'CORE_MODE: 見積もりを受け付けました（擬似ジョブ）。' })
    }
    // Rate limit (per user if available, otherwise per IP)
    let userId: string | null = null
    try {
      const org = await requireOrg()
      userId = org.userId
    } catch {
      userId = null
    }
    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const key = userId ? `user:${userId}` : `ip:${ip}`
    const rate = await checkRate(key)
    if (!rate.success) {
      return NextResponse.json({ code: 'RATE_LIMIT', message: 'Too many requests' }, { status: 429 })
    }
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

    // ユーザー認証チェック（未ログインは401で早期終了）
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('ユーザー認証状態:', {
      authenticated: !!user,
      userId: user?.id || 'null',
      userError: userError?.message || 'none'
    });
    if (!user) {
      return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'ログインが必要です。' }, { status: 401 })
    }

    // 🛡️ リクエストボディの取得とバリデーション
    let rawBody;
    try {
      rawBody = await request.json();
    } catch (parseError) {
      console.error('🚫 JSON解析エラー:', parseError);
      return NextResponse.json({
        error: '無効なリクエスト形式です',
        details: 'JSONの形式が正しくありません',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    console.log('見積もりジョブリクエスト受信:', JSON.stringify(rawBody, null, 2));

    // Zodによる厳格なバリデーション
    const validationResult = validateQuoteRequest(rawBody);

    if (!validationResult.success) {
      console.error('🚫 バリデーションエラー:', validationResult.error.format());
      
      const formattedErrors = formatValidationErrors(validationResult.error.format());
      
      return NextResponse.json({
        error: '入力データが不正です',
        details: 'リクエストデータの形式または内容に問題があります',
        validationErrors: formattedErrors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // ✅ バリデーション成功 - 型安全なデータとして使用
    const { quoteParams, packages }: ValidatedQuoteRequest = validationResult.data;
    console.log('✅ バリデーション成功。処理を続行します。');

    console.log('Supabaseクライアント作成完了');

    // Supabase接続テスト
    try {
      console.log('Supabase接続テスト開始...');
      const { data: testData, error: testError } = await supabase
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

    // quote_jobsテーブルにジョブを作成（必ず user_id を付与）
    console.log('quote_jobsテーブルへの書き込みを開始...');
    const insertData: any = {
      status: 'pending',
      request_payload: requestPayload
    };

    insertData.user_id = user.id;
    console.log('ユーザーID追加:', user.id);

    const { data: jobData, error: insertError } = await supabase
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

    const jobIdCreated = (jobData as any)?.id as string | undefined
    if (!jobIdCreated) {
      console.error('ジョブデータが返されませんでした:', jobData);
      return NextResponse.json(
        { error: 'ジョブIDが取得できませんでした' },
        { status: 500 }
      );
    }

    console.log('見積もりジョブを作成しました:', jobIdCreated);

    // バックグラウンド処理をトリガー
    try {
      // Next.js API Routeの場合、別エンドポイントを非同期で呼び出し
      const { siteUrl } = await import('@/lib/config');
      const processingUrl = `${siteUrl}/api/quote/process/${jobIdCreated}`;
      
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
              .eq('id', jobIdCreated);
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
      jobId: jobIdCreated,
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

// SMOKE-FIX: add lightweight GET for /api/quote
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'quote',
    method: 'GET',
  })
}