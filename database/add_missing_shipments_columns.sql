-- shipments テーブルに不足しているカラムを安全に追加
-- 既存のテーブル構造を維持しながら、必要なカラムのみを追加

-- payment_id カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'payment_id') THEN
        ALTER TABLE public.shipments ADD COLUMN payment_id VARCHAR(255);
    END IF;
END $$;

-- contents カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'contents') THEN
        ALTER TABLE public.shipments ADD COLUMN contents JSONB;
    END IF;
END $$;

-- items カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'items') THEN
        ALTER TABLE public.shipments ADD COLUMN items JSONB;
    END IF;
END $$;

-- packages カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'packages') THEN
        ALTER TABLE public.shipments ADD COLUMN packages JSONB;
    END IF;
END $$;

-- tracking_number カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'tracking_number') THEN
        ALTER TABLE public.shipments ADD COLUMN tracking_number VARCHAR(255);
    END IF;
END $$;

-- label_url カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'label_url') THEN
        ALTER TABLE public.shipments ADD COLUMN label_url TEXT;
    END IF;
END $$;

-- currency カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'currency') THEN
        ALTER TABLE public.shipments ADD COLUMN currency VARCHAR(3) DEFAULT 'JPY';
    END IF;
END $$;

-- shipping_purpose カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipping_purpose') THEN
        ALTER TABLE public.shipments ADD COLUMN shipping_purpose TEXT;
    END IF;
END $$;

-- 既存のidカラムをそのまま使用（型変更はしない）

-- user_idカラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.shipments ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 基本情報カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'total_amount') THEN
        ALTER TABLE public.shipments ADD COLUMN total_amount DECIMAL(10, 2);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.shipments ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.shipments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.shipments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 荷送人情報カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_company') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_company TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_contact') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_contact TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_phone') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_phone TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_city') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_city TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_country') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_country TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_postal_code') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_postal_code TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_address1') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_address1 TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_address2') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_address2 TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'shipper_state') THEN
        ALTER TABLE public.shipments ADD COLUMN shipper_state TEXT;
    END IF;
END $$;

-- 荷受人情報カラムを追加（存在しない場合のみ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_company') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_company TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_contact') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_contact TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_phone') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_phone TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_city') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_city TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_country') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_country TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_email') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_email TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_postal_code') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_postal_code TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_address1') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_address1 TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_address2') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_address2 TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shipments' 
                   AND column_name = 'recipient_state') THEN
        ALTER TABLE public.shipments ADD COLUMN recipient_state TEXT;
    END IF;
END $$;

-- インデックスを作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_shipments_payment_id ON public.shipments(payment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_contents ON public.shipments USING gin(contents);
CREATE INDEX IF NOT EXISTS idx_shipments_items ON public.shipments USING gin(items);
CREATE INDEX IF NOT EXISTS idx_shipments_packages ON public.shipments USING gin(packages);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_recipient_country ON public.shipments(recipient_country);

-- カラムコメントを追加
COMMENT ON COLUMN public.shipments.payment_id IS 'Square決済ID';
COMMENT ON COLUMN public.shipments.total_amount IS '送り状総額';
COMMENT ON COLUMN public.shipments.status IS '送り状の状態 (pending, payment_completed, label_created, shipped, delivered)';
COMMENT ON COLUMN public.shipments.currency IS '通貨コード';
COMMENT ON COLUMN public.shipments.shipper_company IS '荷送人会社名';
COMMENT ON COLUMN public.shipments.shipper_contact IS '荷送人連絡先';
COMMENT ON COLUMN public.shipments.shipper_city IS '荷送人都市';
COMMENT ON COLUMN public.shipments.shipper_country IS '荷送人国コード';
COMMENT ON COLUMN public.shipments.recipient_company IS '荷受人会社名';
COMMENT ON COLUMN public.shipments.recipient_contact IS '荷受人連絡先';
COMMENT ON COLUMN public.shipments.recipient_city IS '荷受人都市';
COMMENT ON COLUMN public.shipments.recipient_country IS '荷受人国コード';
COMMENT ON COLUMN public.shipments.contents IS '内容物情報（JSON形式）';
COMMENT ON COLUMN public.shipments.items IS '商品情報（JSON形式）';
COMMENT ON COLUMN public.shipments.packages IS '荷物情報（JSON形式）';
COMMENT ON COLUMN public.shipments.tracking_number IS 'FedEx追跡番号';
COMMENT ON COLUMN public.shipments.label_url IS '送り状ラベルURL';
COMMENT ON COLUMN public.shipments.shipping_purpose IS '発送目的';
COMMENT ON COLUMN public.shipments.created_at IS '作成日時';
COMMENT ON COLUMN public.shipments.updated_at IS '更新日時';

-- updated_atカラムの自動更新トリガーを作成
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（存在しない場合のみ）
DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 