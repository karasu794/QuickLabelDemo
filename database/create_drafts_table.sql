-- 下書き送り状テーブル作成
-- 送り状作成フローの途中状態を保存するための専用テーブル

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

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON public.drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON public.drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON public.drafts(created_at DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の下書きのみアクセス可能
CREATE POLICY "Users can view own drafts" ON public.drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drafts" ON public.drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.drafts
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Service Role は全アクセス可能
CREATE POLICY "Service role can manage all drafts" ON public.drafts
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drafts_updated_at 
    BEFORE UPDATE ON public.drafts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE public.drafts IS '送り状下書き保存テーブル - フロー途中状態の一時保存';
COMMENT ON COLUMN public.drafts.id IS '下書きID';
COMMENT ON COLUMN public.drafts.user_id IS '下書きを作成したユーザーID';
COMMENT ON COLUMN public.drafts.status IS '下書きステータス (draft, completed等)';
COMMENT ON COLUMN public.drafts.packages IS '荷物情報（JSON形式）';
COMMENT ON COLUMN public.drafts.items IS 'アイテム情報（JSON形式）';
COMMENT ON COLUMN public.drafts.shipping_purpose IS '発送目的';
COMMENT ON COLUMN public.drafts.selected_rate IS '選択された料金情報（JSON形式）';
COMMENT ON COLUMN public.drafts.created_at IS '下書き作成日時';
COMMENT ON COLUMN public.drafts.updated_at IS '下書き更新日時'; 