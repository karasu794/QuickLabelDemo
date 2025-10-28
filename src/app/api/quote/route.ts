export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
// optional public access for quote
import { getOptionalUser } from '@/lib/auth/optionalAuth'
import { checkRate } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'
import { validateQuoteRequest, formatValidationErrors, type ValidatedQuoteRequest } from '@/lib/validators/quote'
import { getPublicQuotesOrgId } from '@/lib/config/guestOrg'
// CORE_MODE
import { CORE_MODE } from '@/lib/config/coreMode'
import { randomUUID } from 'crypto'
import { toArray } from '@/lib/utils/safe'
import { getServiceFeePercentage } from '@/lib/settings/getServiceFeePercentage'
import { withTrace } from '@/lib/trace'
import { normalizeToQuotes } from '@/lib/quote/normalize'

// 📝 注意: 型定義はZodから自動生成されるValidatedQuoteRequestを使用します
// 以前のQuoteParams, Package, QuoteRequestインターフェースは
// /lib/validators/quote.ts のZodスキーマから自動生成される型に置き換えられました

export async function POST(request: NextRequest) {
  return withTrace('api.quote', request, async ({ isMock, headers: traceHeaders }) => {
  try {
    // E2E/開発用モック: Cookie `core-mode=mock` または env `CORE_MODE=mock` でダミーレートを返す
    if (isMock) {
      let rawBody: any
      try { rawBody = await request.json() } catch { rawBody = {} }
      const pkgs = Array.isArray(rawBody?.packages) && rawBody.packages.length > 0
        ? rawBody.packages
        : [{ id: 1, packagingType: 'YOUR_PACKAGING', weight: 1, length: 10, width: 10, height: 10, declaredValue: 0 }]
      const jobId = `mock-${randomUUID()}`
      // E2E/開発用: 即時レートも同梱（サービス画面がショートカット表示できるように）
      const quotes = [
        {
          service: 'FEDEX_INTERNATIONAL_PRIORITY',
          total: 12345,
          eta: new Date().toISOString().slice(0,10),
          breakdown: {
            baseRate: 15000,
            volumeDiscount: 3000,
            importProcessingSurcharge: 100,
            fuelSurcharge: 500,
            peakSurcharge: 0,
            residentialSurcharge: 0,
            deliveryAreaSurcharge: 0,
            additionalHandlingSurcharge: 0,
            otherSurcharge: 0,
          }
        }
      ]
      return NextResponse.json({ ok: true, jobId, mock: true, packages: pkgs, quotes }, { headers: traceHeaders })
    }

    // CORE_MODE: 未ログイン許可・擬似ジョブ応答（DB書き込みなし、Service Role未使用）
    if (CORE_MODE) {
      let rawBody: any
      try { rawBody = await request.json() } catch { return NextResponse.json({ error: '無効なリクエスト形式です' }, { status: 400 }) }
      const validationResult = validateQuoteRequest(rawBody)
      if (!validationResult.success) {
        // 仕様: flatten() をWARNで詳細出力
        try { console.warn('Zod validation error:', JSON.stringify(validationResult.error.flatten(), null, 2)) } catch {}
        const formattedErrors = formatValidationErrors(validationResult.error.format())
        return NextResponse.json({ ok: false, code: 'VALIDATION_ERROR', errors: formattedErrors }, { status: 422 })
      }
      // packages を正規化して最低限のバリデーション
      const pkgsIn = toArray<any>(rawBody?.packages)
      const norm = pkgsIn.map((p: any, i: number) => ({
        id: Number(p?.id ?? i + 1),
        packagingType: p?.packagingType || 'YOUR_PACKAGING',
        weight: Number(p?.weight ?? 0),
        length: Number(p?.length ?? 0),
        width: Number(p?.width ?? 0),
        height: Number(p?.height ?? 0),
        declaredValue: Number(p?.declaredValue ?? 0),
      }))
      const validPackages = norm.filter((p) => p.weight > 0 && p.length >= 0 && p.width >= 0 && p.height >= 0)
      if (validPackages.length === 0) {
        return NextResponse.json(
          { ok: false, code: 'PACKAGES_REQUIRED', errors: { packages: ['少なくとも1件の荷物（重さ・サイズ）が必要です。'] } },
          { status: 422 }
        )
      }

      const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
      await checkRate(`ip:${ip}`)
      const jobId = `core-${randomUUID()}`
      return NextResponse.json({ ok: true, jobId }, { headers: traceHeaders })
    }
    // Rate limit (per user if available, otherwise per IP)
    const opt = await getOptionalUser()
    const userId: string | null = opt?.id ?? null
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

    // 匿名許可: 認証は任意
    const supabase = createClient();

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
      // 仕様: flatten() をWARNで詳細出力
      try { console.warn('Zod validation error:', JSON.stringify(validationResult.error.flatten(), null, 2)); } catch {}
      const formattedErrors = formatValidationErrors(validationResult.error.format());
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', errors: formattedErrors },
        { status: 422 }
      );
    }

    // ✅ バリデーション成功 - 型安全なデータとして使用
    const { quoteParams, packages }: ValidatedQuoteRequest = validationResult.data;
    // packages を正規化し最低限のバリデーション
    const pkgsIn = toArray<any>(packages)
    const norm = pkgsIn.map((p: any, i: number) => ({
      id: Number(p?.id ?? i + 1),
      packagingType: p?.packagingType || 'YOUR_PACKAGING',
      weight: Number(p?.weight ?? 0),
      length: Number(p?.length ?? 0),
      width: Number(p?.width ?? 0),
      height: Number(p?.height ?? 0),
      declaredValue: Number(p?.declaredValue ?? 0),
    }))
    const validPackages = norm.filter((p) => p.weight > 0 && p.length >= 0 && p.width >= 0 && p.height >= 0)
    if (validPackages.length === 0) {
      return NextResponse.json(
        { ok: false, code: 'PACKAGES_REQUIRED', errors: { packages: ['少なくとも1件の荷物（重さ・サイズ）が必要です。'] } },
        { status: 422 }
      )
    }
    // higherInsurance を補完（declaredValue > 0 が一つでもあればON）
    const anyDeclared = norm.some((p) => Number(p.declaredValue ?? 0) > 0)
    let effectiveHigherInsurance = (quoteParams as any).higherInsurance ?? false
    effectiveHigherInsurance = Boolean(effectiveHigherInsurance || anyDeclared)
    const totalDeclaredValue = norm.reduce((sum, p) => sum + Number(p.declaredValue ?? 0), 0)
    if (effectiveHigherInsurance && totalDeclaredValue <= 0) {
      console.warn('higherInsurance=true but declaredValue=0: coerced to false')
      effectiveHigherInsurance = false
    }

    const effectiveParams = { ...(quoteParams as any), higherInsurance: effectiveHigherInsurance }

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

    // リクエストペイロードを準備（保存用は非PIIに限定）
    const requestPayload = {
      quoteParams: effectiveParams,
      packages: validPackages,
      timestamp: new Date().toISOString()
    };

    console.log('リクエストペイロード準備完了:', JSON.stringify(requestPayload, null, 2));

    // quote_jobsテーブルにジョブを作成（匿名時は Public Quotes org に紐付け、PIIを保存しない）
    console.log('quote_jobsテーブルへの書き込みを開始...');
    const insertData: any = {
      status: 'pending'
    };

    if (userId) {
      // ログイン時: 組織IDを解決（なければPublic Quotes orgにフォールバック）
      let orgIdForInsert: string | null = null;
      try {
        const { data: mem } = await (supabase
          .from('organization_members') as any)
          .select('org_id')
          .eq('user_id', userId as any)
          .limit(1)
          .maybeSingle();
        orgIdForInsert = (mem as any)?.org_id ?? null;
      } catch {}

      if (!orgIdForInsert) {
        orgIdForInsert = getPublicQuotesOrgId();
      }

      if (!orgIdForInsert) {
        // ENV未設定など想定外は匿名NODBでフォールバック（core- jobId を返す）。
        const jobId = `core-${randomUUID()}`
      return NextResponse.json({ success: true, jobId, mode: 'user-fallback' }, { headers: traceHeaders })
      }

      insertData.user_id = userId;
      insertData.org_id = orgIdForInsert;
      insertData.request_payload = requestPayload; // 既存互換: ただし保存先でPII取り扱いに注意
      console.log('ユーザーID追加:', userId);
    } else {
      // 未ログイン: Public Quotes org_id を使用。user_id は付与しない。
      const publicOrgId = getPublicQuotesOrgId();
      if (publicOrgId) {
        insertData.org_id = publicOrgId;
        // 非PIIフィールドのみ格納
        insertData.request_payload = {
          quoteParams: {
            originCountry: quoteParams.originCountry,
            originPostalCode: quoteParams.originPostalCode,
            destinationCountry: quoteParams.destinationCountry,
            destinationPostalCode: quoteParams.destinationPostalCode,
          },
          packagesSummary: Array.isArray(packages) ? packages.length : 0,
          timestamp: requestPayload.timestamp,
        };
        console.log('匿名ユーザー: Public Quotes org で保存', { orgId: publicOrgId });
      } else {
        // ENV未設定など想定外は匿名NODBでフォールバック（core- jobId を返す）。
        const jobId = `core-${randomUUID()}`
        return NextResponse.json({ success: true, jobId, mode: 'anon-fallback' }, { headers: traceHeaders })
      }
    }

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
            body: JSON.stringify({
              jobId: jobIdCreated,
              // 正規化済みパッケージとオプション配列を渡す
              packages: (requestPayload as any).packages,
              commodities: Array.isArray((rawBody as any)?.commodities) ? (rawBody as any).commodities : [],
              services: Array.isArray((rawBody as any)?.services) ? (rawBody as any).services : [],
              quoteParams: effectiveParams,
            }),
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

    // サービス手数料率を同梱
    const serviceFeePercentage = await getServiceFeePercentage()
    // 既存動作: jobId を返す
    // 追加: 即時見積結果（あれば）を正規化して添付（将来UIが利用）
    const quotes = (() => {
      try { return normalizeToQuotes({ rates: [] }) } catch { return [] }
    })()
    // 最終チェック: quotes の total/currency が欠落していたら非mockでは400
    if (!isMock && Array.isArray(quotes)) {
      for (const q of quotes) {
        if (typeof q?.total !== 'number' || !q?.currency) {
          return NextResponse.json({ ok: false, code: 'QUOTE_NORMALIZATION_ERROR' }, { status: 400, headers: traceHeaders })
        }
      }
    }
    return NextResponse.json({ ok: true, jobId: jobIdCreated, serviceFeePercentage, quotes }, { headers: traceHeaders });

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
  })
}

// SMOKE-FIX: add lightweight GET for /api/quote
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'quote',
    method: 'GET',
  })
}