-- ============================================================
-- デモ環境: 個人情報ダミー化 + ダミーデータ投入
-- 再実行可能（冪等）
-- 実行: Supabase SQL Editor または psql で実行
-- ============================================================

BEGIN;

-- ────────────────────────────────────────
-- 1. profiles: 実個人情報をダミー化
-- ────────────────────────────────────────
UPDATE profiles SET
  full_name       = 'デモ 太郎',
  company_name    = 'デモ株式会社',
  phone_number    = '03-0000-0001',
  postal_code     = '105-0000',
  address         = 'サンプル1-1-1 デモビル5F',
  city            = '港区',
  state           = '東京都',
  country         = 'JP',
  updated_at      = now()
WHERE id = '494af56f-a11b-498e-88f1-ca3561f17c9a';

UPDATE profiles SET
  full_name       = 'デモ 花子',
  company_name    = 'デモ商事',
  phone_number    = '03-0000-0002',
  updated_at      = now()
WHERE id = '43aa7777-c059-4ca2-8593-f7c7add6e382';

-- ────────────────────────────────────────
-- 2. address_book: 既存レコードをダミー化
-- ────────────────────────────────────────
UPDATE address_book SET
  contact_name = 'Demo User',
  company_name = 'Demo Sample Ltd.',
  phone_number = '03-0000-0000',
  city         = 'Shinjuku',
  address1     = '1-1-1 Demo Street'
WHERE contact_name NOT LIKE 'DEMO-%';

-- ────────────────────────────────────────
-- 3. shipments: 実名をダミー化
-- ────────────────────────────────────────
UPDATE shipments SET
  shipper_contact   = 'Taro Yamada',
  shipper_company   = 'Demo Corp',
  shipper_phone     = '03-0000-0001',
  shipper_address1  = '1-1-1 Sample, Minato-ku',
  recipient_contact = CASE
    WHEN recipient_country = 'US' THEN 'John Sample'
    WHEN recipient_country = 'FR' THEN 'Marie Exemple'
    ELSE 'Demo Recipient'
  END,
  recipient_company = 'Sample Inc.',
  recipient_phone   = '+1-555-000-0000',
  recipient_email   = 'demo@example.com'
WHERE shipper_contact IS NOT NULL
  AND shipper_contact NOT IN ('Taro Yamada', 'John Sample', 'Marie Exemple');

-- ────────────────────────────────────────
-- 4. ダミー住所帳 3件（冪等: contact_name で重複スキップ）
-- ────────────────────────────────────────
INSERT INTO address_book (org_id, created_by, contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2)
SELECT '1d1fe7d8-1be8-4e07-9ad4-11022f3767be', '494af56f-a11b-498e-88f1-ca3561f17c9a',
       v.contact_name, v.company_name, v.phone_number, v.country_code, v.postal_code, v.state_code, v.city, v.address1, v.address2
FROM (VALUES
  ('DEMO-Taro Yamada',    'Demo Corp Tokyo', '03-0000-0001',       'JP', '105-0000', '13',   'Tokyo',    '1-1-1 Sample, Minato-ku', 'Demo Bldg 5F'),
  ('DEMO-John Sample',    'Sample Inc.',     '+1-555-000-0001',    'US', '10000',    'NY',   'New York', '123 Demo Street',          'Suite 100'),
  ('DEMO-Marie Exemple',  'Exemple SARL',    '+33-1-00-00-00-00',  'FR', '75000',    NULL,   'Paris',    '1 Rue de Exemple',         NULL)
) AS v(contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2)
WHERE NOT EXISTS (
  SELECT 1 FROM address_book ab WHERE ab.contact_name = v.contact_name
);

-- ────────────────────────────────────────
-- 5. ダミー配送履歴 3件（冪等: order_id で重複スキップ）
-- ────────────────────────────────────────
INSERT INTO shipments (
  user_id, org_id, status, payment_status, shipping_status,
  tracking_number, total_amount, currency, service_type,
  shipper_contact, shipper_company, shipper_phone, shipper_postal_code,
  shipper_city, shipper_address1, shipper_address2, shipper_country,
  recipient_contact, recipient_company, recipient_phone, recipient_email,
  recipient_postal_code, recipient_city, recipient_address1, recipient_address2,
  recipient_country, recipient_state, order_id, created_at
)
SELECT v.*
FROM (VALUES
  (
    '494af56f-a11b-498e-88f1-ca3561f17c9a'::uuid,
    '1d1fe7d8-1be8-4e07-9ad4-11022f3767be'::uuid,
    'shipment_created', 'completed', 'delivered',
    '794600000001', 18500, 'JPY', 'FEDEX_INTERNATIONAL_PRIORITY',
    'Taro Yamada', 'Demo Corp', '03-0000-0001', '105-0000',
    'Tokyo', '1-1-1 Sample, Minato-ku', 'Demo Bldg 5F', 'JP',
    'John Sample', 'Sample Inc.', '+1-555-000-0001', 'john@example.com',
    '10000', 'New York', '123 Demo Street', 'Suite 100',
    'US', 'NY', 'DEMO-20251201-001', '2025-12-01T09:00:00+09:00'::timestamptz
  ),
  (
    '494af56f-a11b-498e-88f1-ca3561f17c9a'::uuid,
    '1d1fe7d8-1be8-4e07-9ad4-11022f3767be'::uuid,
    'shipment_created', 'completed', 'delivered',
    '794600000002', 12800, 'JPY', 'FEDEX_INTERNATIONAL_ECONOMY',
    'Taro Yamada', 'Demo Corp', '03-0000-0001', '105-0000',
    'Tokyo', '1-1-1 Sample, Minato-ku', 'Demo Bldg 5F', 'JP',
    'Marie Exemple', 'Exemple SARL', '+33-1-00-00-00-00', 'marie@example.com',
    '75000', 'Paris', '1 Rue de Exemple', NULL,
    'FR', NULL, 'DEMO-20251210-002', '2025-12-10T14:30:00+09:00'::timestamptz
  ),
  (
    '494af56f-a11b-498e-88f1-ca3561f17c9a'::uuid,
    '1d1fe7d8-1be8-4e07-9ad4-11022f3767be'::uuid,
    'shipment_created', 'completed', 'in_transit',
    '794600000003', 22300, 'JPY', 'FEDEX_INTERNATIONAL_PRIORITY',
    'John Sample', 'Sample Inc.', '+1-555-000-0001', '10000',
    'New York', '123 Demo Street', 'Suite 100', 'US',
    'Taro Yamada', 'Demo Corp', '03-0000-0001', 'taro@example.com',
    '105-0000', 'Tokyo', '1-1-1 Sample, Minato-ku', 'Demo Bldg 5F',
    'JP', NULL, 'DEMO-20260115-003', '2026-01-15T10:00:00+09:00'::timestamptz
  )
) AS v(
  user_id, org_id, status, payment_status, shipping_status,
  tracking_number, total_amount, currency, service_type,
  shipper_contact, shipper_company, shipper_phone, shipper_postal_code,
  shipper_city, shipper_address1, shipper_address2, shipper_country,
  recipient_contact, recipient_company, recipient_phone, recipient_email,
  recipient_postal_code, recipient_city, recipient_address1, recipient_address2,
  recipient_country, recipient_state, order_id, created_at
)
WHERE NOT EXISTS (
  SELECT 1 FROM shipments s WHERE s.order_id = v.order_id
);

-- ────────────────────────────────────────
-- 6. クリーンアップ: null だらけのテストレコード削除
-- ────────────────────────────────────────
DELETE FROM shipments
WHERE shipper_contact IS NULL AND total_amount IS NULL;

COMMIT;
