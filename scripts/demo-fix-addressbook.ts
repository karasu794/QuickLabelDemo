/**
 * デモ住所帳の user_id をデモユーザーに紐付ける
 * 実行: npx tsx scripts/demo-fix-addressbook.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const DEMO_USER_ID = '1f685f73-e7cc-4a9c-af2d-b7fbebc12f4a'
const DEMO_ADMIN_ID = 'e974c603-725f-4aa5-8f74-731a606a84fa'

async function main() {
  console.log('\n========== 住所帳 user_id 修正 ==========\n')

  // DEMO- prefix の住所帳を全てデモユーザーに紐付け
  const { data, error } = await admin
    .from('address_book')
    .update({ user_id: DEMO_USER_ID, created_by: DEMO_USER_ID })
    .like('contact_name', 'DEMO-%')
    .select('id, contact_name')

  if (error) {
    console.error('❌ 更新エラー:', error.message)
  } else {
    console.log(`✅ ${data?.length ?? 0} 件の住所帳を更新`)
    data?.forEach(r => console.log(`   ${r.contact_name}`))
  }

  // 非DEMO住所帳もデモユーザーに紐付け（user_id が null のもの）
  const { data: d2, error: e2 } = await admin
    .from('address_book')
    .update({ user_id: DEMO_USER_ID, created_by: DEMO_USER_ID })
    .is('user_id', null)
    .select('id, contact_name')

  if (e2) {
    console.error('❌ null user_id 更新エラー:', e2.message)
  } else if (d2 && d2.length > 0) {
    console.log(`✅ ${d2.length} 件の null user_id を更新`)
  }

  // 配送履歴もデモユーザーに紐付け
  const { data: d3, error: e3 } = await admin
    .from('shipments')
    .update({ user_id: DEMO_USER_ID })
    .like('order_id', 'DEMO-%')
    .select('id, order_id')

  if (e3) {
    console.error('❌ shipments 更新エラー:', e3.message)
  } else {
    console.log(`✅ ${d3?.length ?? 0} 件の配送履歴を更新`)
  }

  console.log('\n========== 完了 ==========\n')
}

main().catch(e => { console.error(e); process.exit(1) })
