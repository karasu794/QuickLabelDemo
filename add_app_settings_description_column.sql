-- app_settingsテーブルにdescriptionカラムを追加
-- 既存のテーブルを更新してdescriptionカラムを追加

-- descriptionカラムが存在しない場合のみ追加
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 既存のレコードにdescriptionを追加
UPDATE public.app_settings 
SET description = 'サービス手数料率（パーセンテージ）'
WHERE key = 'service_fee_percentage' AND (description IS NULL OR description = '');

-- コメント更新
COMMENT ON COLUMN public.app_settings.description IS '設定項目の説明'; 