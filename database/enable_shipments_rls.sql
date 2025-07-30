-- shipmentsテーブルのRow Level Security (RLS) 完全設定
-- ユーザーが自身の発送履歴データにのみアクセスできるように制限

-- 1. RLSを有効化（既に有効化されている場合は何もしない）
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーをクリーンアップ（存在する場合のみ削除）
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can create own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete own shipments" ON public.shipments;

-- 3. 新しいポリシーを作成

-- 閲覧 (SELECT) ポリシー: ユーザーは自分の送り状のみ閲覧可能
CREATE POLICY "Users can view their own shipments."
ON public.shipments FOR SELECT
USING (auth.uid() = user_id);

-- 作成 (INSERT) ポリシー: ユーザーは自分の送り状のみ作成可能
CREATE POLICY "Users can create their own shipments."
ON public.shipments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 更新 (UPDATE) ポリシー: ユーザーは自分の送り状のみ更新可能
CREATE POLICY "Users can update their own shipments."
ON public.shipments FOR UPDATE
USING (auth.uid() = user_id);

-- 削除 (DELETE) ポリシー: ユーザーは自分の送り状のみ削除可能
CREATE POLICY "Users can delete their own shipments."
ON public.shipments FOR DELETE
USING (auth.uid() = user_id);

-- 4. サービスロール用ポリシー（管理者・システム用）
CREATE POLICY "Service role has full access to shipments."
ON public.shipments FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. 管理者用ポリシー（profilesテーブルのroleが'admin'のユーザー）
CREATE POLICY "Admin users have full access to shipments."
ON public.shipments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 6. ポリシーの説明コメント
COMMENT ON POLICY "Users can view their own shipments." ON public.shipments 
IS 'ユーザーは自分の送り状履歴のみ閲覧可能';

COMMENT ON POLICY "Users can create their own shipments." ON public.shipments 
IS 'ユーザーは自分のアカウントで送り状のみ作成可能';

COMMENT ON POLICY "Users can update their own shipments." ON public.shipments 
IS 'ユーザーは自分の送り状のみ更新可能';

COMMENT ON POLICY "Users can delete their own shipments." ON public.shipments 
IS 'ユーザーは自分の送り状のみ削除可能';

COMMENT ON POLICY "Service role has full access to shipments." ON public.shipments 
IS 'サービスロール（システム）は全ての送り状にアクセス可能';

COMMENT ON POLICY "Admin users have full access to shipments." ON public.shipments 
IS '管理者ユーザーは全ての送り状にアクセス可能';

-- 7. インデックスの確認・作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_shipments_user_id_auth ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at_user ON public.shipments(created_at DESC, user_id);

-- 8. 設定確認用のクエリ（実行後にコメントアウト推奨）
-- SELECT 
--   schemaname, 
--   tablename, 
--   rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'shipments';

-- SELECT 
--   pol.policyname,
--   pol.cmd,
--   pol.qual,
--   pol.with_check
-- FROM pg_policies pol 
-- WHERE pol.tablename = 'shipments'
-- ORDER BY pol.policyname;

-- 実行完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'shipmentsテーブルのRLS設定が完了しました。';
  RAISE NOTICE '- RLS有効化: ✓';
  RAISE NOTICE '- SELECT ポリシー: ✓';
  RAISE NOTICE '- INSERT ポリシー: ✓'; 
  RAISE NOTICE '- UPDATE ポリシー: ✓';
  RAISE NOTICE '- DELETE ポリシー: ✓';
  RAISE NOTICE '- 管理者ポリシー: ✓';
  RAISE NOTICE 'ユーザーは自分の発送履歴のみアクセス可能になりました。';
END $$; 