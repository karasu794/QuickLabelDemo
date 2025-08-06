import { NextResponse } from 'next/server'

/**
 * Vercel本番環境での環境変数診断用APIエンドポイント
 * セキュリティを考慮し、関連する環境変数のみを返却
 */
export async function GET() {
  try {
    // ========== VERCEL DEBUG: 環境変数診断 ==========
    console.log('[SERVER] 🔍 VERCEL DEBUG - Environment Variables Diagnostic API called')
    
    // セキュリティフィルタリング：必要な環境変数のみを取得
    const relevantEnvVars = {
      // ========== 基本環境情報 ==========
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
      
      // ========== Supabase 環境変数 ==========
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      SUPABASE_SERVICE_ROLE_KEY_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      
      // ========== FedEx API 環境変数 ==========
      FEDEX_API_KEY_EXISTS: !!process.env.FEDEX_API_KEY,
      FEDEX_SECRET_KEY_EXISTS: !!process.env.FEDEX_SECRET_KEY,
      FEDEX_ACCOUNT_NUMBER_EXISTS: !!process.env.FEDEX_ACCOUNT_NUMBER,
      FEDEX_METER_NUMBER_EXISTS: !!process.env.FEDEX_METER_NUMBER,
      
      // ========== その他のAPI環境変数 ==========
      STRIPE_SECRET_KEY_EXISTS: !!process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_EXISTS: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      
      // ========== 実行時情報 ==========
      AWS_REGION: process.env.AWS_REGION,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      AWS_LAMBDA_FUNCTION_VERSION: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      
      // ========== 診断用メタデータ ==========
      TIMESTAMP: new Date().toISOString(),
      USER_AGENT: typeof process !== 'undefined' ? 'Server-Side' : 'Client-Side',
      PLATFORM: process.platform,
      NODE_VERSION: process.version
    }

    // 環境変数の存在状況をサマリー
    const envSummary = {
      totalRelevantVars: Object.keys(relevantEnvVars).length,
      supabaseConfigured: !!(relevantEnvVars.NEXT_PUBLIC_SUPABASE_URL && relevantEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY_EXISTS),
      fedexConfigured: !!(relevantEnvVars.FEDEX_API_KEY_EXISTS && relevantEnvVars.FEDEX_SECRET_KEY_EXISTS),
      stripeConfigured: !!(relevantEnvVars.STRIPE_SECRET_KEY_EXISTS && relevantEnvVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_EXISTS),
      vercelDeployment: !!(relevantEnvVars.VERCEL_ENV && relevantEnvVars.VERCEL_URL)
    }

    console.log('[SERVER] 🔍 VERCEL DEBUG - Environment summary:', envSummary)

    return NextResponse.json({
      success: true,
      message: 'Environment variables diagnostic completed',
      environment: relevantEnvVars,
      summary: envSummary,
      diagnosticInfo: {
        apiVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        endpoint: '/api/debug/env'
      }
    })

  } catch (error) {
    console.error('[SERVER] 🔍 VERCEL DEBUG - Environment diagnostic error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve environment variables',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * セキュリティ上の理由でPOSTメソッドは無効化
 */
export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed',
    message: 'This diagnostic endpoint only supports GET requests'
  }, { status: 405 })
}