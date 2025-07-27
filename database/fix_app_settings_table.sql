-- app_settings テーブル修正
-- 既存テーブルに不足しているカラムを追加してからデータを挿入

-- Step 1: 不足しているカラムを追加
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: 初期データの挿入（安全な方法）
INSERT INTO public.app_settings (key, value, description) 
VALUES (
    'service_fee_percentage',
    '15',
    'サービス手数料率（パーセンテージ）'
) ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description;

-- Step 3: updated_at自動更新トリガー関数の作成（存在しない場合）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 4: トリガーの作成（存在しない場合）
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at 
    BEFORE UPDATE ON public.app_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: コメント追加
COMMENT ON COLUMN public.app_settings.description IS '設定項目の説明';
COMMENT ON COLUMN public.app_settings.created_at IS '作成日時';
COMMENT ON COLUMN public.app_settings.updated_at IS '更新日時';

-- Step 6: 確認
SELECT key, value, description, created_at, updated_at 
FROM public.app_settings 
WHERE key = 'service_fee_percentage'; 