-- デバッグ用: profilesテーブルのRLS（Row Level Security）を一時的に無効化
-- トリガーからの挿入エラーがRLSによるものかを確認します

-- profilesテーブルのRLSを無効化
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 使用方法：
-- 1. この内容をSupabaseの「SQL Editor」で実行
-- 2. 新規ユーザー登録をテスト
-- 3. エラーが解消されるか確認
-- =====================================================

-- RLSを再度有効化する場合：
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 注意：
-- RLSを無効にすると、全てのユーザーがprofilesテーブルのすべてのデータにアクセスできるようになります
-- 本番環境では必ずRLSを有効にし、適切なポリシーを設定してください 