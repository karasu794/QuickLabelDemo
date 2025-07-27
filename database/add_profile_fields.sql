-- profilesテーブルにプロフィール編集で必要なフィールドを追加

-- full_name列を追加（既にcontact_nameがあるが、full_nameとして使用）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- phone_number列を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- address列を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- postal_code列を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- city列を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS city TEXT;

-- state列を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS state TEXT;

-- country列を追加（デフォルト値: JP）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'JP';

-- 既存のcontact_nameデータをfull_nameにコピー（初期設定）
UPDATE profiles 
SET full_name = contact_name 
WHERE full_name IS NULL AND contact_name IS NOT NULL;

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city); 