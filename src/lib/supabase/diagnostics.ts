/**
 * Supabase接続診断ユーティリティ
 * Vercel環境での問題特定のための詳細診断機能
 */

import { createClient } from '@supabase/supabase-js'

// 診断結果の型定義
export interface DiagnosisResult {
  success: boolean
  duration: number
  error?: string
  data?: any
  metadata?: Record<string, any>
}

export interface ConnectionDiagnosis {
  basicConnection: DiagnosisResult
  authState: DiagnosisResult
  profileQuery: DiagnosisResult
  environment: Record<string, any>
  latency: Record<string, number>
}

/**
 * 基本接続テスト - 最軽量クエリでSupabase接続確認
 */
export async function testBasicConnection(supabase: any): Promise<DiagnosisResult> {
  const start = Date.now()
  
  try {
    console.log('[DIAGNOSIS] 🔍 Testing basic Supabase connection...')
    
    // 最小限のクエリ（データ取得なし、接続のみテスト）
    const { data, error, count } = await Promise.race([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Basic connection timeout after 8 seconds')), 8000)
      )
    ])
    
    const duration = Date.now() - start
    
    if (error) {
      console.log('[DIAGNOSIS] ❌ Basic connection failed:', error)
      return {
        success: false,
        duration,
        error: error.message,
        metadata: { errorCode: error.code, errorDetails: error.details }
      }
    }
    
    console.log('[DIAGNOSIS] ✅ Basic connection successful:', { duration, count })
    return {
      success: true,
      duration,
      data: { count },
      metadata: { 
        connectionType: 'head_request',
        hasCount: count !== null
      }
    }
    
  } catch (error) {
    const duration = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.log('[DIAGNOSIS] 🚨 Basic connection exception:', { errorMessage, duration })
    return {
      success: false,
      duration,
      error: errorMessage,
      metadata: {
        errorType: typeof error,
        isTimeout: errorMessage.includes('timeout')
      }
    }
  }
}

/**
 * 認証状態の詳細診断
 */
export async function diagnosisAuthState(supabase: any): Promise<DiagnosisResult> {
  const start = Date.now()
  
  try {
    console.log('[DIAGNOSIS] 🔍 Analyzing authentication state...')
    
    const { data: { session }, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth diagnosis timeout after 5 seconds')), 5000)
      )
    ])
    
    const duration = Date.now() - start
    
    if (error) {
      console.log('[DIAGNOSIS] ❌ Auth state diagnosis failed:', error)
      return {
        success: false,
        duration,
        error: error.message
      }
    }
    
    const authDiagnosis = {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token,
      tokenLength: session?.access_token?.length || 0,
      expiresAt: session?.expires_at,
      currentTime: Math.floor(Date.now() / 1000),
      isExpired: session ? Math.floor(Date.now() / 1000) > session.expires_at : null,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userMetadata: session?.user?.user_metadata,
      appMetadata: session?.user?.app_metadata,
      tokenType: session?.token_type,
      providerToken: !!session?.provider_token,
      lastSignIn: session?.user?.last_sign_in_at
    }
    
    console.log('[DIAGNOSIS] 📊 Auth state analysis:', authDiagnosis)
    return {
      success: true,
      duration,
      data: authDiagnosis,
      metadata: {
        sessionValid: !!session && !authDiagnosis.isExpired,
        hasUserMetadata: Object.keys(session?.user?.user_metadata || {}).length > 0
      }
    }
    
  } catch (error) {
    const duration = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.log('[DIAGNOSIS] 🚨 Auth diagnosis exception:', { errorMessage, duration })
    return {
      success: false,
      duration,
      error: errorMessage,
      metadata: {
        errorType: typeof error,
        isTimeout: errorMessage.includes('timeout')
      }
    }
  }
}

/**
 * プロフィールクエリテスト（元の問題クエリの診断）
 */
export async function testProfileQuery(supabase: any, userId: string): Promise<DiagnosisResult> {
  const start = Date.now()
  
  try {
    console.log('[DIAGNOSIS] 🔍 Testing problematic profile query...', { userId })
    
    // 元の問題となっているクエリを実行
    const { data, error } = await Promise.race([
      supabase.from('profiles').select('role').eq('id', userId).single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout after 12 seconds')), 12000)
      )
    ])
    
    const duration = Date.now() - start
    
    if (error) {
      console.log('[DIAGNOSIS] ❌ Profile query failed:', error)
      return {
        success: false,
        duration,
        error: error.message,
        metadata: { 
          errorCode: error.code,
          errorDetails: error.details,
          hint: error.hint,
          userId: userId
        }
      }
    }
    
    console.log('[DIAGNOSIS] ✅ Profile query successful:', { duration, role: data?.role })
    return {
      success: true,
      duration,
      data: data,
      metadata: {
        hasRole: !!data?.role,
        roleValue: data?.role,
        userId: userId
      }
    }
    
  } catch (error) {
    const duration = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.log('[DIAGNOSIS] 🚨 Profile query exception:', { errorMessage, duration, userId })
    return {
      success: false,
      duration,
      error: errorMessage,
      metadata: {
        errorType: typeof error,
        isTimeout: errorMessage.includes('timeout'),
        userId: userId
      }
    }
  }
}

