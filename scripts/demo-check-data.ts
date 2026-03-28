/**
 * デモ環境データ確認スクリプト
 * 現在のSupabase内データを確認し、個人情報の有無をチェック
 *
 * 実行: npx tsx scripts/demo-check-data.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  console.log('\n========== デモ環境データ確認 ==========\n')

  // profiles
  console.log('--- profiles ---')
  const { data: profiles, error: pe } = await admin.from('profiles').select('*')
  if (pe) console.error('ERROR:', pe.message)
  else {
    console.log(`件数: ${profiles?.length ?? 0}`)
    profiles?.forEach((p: any) => console.log(JSON.stringify(p, null, 2)))
  }

  // address_book
  console.log('\n--- address_book ---')
  const { data: ab, error: ae } = await admin.from('address_book').select('*').limit(20)
  if (ae) console.error('ERROR:', ae.message)
  else {
    console.log(`件数: ${ab?.length ?? 0}`)
    ab?.forEach((a: any) => console.log(JSON.stringify(a, null, 2)))
  }

  // shipments
  console.log('\n--- shipments ---')
  const { data: sh, error: se } = await admin.from('shipments').select('*').limit(20)
  if (se) console.error('ERROR:', se.message)
  else {
    console.log(`件数: ${sh?.length ?? 0}`)
    sh?.forEach((s: any) => console.log(JSON.stringify({
      id: s.id, status: s.status, tracking_number: s.tracking_number,
      total_amount: s.total_amount, payment_id: s.payment_id,
      shipper_contact: s.shipper_contact, shipper_company: s.shipper_company,
      recipient_contact: s.recipient_contact, recipient_company: s.recipient_company,
      created_at: s.created_at,
    }, null, 2)))
  }

  // quote_jobs
  console.log('\n--- quote_jobs ---')
  const { data: qj, error: qe } = await admin.from('quote_jobs').select('id,status,created_at').limit(10)
  if (qe) console.error('ERROR:', qe.message)
  else console.log(`件数: ${qj?.length ?? 0}`)

  // drafts
  console.log('\n--- drafts ---')
  const { data: dr, error: de } = await admin.from('drafts').select('id,status,created_at').limit(10)
  if (de) console.error('ERROR:', de.message)
  else console.log(`件数: ${dr?.length ?? 0}`)

  // open_shipments
  console.log('\n--- open_shipments ---')
  const { data: os, error: oe } = await admin.from('open_shipments').select('id,status,created_at').limit(10)
  if (oe) console.error('ERROR:', oe.message)
  else console.log(`件数: ${os?.length ?? 0}`)

  // notifications
  console.log('\n--- notifications ---')
  const { data: nt, error: ne2 } = await admin.from('notifications').select('id,type,message').limit(10)
  if (ne2) console.error('ERROR:', ne2.message)
  else console.log(`件数: ${nt?.length ?? 0}`)

  console.log('\n========== 確認完了 ==========\n')
}

main().catch(e => { console.error(e); process.exit(1) })
