-- app_settings テーブル作成
-- アプリケーション設定をkey-value形式で管理

CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データの挿入（サービス手数料率）
INSERT INTO public.app_settings (key, value, description) 
VALUES (
    'service_fee_percentage',
    '15',
    'サービス手数料率（パーセンテージ）'
) ON CONFLICT (key) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- RLS (Row Level Security) 設定
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Service role can manage app settings" ON public.app_settings
    FOR ALL USING (auth.role() = 'service_role');

-- 認証されたユーザーは読み取り専用
CREATE POLICY "Authenticated users can view app settings" ON public.app_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_settings_updated_at 
    BEFORE UPDATE ON public.app_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE public.app_settings IS 'アプリケーション設定管理テーブル（key-value形式）';
COMMENT ON COLUMN public.app_settings.key IS '設定項目のキー（ユニーク）';
COMMENT ON COLUMN public.app_settings.value IS '設定値（JSONB形式）';
COMMENT ON COLUMN public.app_settings.description IS '設定項目の説明'; 