/**
 * 環境情報の収集
 */
export function collectEnvironmentInfo(): Record<string, any> {
  const envInfo = {
    // Runtime environment
    isClient: typeof window !== 'undefined',
    isServer: typeof window === 'undefined',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    
    // Vercel specific
    vercelEnv: process.env.VERCEL_ENV,
    vercelRegion: process.env.VERCEL_REGION,
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    vercelUrl: process.env.VERCEL_URL,
    
    // Next.js environment
    nodeEnv: process.env.NODE_ENV,
    nextRuntime: process.env.NEXT_RUNTIME,
    
    // Time and location
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown',
    locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    timestamp: new Date().toISOString(),
    
    // Supabase config
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Browser info (client only)
    ...(typeof window !== 'undefined' && {
      windowLocation: window.location.href,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown'
    })
  }
  
  console.log('[DIAGNOSIS] 🌍 Environment info collected:', envInfo)
  return envInfo
}

/**
 * ネットワーク遅延測定
 */
export async function measureNetworkLatency(): Promise<Record<string, number>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.log('[DIAGNOSIS] ❌ No Supabase URL found for latency test')
    return { error: -1 }
  }
  
  const endpoints = [
    { name: 'rest', url: `${supabaseUrl}/rest/v1/` },
    { name: 'auth', url: `${supabaseUrl}/auth/v1/health` },
    { name: 'realtime', url: `${supabaseUrl}/realtime/v1/` }
  ]
  
  const latencies: Record<string, number> = {}
  
  console.log('[DIAGNOSIS] 🌐 Measuring network latency to Supabase endpoints...')
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now()
      
      // HEADリクエストで接続テスト（データ転送最小限）
      await Promise.race([
        fetch(endpoint.url, { 
          method: 'HEAD',
          cache: 'no-cache'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Latency test timeout')), 10000)
        )
      ])
      
      const duration = Date.now() - start
      latencies[endpoint.name] = duration
      
      console.log(`[DIAGNOSIS] 📊 ${endpoint.name} latency: ${duration}ms`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      latencies[endpoint.name] = -1
      console.log(`[DIAGNOSIS] ❌ ${endpoint.name} latency test failed:`, errorMessage)
    }
    
    // エンドポイント間で少し待機
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return latencies
}

/**
 * 包括的診断の実行
 */
export async function runComprehensiveDiagnosis(supabase: any, userId?: string): Promise<ConnectionDiagnosis> {
  console.log('[DIAGNOSIS] 🚀 Starting comprehensive Supabase diagnosis...')
  
  const [
    basicConnection,
    authState,
    profileQuery,
    environment,
    latency
  ] = await Promise.all([
    testBasicConnection(supabase),
    diagnosisAuthState(supabase),
    userId ? testProfileQuery(supabase, userId) : Promise.resolve({
      success: false,
      duration: 0,
      error: 'No userId provided'
    }),
    Promise.resolve(collectEnvironmentInfo()),
    measureNetworkLatency()
  ])
  
  const diagnosis: ConnectionDiagnosis = {
    basicConnection,
    authState,
    profileQuery,
    environment,
    latency
  }
  
  console.log('[DIAGNOSIS] 📋 Comprehensive diagnosis completed:', diagnosis)
  
  // 診断結果サマリーの表示
  console.log('[DIAGNOSIS] 📊 DIAGNOSIS SUMMARY:')
  console.log(`  Basic Connection: ${basicConnection.success ? '✅' : '❌'} (${basicConnection.duration}ms)`)
  console.log(`  Auth State: ${authState.success ? '✅' : '❌'} (${authState.duration}ms)`)
  console.log(`  Profile Query: ${profileQuery.success ? '✅' : '❌'} (${profileQuery.duration}ms)`)
  console.log(`  Environment: ${environment.vercelEnv || 'local'} / ${environment.vercelRegion || 'N/A'}`)
  console.log(`  Latency: REST ${latency.rest}ms, Auth ${latency.auth}ms, Realtime ${latency.realtime}ms`)
  
  return diagnosis
}