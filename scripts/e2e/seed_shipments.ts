import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ownerUserId = process.env.E2E_OWNER_USER_ID! // 既存ユーザーのUUIDを使う

if (!url || !key || !ownerUserId) {
  console.error('Missing env: SUPABASE URL/KEY or E2E_OWNER_USER_ID')
  process.exit(1)
}

const sb = createClient(url, key)

async function main() {
  // pending + no label
  const { data: p, error: e1 } = await sb
    .from('shipments')
    .insert({ user_id: ownerUserId, payment_status: 'pending', tracking_number: null, label_blob_url: null })
    .select('id').single()
  if (e1) throw e1

  // completed + label ready
  const { data: c, error: e2 } = await sb
    .from('shipments')
    .insert({ user_id: ownerUserId, payment_status: 'completed', tracking_number: 'TN-E2E', label_blob_url: 'https://example.com/dummy.pdf' })
    .select('id').single()
  if (e2) throw e2

  console.log(JSON.stringify({ pendingId: p.id, completedId: c.id }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })


