import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params;
    console.log(`ジョブステータス確認 - ジョブID: ${jobId}`);

    // Supabaseクライアントを作成
    const supabase = createClient();

    // ユーザー認証状態を確認
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('ユーザー認証状態:', {
      authenticated: !!user,
      userId: user?.id || 'null'
    });

    // ジョブを取得（user_id条件も含めてセキュリティチェック）
    type QuoteJobRow = Database['public']['Tables']['quote_jobs']['Row']
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