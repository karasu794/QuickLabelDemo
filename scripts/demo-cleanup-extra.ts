/**
 * デモ環境: 追加クリーンアップ
 * - 残存する実名風データのダミー化
 * - テスト残骸の削除
 *
 * 実行: npx tsx scripts/demo-cleanup-extra.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function log(step: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} [${step}] ${detail ?? ''}`)
}

async function main() {
  console.log('\n========== 追加クリーンアップ ==========\n')

  // 1. id=17: 田中太郎 → Taro Yamada
  {
    const { error } = await admin.from('shipments').update({
      shipper_contact: 'Taro Yamada',
      shipper_company: 'Demo Corp',
      shipper_phone: '03-0000-0001',
      recipient_contact: 'John Sample',
      recipient_company: 'Sample Inc.',
    }).eq('id', 17)
    log('shipment-17', !error, error?.message || '田中太郎 → Taro Yamada')
  }

  // 2. id=18: 佐藤花子/Marie Dubois → Demo names
  {
    const { error } = await admin.from('shipments').update({
      shipper_contact: 'Hanako Sato',
      shipper_company: 'Demo Trading',
      recipient_contact: 'Marie Exemple',
      recipient_company: 'Exemple SARL',
    }).eq('id', 18)
    log('shipment-18', !error, error?.message || '佐藤花子/Dubois → Demo names')
  }

  // 3. id=8〜15: payment_completed + tracking_number=null のテスト残骸を削除
  {
    const { error, count } = await admin
      .from('shipments')
      .delete()
      .eq('status', 'payment_completed')
      .is('tracking_number', null)
    log('cleanup-test-shipments', !error, error?.message || `payment_completed+null tracking 削除`)
  }

  // 4. 残りの shipments で実名が残っていないか最終チェック
  {
    const { data } = await admin.from('shipments').select('id, shipper_contact, recipient_contact')
    const suspicious = (data || []).filter((s: any) =>
      !['Taro Yamada', 'Hanako Sato', 'John Sample', 'Marie Exemple', 'Demo User', 'John Doe'].includes(s.shipper_contact) &&
      !['Taro Yamada', 'Hanako Sato', 'John Sample', 'Marie Exemple', 'Demo User', 'John Doe'].includes(s.recipient_contact)
    )
    if (suspicious.length > 0) {
      console.log('⚠️  要確認レコード:')
      suspicious.forEach((s: any) => console.log(`  id=${s.id}: ${s.shipper_contact} → ${s.recipient_contact}`))
    } else {
      log('final-check', true, '実名風データなし')
    }
  }

  console.log('\n========== 完了 ==========\n')
}

main().catch(e => { console.error(e); process.exit(1) })
