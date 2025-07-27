-- profilesテーブルにrole列を追加
ALTER TABLE profiles 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 既存のユーザーに対してデフォルト値を設定
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- 管理者ユーザーを設定（必要に応じて調整）
-- 例：特定のメールアドレスを管理者に設定
-- UPDATE profiles SET role = 'admin' WHERE email IN ('admin@quicklabel.com', 'admin@example.com');

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX idx_profiles_role ON profiles(role); 