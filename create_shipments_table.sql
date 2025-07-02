-- Supabase用 shipments テーブル作成スクリプト
-- /api/ship APIで使用する送り状データベーステーブル

CREATE TABLE IF NOT EXISTS public.shipments (
    -- 基本情報
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(255) NOT NULL,
    tracking_number VARCHAR(255) NOT NULL UNIQUE,
    label_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    total_amount INTEGER NOT NULL,

    -- 荷送人情報
    shipper_company VARCHAR(255),
    shipper_contact VARCHAR(255) NOT NULL,
    shipper_phone VARCHAR(50),
    shipper_postal_code VARCHAR(20),
    shipper_city VARCHAR(255),
    shipper_address1 TEXT NOT NULL,
    shipper_address2 TEXT,

    -- 荷受人情報
    recipient_company VARCHAR(255),
    recipient_contact VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    recipient_email VARCHAR(255),
    recipient_country VARCHAR(5) NOT NULL,
    recipient_postal_code VARCHAR(20),
    recipient_city VARCHAR(255),
    recipient_address1 TEXT NOT NULL,
    recipient_address2 TEXT,

    -- 荷物・商品情報（JSON形式で保存）
    packages JSONB NOT NULL,
    items JSONB NOT NULL,
    shipping_purpose VARCHAR(50),

    -- FedEx応答データ（デバッグ・監査用）
    fedex_response JSONB,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_payment_id ON public.shipments(payment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_recipient_country ON public.shipments(recipient_country);

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能（service_role）
CREATE POLICY "Service role can manage shipments" ON public.shipments
    FOR ALL USING (auth.role() = 'service_role');

-- 認証されたユーザーは読み取り専用（将来的にユーザー自身の送り状のみ閲覧可能にする場合）
CREATE POLICY "Authenticated users can view shipments" ON public.shipments
    FOR SELECT USING (auth.role() = 'authenticated');

-- コメント追加
COMMENT ON TABLE public.shipments IS '送り状管理テーブル - Square決済とFedEx Ship APIの統合データ';
COMMENT ON COLUMN public.shipments.payment_id IS 'Square決済ID';
COMMENT ON COLUMN public.shipments.tracking_number IS 'FedEx追跡番号';
COMMENT ON COLUMN public.shipments.label_url IS 'FedEx送り状ラベルPDFのURL';
COMMENT ON COLUMN public.shipments.total_amount IS '決済金額（円単位）';
COMMENT ON COLUMN public.shipments.packages IS '荷物詳細（JSON配列）';
COMMENT ON COLUMN public.shipments.items IS '商品詳細（JSON配列）';
COMMENT ON COLUMN public.shipments.fedex_response IS 'FedEx Ship API応答データ（デバッグ用）'; 