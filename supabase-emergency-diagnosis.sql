-- 🚨 緊急診断：HTTP 500エラーの原因特定

-- Step 1: profilesテーブルの基本構造確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: RLS状態とポリシーの詳細確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  hasrls
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 3: 全ポリシーの詳細設定確認（エラー原因特定）
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 4: ポリシーの構文チェック
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NO CONDITION'
    WHEN qual LIKE '%auth.uid()%' THEN 'Uses auth.uid()'
    WHEN qual LIKE '%admin%' THEN 'Uses admin check'
    WHEN qual LIKE '%service_role%' THEN 'Uses service_role'
    ELSE 'UNKNOWN CONDITION'
  END as condition_type,
  char_length(qual) as condition_length
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 5: profilesテーブルへの直接アクセステスト（Service Role）
-- 注意：これはSupabaseコンソールのSQL Editorで実行
SELECT COUNT(*) as total_profiles FROM profiles;

-- Step 6: 特定ユーザーの存在確認
SELECT 
  id,
  role,
  created_at
FROM profiles 
WHERE id = '494af56f-a11b-498e-88f1-ca3561f17c9a';

-- Step 7: auth.users テーブルとの整合性確認
SELECT 
  au.id as auth_id,
  au.email,
  p.id as profile_id,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.id = '494af56f-a11b-498e-88f1-ca3561f17c9a';

-- Step 8: RLS関数の動作確認
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Step 9: 管理者ポリシーの動作テスト
SELECT 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::text
  ) as is_admin_check;