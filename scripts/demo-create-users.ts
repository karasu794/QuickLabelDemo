/**
 * FQL デモ環境 — デモ用ユーザー作成スクリプト
 *
 * Supabase Admin API で以下の2ユーザーを作成:
 *   1. demo-user@fql-demo.example.com  (一般ユーザー)
 *   2. demo-admin@fql-demo.example.com (管理者)
 *
 * 冪等: 既存ユーザーはスキップ。
 * profiles への行は on_auth_user_created トリガーで自動作成される。
 * 管理者は profiles.role = 'admin', is_admin = true に更新。
 *
 * 実行: npx tsx scripts/demo-create-users.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORG_ID = '1d1fe7d8-1be8-4e07-9ad4-11022f3767be'

interface DemoUser {
  email: string
  password: string
  role: 'user' | 'admin'
  fullName: string
  companyName: string
  phone: string
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'demo-user@fql-demo.example.com',
    password: 'DemoUser2026!',
    role: 'user',
    fullName: 'デモ ユーザー',
    companyName: 'デモ株式会社',
    phone: '03-0000-0010',
  },
  {
    email: 'demo-admin@fql-demo.example.com',
    password: 'DemoAdmin2026!',
    role: 'admin',
    fullName: 'デモ 管理者',
    companyName: 'FQL運営事務局',
    phone: '03-0000-0099',
  },
]

function log(step: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} [${step}] ${detail ?? ''}`)
}

async function findUserByEmail(email: string) {
  // Supabase Admin API: listUsers でメールアドレス検索
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 50 })
  if (error) throw error
  return data.users.find((u) => u.email === email) ?? null
}

async function createDemoUser(user: DemoUser) {
  const label = `${user.role}:${user.email}`

  // 1. 既存チェック
  const existing = await findUserByEmail(user.email)
  if (existing) {
    log('auth.users', true, `${label} — 既存 (id=${existing.id}), スキップ`)

    // profiles の role だけ念のため更新
    await updateProfile(existing.id, user)
    return existing.id
  }

  // 2. ユーザー作成（email_confirm: true でメール確認済みにする）
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
    },
  })

  if (error) {
    log('auth.users', false, `${label} — ${error.message}`)
    return null
  }

  log('auth.users', true, `${label} — 作成完了 (id=${data.user.id})`)

  // 3. トリガーによる profiles 作成を待つ（少し待機）
  await new Promise((r) => setTimeout(r, 1000))

  // 4. profiles 更新
  await updateProfile(data.user.id, user)

  return data.user.id
}

async function updateProfile(userId: string, user: DemoUser) {
  const label = `${user.role}:${user.email}`

  const updates: Record<string, unknown> = {
    full_name: user.fullName,
    company_name: user.companyName,
    phone_number: user.phone,
    org_id: ORG_ID,
  }

  // 管理者の場合は role と is_admin を設定
  if (user.role === 'admin') {
    updates.role = 'admin'
    updates.is_admin = true
  }

  const { error } = await admin.from('profiles').update(updates).eq('id', userId)

  if (error) {
    // org_id カラムが存在しない場合はリトライ（org_id なし）
    if (error.message.includes('org_id')) {
      const { org_id, ...fallback } = updates as any
      const { error: e2 } = await admin.from('profiles').update(fallback).eq('id', userId)
      log('profiles', !e2, e2 ? `${label} — ${e2.message}` : `${label} — 更新完了 (org_id なし)`)
      return
    }
    log('profiles', false, `${label} — ${error.message}`)
  } else {
    log('profiles', true, `${label} — profiles 更新完了 (role=${user.role})`)
  }
}

async function main() {
  console.log('\n========== デモユーザー作成 ==========\n')
  console.log(`Supabase: ${supabaseUrl}\n`)

  const createdIds: string[] = []

  for (const user of DEMO_USERS) {
    console.log(`--- ${user.role}: ${user.email} ---`)
    const id = await createDemoUser(user)
    if (id) createdIds.push(id)
    console.log('')
  }

  // サマリー
  console.log('========== サマリー ==========\n')
  console.log(`作成/確認済み: ${createdIds.length}/${DEMO_USERS.length} ユーザー`)
  console.log('')
  console.log('ログイン情報:')
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role === 'admin' ? '🔧 管理者' : '👤 ユーザー'}: ${u.email} / ${u.password}`)
  }
  console.log('')
  console.log('========== 完了 ==========\n')
}

main().catch((e) => {
  console.error('❌ 予期しないエラー:', e)
  process.exit(1)
})
