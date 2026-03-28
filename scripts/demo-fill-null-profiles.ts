/**
 * デモ環境: null プロフィールにダミー名を設定
 * 実行: npx tsx scripts/demo-fill-null-profiles.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const dummyNames = [
  { full_name: 'テスト ユーザーA', company_name: 'テスト企業A' },
  { full_name: 'テスト ユーザーB', company_name: 'テスト企業B' },
  { full_name: 'テスト ユーザーC', company_name: 'テスト企業C' },
]

async function main() {
  const { data: nullProfiles } = await admin
    .from('profiles')
    .select('id')
    .is('full_name', null)

  if (!nullProfiles || nullProfiles.length === 0) {
    console.log('✅ null プロフィールなし')
    return
  }

  for (let i = 0; i < nullProfiles.length; i++) {
    const p = nullProfiles[i]
    const dummy = dummyNames[i % dummyNames.length]
    const { error } = await admin.from('profiles').update(dummy).eq('id', p.id)
    console.log(`${error ? '❌' : '✅'} ${p.id}: ${dummy.full_name} ${error?.message || ''}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
