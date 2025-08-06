-- Step 1: 現在のRLS設定とポリシーを確認
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 2: 既存のポリシーを確認
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 3: RLSが無効の場合のみ有効化
-- （既に有効な場合はエラーになるが、問題なし）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: 不足している可能性があるポリシーを個別に作成
-- （既存の場合はエラーになるが、これで現在の状況が分かる）

-- 自分のプロフィール閲覧
CREATE POLICY "Users can view own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 自分のプロフィール挿入
CREATE POLICY "Users can insert own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 管理者による全プロフィールアクセス
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

-- Step 5: 最終確認
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity::text as status
FROM pg_tables 
WHERE tablename = 'profiles'

UNION ALL

SELECT 
  'Policy Count' as check_type,
  'profiles' as tablename,
  COUNT(*)::text as status
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 6: 全ポリシーの詳細表示
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN 'すべての操作'
    WHEN cmd = 'SELECT' THEN '読み取り専用'
    WHEN cmd = 'INSERT' THEN '挿入専用'
    WHEN cmd = 'UPDATE' THEN '更新専用'
    WHEN cmd = 'DELETE' THEN '削除専用'
    ELSE cmd
  END as operation_type,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN '自分のレコードのみ'
    WHEN qual LIKE '%admin%' THEN '管理者権限'
    ELSE '詳細確認必要'
  END as access_scope
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;