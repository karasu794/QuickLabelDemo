import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type QuoteJobRow = Database['public']['Tables']['quote_jobs']['Row']

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params;
    console.log(`デバッグ: ジョブ詳細取得 - ジョブID: ${jobId}`);

    const supabase = createClient();
    
    // ユーザー認証状態を確認
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('ユーザー認証状態:', {
      authenticated: !!user,
      userId: user?.id || 'null'
    });

    // ジョブを取得（user_id条件も含めてセキュリティチェック）
    let query = supabase
      .from('quote_jobs')
      .select('*')
      .eq('id', jobId as QuoteJobRow['id']);

    // ログインユーザーの場合は自分のジョブのみ、未ログインの場合はuser_idがnullのジョブのみ
    if (user) {
      query = query.eq('user_id', user.id as QuoteJobRow['user_id']);
    } else {
      query = query.is('user_id', null);
    }

    const { data: job, error: fetchError } = await (query as any).single();

    if (fetchError || !job) {
      console.error('ジョブ取得エラー:', fetchError);
      return NextResponse.json(
        { error: 'ジョブが見つからないか、アクセス権限がありません' },
        { status: 404 }
      );
    }

    // 環境変数の確認
    const { siteUrl, isVercel } = await import('@/lib/config');
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定',
          // 🚨 基幹仕様対応: 汎用変数表示から動的切り替え表示に変更
    FEDEX_EXPORT_API_KEY: process.env.FEDEX_EXPORT_API_KEY ? '設定済み' : '未設定',
    FEDEX_EXPORT_SECRET_KEY: process.env.FEDEX_EXPORT_SECRET_KEY ? '設定済み' : '未設定',
    FEDEX_EXPORT_ACCOUNT_NUMBER: process.env.FEDEX_EXPORT_ACCOUNT_NUMBER ? '設定済み' : '未設定',
    FEDEX_IMPORT_API_KEY: process.env.FEDEX_IMPORT_API_KEY ? '設定済み' : '未設定',
    FEDEX_IMPORT_SECRET_KEY: process.env.FEDEX_IMPORT_SECRET_KEY ? '設定済み' : '未設定',
    FEDEX_IMPORT_ACCOUNT_NUMBER: process.env.FEDEX_IMPORT_ACCOUNT_NUMBER ? '設定済み' : '未設定',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? '設定済み' : '未設定',
      CALCULATED_SITE_URL: siteUrl,
      IS_VERCEL_ENVIRONMENT: isVercel
    };

    // 最近の失敗したジョブも確認
    const { data: recentFailedJobs, error: recentError } = await supabase
      .from('quote_jobs')
      .select('id, status, error_message, created_at, updated_at, completed_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('最近の失敗ジョブ取得エラー:', recentError);
    }

    // 今日のジョブ統計
    const { data: todayStats, error: statsError } = await supabase
      .from('quote_jobs')
      .select('status')
      .gte('created_at', new Date().toISOString().split('T')[0])
      .returns<Pick<QuoteJobRow, 'status'>[]>();

    const statusCounts = todayStats?.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        error_message: job.error_message,
        created_at: job.created_at,
        updated_at: job.updated_at,
        completed_at: job.completed_at,
        request_payload: job.request_payload,
        response_payload: job.response_payload
      },
      environment: envCheck,
      recentFailedJobs: recentFailedJobs || [],
      todayStats: statusCounts,
      debug: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION || 'local'
      }
    });

  } catch (error) {
    console.error('デバッグAPI エラー:', error);
    return NextResponse.json(
      { 
        error: 'デバッグ情報の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 