-- ========================================
-- Service Role用RLSポリシー設定
-- Vercel API RoutesからSupabaseへの安全なアクセスを許可
-- ========================================

-- 1. profiles テーブル: Service Role に全アクセス権限を付与
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.profiles;
CREATE POLICY "Allow full access for service_role" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- 2. quote_jobs テーブル: Service Role に全アクセス権限を付与
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.quote_jobs;
CREATE POLICY "Allow full access for service_role" ON public.quote_jobs
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- 3. shipments テーブル: Service Role に全アクセス権限を付与
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.shipments;
CREATE POLICY "Allow full access for service_role" ON public.shipments
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- 4. notifications テーブル: 既存のポリシーを確認・更新
-- （既にService Role用のポリシーが存在するため、必要に応じて更新）
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.notifications;
CREATE POLICY "Allow full access for service_role" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- 5. app_settings テーブル: 既存のポリシーを確認・更新
-- （既にService Role用のポリシーが存在するため、必要に応じて更新）
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.app_settings;
CREATE POLICY "Allow full access for service_role" ON public.app_settings
    FOR ALL USING (auth.role() = 'service_role') 
    WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- ユーザー用の既存ポリシーは維持（必要に応じて調整）
-- ========================================

-- profiles テーブル: ユーザーは自分のプロフィールのみアクセス可能
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- quote_jobs テーブル: 既存の緩いポリシーを維持（パブリックアクセス）
-- DROP POLICY IF EXISTS "Anyone can read quote jobs" ON public.quote_jobs;
-- CREATE POLICY "Anyone can read quote jobs" ON public.quote_jobs
--     FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Anyone can create quote jobs" ON public.quote_jobs;
-- CREATE POLICY "Anyone can create quote jobs" ON public.quote_jobs
--     FOR INSERT WITH CHECK (true);

-- shipments テーブル: ユーザーは自分の送り状のみアクセス可能
-- （既存のポリシーがあるため、必要に応じて調整）

-- ========================================
-- 確認用SQL
-- ========================================

-- 作成されたポリシーを確認
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'quote_jobs', 'shipments', 'notifications', 'app_settings')
ORDER BY tablename, policyname;

-- コメント追加
COMMENT ON POLICY "Allow full access for service_role" ON public.profiles 
    IS 'Service Role Key経由でのフルアクセスを許可（Vercel API Routes用）';

COMMENT ON POLICY "Allow full access for service_role" ON public.quote_jobs 
    IS 'Service Role Key経由でのフルアクセスを許可（見積もりジョブ管理用）';

COMMENT ON POLICY "Allow full access for service_role" ON public.shipments 
    IS 'Service Role Key経由でのフルアクセスを許可（送り状管理用）';

COMMENT ON POLICY "Allow full access for service_role" ON public.notifications 
    IS 'Service Role Key経由でのフルアクセスを許可（通知管理用）';

COMMENT ON POLICY "Allow full access for service_role" ON public.app_settings 
    IS 'Service Role Key経由でのフルアクセスを許可（設定管理用）';

-- ========================================
-- 実行後の確認事項
-- ========================================

-- 1. Vercelの環境変数に SUPABASE_SERVICE_ROLE_KEY を設定
-- 2. API Routes でService Role Keyクライアントを使用
-- 3. profilesテーブルの一般ユーザーアクセステスト
-- 4. 管理者ページでのデータ取得テスト 