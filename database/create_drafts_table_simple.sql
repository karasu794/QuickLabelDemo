-- 下書き送り状テーブル作成（基本版）
CREATE TABLE IF NOT EXISTS public.drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'draft',
    
    -- 荷送人情報
    shipper_company TEXT,
    shipper_contact TEXT,
    shipper_phone TEXT,
    shipper_postal_code TEXT,
    shipper_city TEXT,
    shipper_address1 TEXT,
    shipper_address2 TEXT,
    shipper_country TEXT,
    shipper_state TEXT,
    
    -- 荷受人情報
    recipient_company TEXT,
    recipient_contact TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,
    recipient_country TEXT,
    recipient_postal_code TEXT,
    recipient_city TEXT,
    recipient_address1 TEXT,
    recipient_address2 TEXT,
    recipient_state TEXT,
    
    -- 荷物・商品情報（JSON形式）
    packages JSONB,
    items JSONB,
    shipping_purpose TEXT,
    
    -- 選択された料金情報（JSON形式）
    selected_rate JSONB,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 