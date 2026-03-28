/**
 * FQL デモ環境データ整備スクリプト
 *
 * P1: profiles / address_book / shipments の実個人情報をダミー化
 * P2: ダミー配送履歴 3件を投入
 * P3: ダミー住所帳 3件を投入
 *
 * 実行: npx tsx scripts/demo-seed.ts
 * 再実行可能（冪等）: 既存ダミーデータは upsert / 重複スキップ
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

// ── 管理者ユーザーID（既存） ──
const ADMIN_USER_ID = '494af56f-a11b-498e-88f1-ca3561f17c9a'
const ORG_ID = '1d1fe7d8-1be8-4e07-9ad4-11022f3767be'

async function main() {
  console.log('\n========== デモ環境データ整備 ==========\n')

  // ────────────────────────────────────────
  // P1: 個人情報ダミー化
  // ────────────────────────────────────────
  console.log('--- P1: 個人情報ダミー化 ---\n')

  // P1-a: profiles のメールアドレス以外のフィールドをダミー化
  // ※ email は auth.users と連動しているため変更不可。表示名だけ埋める。
  const profileUpdates = [
    {
      id: '494af56f-a11b-498e-88f1-ca3561f17c9a',
      full_name: '山田 太郎',
      company_name: 'デモ株式会社',
      phone_number: '03-0000-0001',
      postal_code: '105-0000',
      address_prefecture: '東京都',
      address_city: '港区',
      address_line1: 'サンプル1-1-1',
      address_line2: 'デモビル5F',
    },
    {
      id: '43aa7777-c059-4ca2-8593-f7c7add6e382',
      full_name: '佐藤 花子',
      company_name: 'デモ商事',
      phone_number: '03-0000-0002',
    },
  ]

  for (const p of profileUpdates) {
    const { id, ...fields } = p
    const { error } = await admin.from('profiles').update(fields).eq('id', id)
    log('P1-profiles', !error, error ? `${id}: ${error.message}` : `${id}: ${fields.full_name}`)
  }

  // P1-b: shipments の実名をダミー化（実名が含まれるレコード）
  // Yasuaki Otaka → Demo Taro, RIKA OOTAKA → Demo Hanako
  const nameMap: Record<string, { contact: string; company: string }> = {
    'Yasuaki Otaka': { contact: 'Taro Yamada', company: 'Demo Corp' },
    'RIKA OOTAKA': { contact: 'Hanako Sato', company: '' },
  }

  const { data: allShipments } = await admin.from('shipments').select('id, shipper_contact, recipient_contact')
  if (allShipments) {
    for (const s of allShipments) {
      const updates: Record<string, string> = {}
      const shipperMap = nameMap[s.shipper_contact as string]
      const recipientMap = nameMap[s.recipient_contact as string]
      if (shipperMap) {
        updates.shipper_contact = shipperMap.contact
        updates.shipper_company = shipperMap.company
      }
      if (recipientMap) {
        updates.recipient_contact = recipientMap.contact
        updates.recipient_company = recipientMap.company
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await admin.from('shipments').update(updates).eq('id', s.id)
        log('P1-shipments', !error, error ? `id=${s.id}: ${error.message}` : `id=${s.id}: 名前差し替え完了`)
      }
    }
  }

  // P1-c: 既存 address_book のダミー化
  const { data: existingAb } = await admin.from('address_book').select('id, contact_name')
  if (existingAb) {
    for (const a of existingAb) {
      // 既にダミーデータ（DEMO- prefix）ならスキップ
      if ((a.contact_name as string)?.startsWith('DEMO-')) continue
      const { error } = await admin.from('address_book').update({
        contact_name: 'Demo User',
        company_name: 'Demo Sample Ltd.',
        phone_number: '03-0000-0000',
        city: 'Shinjuku',
        address1: '1-1-1 Demo Street',
      }).eq('id', a.id)
      log('P1-address_book', !error, error ? `${a.id}: ${error.message}` : `${a.id}: ダミー化完了`)
    }
  }


  // ────────────────────────────────────────
  // P2: ダミー配送履歴 3件
  // ────────────────────────────────────────
  console.log('\n--- P2: ダミー配送履歴投入 ---\n')

  // 既存のシードデータ (id=17,18) は既にダミー的なので残す。
  // 新規3件を追加（見栄えのする completed データ）
  const demoShipments = [
    {
      user_id: ADMIN_USER_ID,
      org_id: ORG_ID,
      status: 'shipment_created',
      payment_status: 'completed',
      shipping_status: 'delivered',
      tracking_number: '794600000001',
      total_amount: 18500,
      payment_id: 'sandbox-demo-pay-001',
      square_payment_id: 'sandbox-sq-001',
      currency: 'JPY',
      service_type: 'FEDEX_INTERNATIONAL_PRIORITY',
      shipper_contact: 'Taro Yamada',
      shipper_company: 'Demo Corp',
      shipper_phone: '03-0000-0001',
      shipper_postal_code: '105-0000',
      shipper_city: 'Tokyo',
      shipper_address1: '1-1-1 Sample, Minato-ku',
      shipper_address2: 'Demo Bldg 5F',
      shipper_country: 'JP',
      shipper_state: null,
      recipient_contact: 'John Sample',
      recipient_company: 'Sample Inc.',
      recipient_phone: '+1-555-000-0001',
      recipient_email: 'john@example.com',
      recipient_postal_code: '10000',
      recipient_city: 'New York',
      recipient_address1: '123 Demo Street',
      recipient_address2: 'Suite 100',
      recipient_country: 'US',
      recipient_state: 'NY',
      shipping_purpose: 'commercial',
      contents: { currency: 'JPY', totalValue: 15000, description: '電子部品サンプル (Electronic Parts Sample)' },
      items: [{ hsCode: '8541.40', quantity: 10, unitValue: 1500, totalValue: 15000, description: '電子部品サンプル', countryOfOrigin: 'JP' }],
      packages: [{ id: 1, weight: '2.5', length: '30', width: '25', height: '15', declaredValue: '15000', packagingType: 'YOUR_PACKAGING' }],
      label_url: null,
      order_id: 'DEMO-20251201-001',
      created_at: '2025-12-01T09:00:00+09:00',
    },
    {
      user_id: ADMIN_USER_ID,
      org_id: ORG_ID,
      status: 'shipment_created',
      payment_status: 'completed',
      shipping_status: 'delivered',
      tracking_number: '794600000002',
      total_amount: 12800,
      payment_id: 'sandbox-demo-pay-002',
      square_payment_id: 'sandbox-sq-002',
      currency: 'JPY',
      service_type: 'FEDEX_INTERNATIONAL_ECONOMY',
      shipper_contact: 'Taro Yamada',
      shipper_company: 'Demo Corp',
      shipper_phone: '03-0000-0001',
      shipper_postal_code: '105-0000',
      shipper_city: 'Tokyo',
      shipper_address1: '1-1-1 Sample, Minato-ku',
      shipper_address2: 'Demo Bldg 5F',
      shipper_country: 'JP',
      shipper_state: null,
      recipient_contact: 'Marie Exemple',
      recipient_company: 'Exemple SARL',
      recipient_phone: '+33-1-00-00-00-00',
      recipient_email: 'marie@example.com',
      recipient_postal_code: '75000',
      recipient_city: 'Paris',
      recipient_address1: '1 Rue de Exemple',
      recipient_address2: null,
      recipient_country: 'FR',
      recipient_state: null,
      shipping_purpose: 'gift',
      contents: { currency: 'JPY', totalValue: 8000, description: '伝統工芸品 (Traditional Crafts)' },
      items: [{ hsCode: '4421.99', quantity: 2, unitValue: 4000, totalValue: 8000, description: '木製工芸品', countryOfOrigin: 'JP' }],
      packages: [{ id: 1, weight: '1.8', length: '25', width: '20', height: '10', declaredValue: '8000', packagingType: 'YOUR_PACKAGING' }],
      label_url: null,
      order_id: 'DEMO-20251210-002',
      created_at: '2025-12-10T14:30:00+09:00',
    },
    {
      user_id: ADMIN_USER_ID,
      org_id: ORG_ID,
      status: 'shipment_created',
      payment_status: 'completed',
      shipping_status: 'in_transit',
      tracking_number: '794600000003',
      total_amount: 22300,
      payment_id: 'sandbox-demo-pay-003',
      square_payment_id: 'sandbox-sq-003',
      currency: 'JPY',
      service_type: 'FEDEX_INTERNATIONAL_PRIORITY',
      shipper_contact: 'John Sample',
      shipper_company: 'Sample Inc.',
      shipper_phone: '+1-555-000-0001',
      shipper_postal_code: '10000',
      shipper_city: 'New York',
      shipper_address1: '123 Demo Street',
      shipper_address2: 'Suite 100',
      shipper_country: 'US',
      shipper_state: 'NY',
      recipient_contact: 'Taro Yamada',
      recipient_company: 'Demo Corp',
      recipient_phone: '03-0000-0001',
      recipient_email: 'taro@example.com',
      recipient_postal_code: '105-0000',
      recipient_city: 'Tokyo',
      recipient_address1: '1-1-1 Sample, Minato-ku',
      recipient_address2: 'Demo Bldg 5F',
      recipient_country: 'JP',
      recipient_state: null,
      shipping_purpose: 'commercial',
      contents: { currency: 'JPY', totalValue: 18000, description: '書類・カタログ (Documents & Catalogs)' },
      items: [{ hsCode: '4901.99', quantity: 5, unitValue: 3600, totalValue: 18000, description: '印刷物・カタログ', countryOfOrigin: 'US' }],
      packages: [{ id: 1, weight: '3.0', length: '35', width: '25', height: '10', declaredValue: '18000', packagingType: 'FEDEX_ENVELOPE' }],
      label_url: null,
      order_id: 'DEMO-20260115-003',
      created_at: '2026-01-15T10:00:00+09:00',
    },
  ]

  for (const shipment of demoShipments) {
    // 冪等: tracking_number で重複チェック
    const { data: existing } = await admin
      .from('shipments')
      .select('id')
      .eq('tracking_number', shipment.tracking_number)
      .maybeSingle()

    if (existing) {
      log('P2-shipments', true, `${shipment.tracking_number}: 既存 (skip)`)
      continue
    }

    const { error } = await admin.from('shipments').insert(shipment)
    log('P2-shipments', !error, error
      ? `${shipment.tracking_number}: ${error.message}`
      : `${shipment.tracking_number}: 投入完了 (${shipment.service_type})`)
  }

  // ────────────────────────────────────────
  // P3: ダミー住所帳 3件
  // ────────────────────────────────────────
  console.log('\n--- P3: ダミー住所帳投入 ---\n')

  const demoAddresses = [
    {
      user_id: null,
      org_id: ORG_ID,
      created_by: ADMIN_USER_ID,
      contact_name: 'DEMO-Taro Yamada',
      company_name: 'Demo Corp Tokyo',
      phone_number: '03-0000-0001',
      country_code: 'JP',
      postal_code: '105-0000',
      state_code: '13',
      city: 'Tokyo',
      address1: '1-1-1 Sample, Minato-ku',
      address2: 'Demo Bldg 5F',
    },
    {
      user_id: null,
      org_id: ORG_ID,
      created_by: ADMIN_USER_ID,
      contact_name: 'DEMO-John Sample',
      company_name: 'Sample Inc.',
      phone_number: '+1-555-000-0001',
      country_code: 'US',
      postal_code: '10000',
      state_code: 'NY',
      city: 'New York',
      address1: '123 Demo Street',
      address2: 'Suite 100',
    },
    {
      user_id: null,
      org_id: ORG_ID,
      created_by: ADMIN_USER_ID,
      contact_name: 'DEMO-Marie Exemple',
      company_name: 'Exemple SARL',
      phone_number: '+33-1-00-00-00-00',
      country_code: 'FR',
      postal_code: '75000',
      state_code: null,
      city: 'Paris',
      address1: '1 Rue de Exemple',
      address2: null,
    },
  ]

  for (const addr of demoAddresses) {
    // 冪等: contact_name で重複チェック
    const { data: existing } = await admin
      .from('address_book')
      .select('id')
      .eq('contact_name', addr.contact_name)
      .maybeSingle()

    if (existing) {
      log('P3-address_book', true, `${addr.contact_name}: 既存 (skip)`)
      continue
    }

    const { error } = await admin.from('address_book').insert(addr)
    log('P3-address_book', !error, error
      ? `${addr.contact_name}: ${error.message}`
      : `${addr.contact_name}: 投入完了 (${addr.country_code})`)
  }

  // ────────────────────────────────────────
  // クリーンアップ: 不要なテストデータ削除
  // ────────────────────────────────────────
  console.log('\n--- クリーンアップ ---\n')

  // shipments: null だらけのテストレコード (id=20,21) を削除
  const { error: cleanErr } = await admin
    .from('shipments')
    .delete()
    .is('shipper_contact', null)
    .is('total_amount', null)
  log('CLEANUP', !cleanErr, cleanErr ? cleanErr.message : 'null レコード削除完了')

  console.log('\n========== 完了 ==========\n')
}

main().catch(e => { console.error(e); process.exit(1) })
