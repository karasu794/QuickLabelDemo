/**
 * Supabase 接続確認 & 簡易CRUD テスト
 * Service Role Key を使用（RLS バイパス）+ Anon Key（RLS 適用）の両方をテスト
 *
 * 実行: npx tsx scripts/test-supabase-connection.ts
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── ヘルパー ──
function log(step: string, ok: boolean, detail?: string) {
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} [${step}] ${detail ?? (ok ? '成功' : '失敗')}`)
}

function logRLS(step: string, detail: string) {
  console.log(`🔒 [${step}] RLS: ${detail}`)
}

// ── メイン ──
async function main() {
  console.log('\n========== Supabase 接続テスト ==========\n')

  // 0) 環境変数チェック
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ 必須環境変数が不足しています (.env.local を確認してください)')
    console.error({ SUPABASE_URL: !!SUPABASE_URL, ANON_KEY: !!ANON_KEY, SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY })
    process.exit(1)
  }
  log('ENV', true, `URL=${SUPABASE_URL.slice(0, 30)}...`)

  // Service Role クライアント（RLS バイパス）
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Anon クライアント（RLS 適用）
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const testId = randomUUID()
  const testUserId = randomUUID() // 存在しないユーザーID（RLS テスト用）

  // ── ① 接続テスト（read） ──
  console.log('\n--- ① 接続テスト (read) ---')
  try {
    const { data, error, count } = await admin
      .from('address_book')
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      log('READ', false, `${error.code}: ${error.message}`)
    } else {
      log('READ', true, `取得成功 (全件数: ${count ?? '不明'}, 取得: ${data?.length ?? 0}件)`)
      if (data && data.length > 0) {
        console.log('  サンプル:', JSON.stringify(data[0], null, 2).slice(0, 200))
      }
    }
  } catch (e: any) {
    log('READ', false, `例外: ${e.message}`)
  }

  // ── ② 書き込みテスト（insert） ──
  console.log('\n--- ② 書き込みテスト (insert) ---')
  let insertedId: string | null = null
  try {
    // org_id が NOT NULL の場合があるため、既存データから取得を試みる
    let orgId: string | null = null
    const { data: sample } = await admin
      .from('address_book')
      .select('org_id')
      .not('org_id', 'is', null)
      .limit(1)
      .maybeSingle()
    orgId = sample?.org_id ?? null

    const insertPayload: Record<string, unknown> = {
      id: testId,
      user_id: null,
      contact_name: '__TEST_CONNECTION__',
      company_name: 'Test Corp',
      phone_number: '000-0000-0000',
      country_code: 'JP',
      postal_code: '100-0001',
      state_code: '13',
      city: 'Tokyo',
      address1: '1-1-1 Test',
      address2: '',
    }
    if (orgId) insertPayload.org_id = orgId

    const { data, error } = await admin
      .from('address_book')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      log('INSERT', false, `${error.code}: ${error.message}`)
    } else {
      insertedId = data.id
      log('INSERT', true, `id=${insertedId}`)
    }
  } catch (e: any) {
    log('INSERT', false, `例外: ${e.message}`)
  }

  // ── ③ 更新テスト（update） ──
  console.log('\n--- ③ 更新テスト (update) ---')
  if (insertedId) {
    try {
      const { data, error } = await admin
        .from('address_book')
        .update({ contact_name: '__TEST_UPDATED__' })
        .eq('id', insertedId)
        .select()
        .single()

      if (error) {
        log('UPDATE', false, `${error.code}: ${error.message}`)
      } else {
        log('UPDATE', true, `contact_name → ${data.contact_name}`)
      }
    } catch (e: any) {
      log('UPDATE', false, `例外: ${e.message}`)
    }
  } else {
    log('UPDATE', false, 'INSERT が失敗したためスキップ')
  }

  // ── ④ 削除テスト（delete） ──
  console.log('\n--- ④ 削除テスト (delete) ---')
  if (insertedId) {
    try {
      const { error } = await admin
        .from('address_book')
        .delete()
        .eq('id', insertedId)

      if (error) {
        log('DELETE', false, `${error.code}: ${error.message}`)
      } else {
        log('DELETE', true, `id=${insertedId} を削除`)
      }
    } catch (e: any) {
      log('DELETE', false, `例外: ${e.message}`)
    }
  } else {
    log('DELETE', false, 'INSERT が失敗したためスキップ')
  }

  // ── ⑤ RLS テスト（Anon Key で未認証アクセス） ──
  console.log('\n--- ⑤ RLS テスト (Anon Key / 未認証) ---')
  try {
    const { data, error } = await anon
      .from('address_book')
      .select('*')
      .limit(1)

    if (error) {
      logRLS('ANON READ', `拒否されました → ${error.code}: ${error.message}`)
    } else if (!data || data.length === 0) {
      logRLS('ANON READ', 'データ0件返却 (RLS により自分のデータのみ = 未認証なので0件)')
    } else {
      logRLS('ANON READ', `⚠️ ${data.length}件取得 — RLS が適切に設定されていない可能性があります`)
    }
  } catch (e: any) {
    logRLS('ANON READ', `例外: ${e.message}`)
  }

  try {
    const { error } = await anon
      .from('address_book')
      .insert({
        id: randomUUID(),
        user_id: randomUUID(),
        contact_name: '__RLS_TEST__',
        country_code: 'JP',
      })

    if (error) {
      logRLS('ANON INSERT', `拒否されました → ${error.code}: ${error.message}`)
    } else {
      logRLS('ANON INSERT', '⚠️ 挿入成功 — RLS が適切に設定されていない可能性があります')
      // クリーンアップ
      await admin.from('address_book').delete().eq('contact_name', '__RLS_TEST__')
    }
  } catch (e: any) {
    logRLS('ANON INSERT', `例外: ${e.message}`)
  }

  console.log('\n========== テスト完了 ==========\n')
}

main().catch((e) => {
  console.error('致命的エラー:', e)
  process.exit(1)
})
