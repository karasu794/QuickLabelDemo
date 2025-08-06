/**
 * Supabase診断API
 * サーバーサイドでの詳細診断とRLSポリシー検証
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runComprehensiveDiagnosis } from '@/lib/supabase/diagnostics'

// Service Role Keyクライアント（RLSバイパス用）
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 通常クライアント（ユーザー権限）
function createUserClient(authToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase user credentials')
  }
  
  const client = createClient(supabaseUrl, anonKey)
  
  if (authToken) {
    // ユーザーのトークンをセット
    client.auth.setSession({ access_token: authToken, refresh_token: '' } as any)
  }
  
  return client
}

/**
 * RLSポリシー検証
 */
async function testRLSPolicies(userId: string) {
  console.log('[SERVER] 🔒 Testing RLS policies for user:', userId)
  
  const results = {
    adminAccess: { success: false, duration: 0, error: null as string | null },
    userAccess: { success: false, duration: 0, error: null as string | null },
    rls: {
      enabled: false,
      policyCount: 0,
      policies: [] as any[]
    }
  }
  
  try {
    // 1. 管理者権限でのアクセス（RLSバイパス）
    const adminStart = Date.now()
    const adminClient = createAdminClient()
    
    const { data: adminData, error: adminError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    results.adminAccess = {
      success: !adminError,
      duration: Date.now() - adminStart,
      error: adminError?.message || null
    }
    
    console.log('[SERVER] 🔒 Admin access result:', results.adminAccess)
    
    // 2. ユーザー権限でのアクセス（RLS適用）
    const userStart = Date.now()
    const userClient = createUserClient()
    
    const { data: userData, error: userError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    results.userAccess = {
      success: !userError,
      duration: Date.now() - userStart,
      error: userError?.message || null
    }
    
    console.log('[SERVER] 🔒 User access result:', results.userAccess)
    
    // 3. RLS設定の確認
    try {
      const { data: rlsInfo } = await adminClient
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'profiles')
      
      results.rls = {
        enabled: true, // profilesテーブルのRLS状態
        policyCount: rlsInfo?.length || 0,
        policies: rlsInfo || []
      }
      
      console.log('[SERVER] 🔒 RLS info:', results.rls)
      
    } catch (rlsError) {
      console.log('[SERVER] 🔒 Could not fetch RLS info:', rlsError)
    }
    
  } catch (error) {
    console.error('[SERVER] 🚨 RLS test failed:', error)
  }
  
  return results
}

/**
 * サーバーサイド診断の実行
 */
async function runServerDiagnosis(userId?: string) {
  console.log('[SERVER] 🩺 Starting server-side diagnosis...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  const client = createClient(supabaseUrl, anonKey)
  
  // 包括的診断の実行
  const comprehensiveDiagnosis = await runComprehensiveDiagnosis(client, userId)
  
  // RLS検証（ユーザーIDがある場合）
  let rlsTest = null
  if (userId) {
    rlsTest = await testRLSPolicies(userId)
  }
  
  // サーバー環境情報
  const serverEnvironment = {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    vercelRegion: process.env.VERCEL_REGION,
    vercelEnv: process.env.VERCEL_ENV,
    nextRuntime: process.env.NEXT_RUNTIME,
    timestamp: new Date().toISOString()
  }
  
  return {
    client: comprehensiveDiagnosis,
    rls: rlsTest,
    server: serverEnvironment
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  try {
    console.log('[SERVER] 🩺 DIAGNOSIS API - Starting diagnosis...', { userId })
    
    const diagnosis = await runServerDiagnosis(userId || undefined)
    
    console.log('[SERVER] 🩺 DIAGNOSIS API - Completed successfully')
    
    return NextResponse.json({
      success: true,
      diagnosis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[SERVER] 🚨 DIAGNOSIS API - Failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, clientDiagnosis } = body
    
    console.log('[SERVER] 🩺 DIAGNOSIS API - Received client diagnosis:', clientDiagnosis)
    
    // サーバーサイド診断の実行
    const serverDiagnosis = await runServerDiagnosis(userId)
    
    // クライアント vs サーバー比較分析
    const comparison = {
      basicConnection: {
        client: clientDiagnosis?.basicConnection,
        server: serverDiagnosis.client.basicConnection,
        difference: Math.abs(
          (clientDiagnosis?.basicConnection?.duration || 0) - 
          serverDiagnosis.client.basicConnection.duration
        )
      },
      authState: {
        client: clientDiagnosis?.authState,
        server: serverDiagnosis.client.authState
      },
      environment: {
        client: clientDiagnosis?.environment,
        server: serverDiagnosis.server
      }
    }
    
    console.log('[SERVER] 🩺 DIAGNOSIS API - Comparison completed')
    
    return NextResponse.json({
      success: true,
      server: serverDiagnosis,
      client: clientDiagnosis,
      comparison,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[SERVER] 🚨 DIAGNOSIS API POST - Failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}