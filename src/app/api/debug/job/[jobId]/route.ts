import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params;
    console.log(`デバッグ: ジョブID ${jobId} の詳細情報を取得`);

    // Service Role Keyを使用してSupabaseクライアントを作成
    const supabase = createServiceRoleClient();

    // ジョブの詳細を取得
    const { data: job, error: fetchError } = await supabase
      .from('quote_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.error('ジョブ取得エラー:', fetchError);
      return NextResponse.json(
        { error: 'ジョブが見つかりません', details: fetchError },
        { status: 404 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    // 環境変数の確認
    const { siteUrl, isVercel } = await import('@/lib/config');
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定',
      FEDEX_API_KEY: process.env.FEDEX_API_KEY ? '設定済み' : '未設定',
      FEDEX_SECRET_KEY: process.env.FEDEX_SECRET_KEY ? '設定済み' : '未設定',
      FEDEX_ACCOUNT_NUMBER: process.env.FEDEX_ACCOUNT_NUMBER ? '設定済み' : '未設定',
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
      .gte('created_at', new Date().toISOString().split('T')[0]);

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