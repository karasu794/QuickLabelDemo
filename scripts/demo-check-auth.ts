/**
 * デモユーザーの認証状態を確認 + パスワードリセット
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const DEMO_USERS = [
  { email: 'demo-user@fql-demo.example.com', password: 'DemoUser2026!' },
  { email: 'demo-admin@fql-demo.example.com', password: 'DemoAdmin2026!' },
]

async function main() {
  console.log('\n========== デモユーザー認証状態チェック ==========\n')

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 })
  if (error) { console.error('❌ listUsers error:', error); return }

  for (const demo of DEMO_USERS) {
    const user = data.users.find(u => u.email === demo.email)
    if (!user) {
      console.log(`❌ ${demo.email} — ユーザーが存在しない`)
      continue
    }

    console.log(`📧 ${demo.email}`)
    console.log(`   id: ${user.id}`)
    console.log(`   email_confirmed_at: ${user.email_confirmed_at || 'NULL ⚠️'}`)
    console.log(`   confirmed_at: ${(user as any).confirmed_at || 'NULL'}`)
    console.log(`   created_at: ${user.created_at}`)
    console.log(`   last_sign_in_at: ${user.last_sign_in_at || 'never'}`)

    // メール未確認の場合は確認済みにする
    if (!user.email_confirmed_at) {
      console.log(`   → メール未確認。確認済みに更新中...`)
      const { error: e } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      })
      console.log(e ? `   ❌ 更新失敗: ${e.message}` : `   ✅ メール確認済みに更新`)
    }

    // パスワードを再設定（確実にログインできるようにする）
    console.log(`   → パスワードを再設定中...`)
    const { data: updated, error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
      password: demo.password,
    })
    console.log(pwErr ? `   ❌ パスワード更新失敗: ${pwErr.message}` : `   ✅ パスワード更新完了: ${demo.password}`)
    console.log('')
  }

  console.log('========== 完了 ==========\n')
}

main().catch(e => { console.error(e); process.exit(1) })
