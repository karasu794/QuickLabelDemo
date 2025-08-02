-- 領収書発行機能テスト用のシードデータ
-- 決済完了済みの取引データ（2件）

-- ★★★ 重要 ★★★
-- 以下のUUIDは実際のテストユーザー k-jee@hotmail.co.jp のものです
-- UUID: 494af56f-a11b-498e-88f1-ca3561f17c9a

-- テストデータ1: 日本から米国への企業向け配送（高額）
INSERT INTO public.shipments (
    user_id,
    status,
    payment_status,
    shipping_status,
    total_amount,
    payment_id,
    square_payment_id,
    tracking_number,
    label_url,
    
    -- 荷送人情報（日本の企業）
    shipper_company,
    shipper_contact,
    shipper_phone,
    shipper_postal_code,
    shipper_city,
    shipper_address1,
    shipper_address2,
    shipper_country,
    shipper_state,
    
    -- 荷受人情報（米国の企業）
    recipient_company,
    recipient_contact,
    recipient_phone,
    recipient_email,
    recipient_postal_code,
    recipient_city,
    recipient_address1,
    recipient_address2,
    recipient_country,
    recipient_state,
    
    -- 商品・荷物情報
    packages,
    items,
    contents,
    shipping_purpose,
    
    -- タイムスタンプ
    created_at,
    updated_at
) VALUES (
    '494af56f-a11b-498e-88f1-ca3561f17c9a', -- k-jee@hotmail.co.jp のUUID
    'created',
    'completed',
    'delivered',
    25800.00,
    'sq0idp-abcd1234567890abcdef1234',
    'pay_1a2b3c4d5e6f7g8h9i0j',
    '781234567890',
    'https://example.com/labels/781234567890.pdf',
    
    -- 荷送人情報
    '株式会社サンプル商事',
    '田中 太郎',
    '03-1234-5678',
    '100-0001',
    '東京都',
    '千代田区千代田1-1',
    'サンプルビル3F',
    'JP',
    NULL,
    
    -- 荷受人情報
    'Sample Corporation USA',
    'John Smith',
    '+1-555-123-4567',
    'john.smith@samplecorp.com',
    '10001',
    'New York',
    '123 Broadway Ave',
    'Suite 456',
    'US',
    'NY',
    
    -- 商品・荷物情報
    '[{
        "id": 1,
        "packagingType": "FEDEX_BOX",
        "weight": "3.5",
        "length": "30",
        "width": "25",
        "height": "15",
        "declaredValue": "20000"
    }]'::jsonb,
    '[{
        "description": "電子部品",
        "quantity": 50,
        "unitValue": 400,
        "totalValue": 20000,
        "hsCode": "8541.40",
        "countryOfOrigin": "JP"
    }]'::jsonb,
    '{
        "description": "電子部品 (Electronic Components)",
        "totalValue": 20000,
        "currency": "JPY"
    }'::jsonb,
    'commercial',
    
    -- タイムスタンプ（1週間前）
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),

-- テストデータ2: 日本から欧州への個人向け配送（中額）
(
    '494af56f-a11b-498e-88f1-ca3561f17c9a', -- k-jee@hotmail.co.jp のUUID
    'created',
    'completed',
    'delivered',
    12650.00,
    'sq0idp-xyz9876543210zyxwvu9876',
    'pay_9z8y7x6w5v4u3t2s1r0q',
    '781987654321',
    'https://example.com/labels/781987654321.pdf',
    
    -- 荷送人情報
    '佐藤商店',
    '佐藤 花子',
    '06-9876-5432',
    '530-0001',
    '大阪市',
    '北区梅田1-2-3',
    NULL,
    'JP',
    NULL,
    
    -- 荷受人情報
    NULL, -- 個人宛て
    'Marie Dubois',
    '+33-1-23-45-67-89',
    'marie.dubois@example.fr',
    '75001',
    'Paris',
    '123 Rue de Rivoli',
    'Appartement 45',
    'FR',
    NULL,
    
    -- 商品・荷物情報
    '[{
        "id": 1,
        "packagingType": "YOUR_PACKAGING",
        "weight": "1.8",
        "length": "25",
        "width": "20",
        "height": "10",
        "declaredValue": "8500"
    }]'::jsonb,
    '[{
        "description": "伝統工芸品",
        "quantity": 3,
        "unitValue": 2833,
        "totalValue": 8500,
        "hsCode": "9701.10",
        "countryOfOrigin": "JP"
    }]'::jsonb,
    '{
        "description": "伝統工芸品 (Traditional Crafts)",
        "totalValue": 8500,
        "currency": "JPY"
    }'::jsonb,
    'gift',
    
    -- タイムスタンプ（3日前）
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
);

-- 挿入結果を確認
SELECT 
    id,
    user_id,
    status,
    payment_status,
    shipping_status,
    total_amount,
    square_payment_id,
    tracking_number,
    shipper_contact,
    recipient_contact,
    created_at
FROM public.shipments 
WHERE user_id = '494af56f-a11b-498e-88f1-ca3561f17c9a' -- k-jee@hotmail.co.jp のUUID
ORDER BY created_at DESC
LIMIT 2;