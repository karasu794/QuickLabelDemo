-- QuickLabel RLSポリシー設定
-- profilesテーブルのセキュリティ設定

-- 1. RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. ユーザーは自分のプロフィールのみ閲覧可能
CREATE POLICY "Users can view own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 3. ユーザーは自分のプロフィールのみ更新可能
CREATE POLICY "Users can update own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 4. 新規ユーザー登録時のプロフィール作成を許可
CREATE POLICY "Users can insert own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. 管理者は全てのプロフィールにアクセス可能（必要に応じて）
CREATE POLICY "Admins can access all profiles" 
ON profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- 設定確認用クエリ
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';