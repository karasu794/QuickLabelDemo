-- =====================================================
-- Supabase: 新規ユーザー登録時のprofilesテーブル自動作成
-- =====================================================

-- 1. PL/pgSQL関数の作成
-- 新規ユーザーがauth.usersに追加された際にpublic.profilesに対応するレコードを作成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  -- 新しく登録されたユーザーのidとemailを使用してprofilesテーブルにレコードを挿入
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- 2. トリガーの作成
-- auth.usersテーブルに新しいレコードが挿入された際に上記関数を実行するトリガー
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 使用方法：
-- 1. Supabaseの「SQL Editor」でこのファイルの内容を実行してください
-- 2. 実行後、新しいユーザーがサインアップすると自動的にprofilesテーブルにレコードが作成されます
-- =====================================================

-- 補足：
-- - SECURITY definerを使用してRLS（Row Level Security）ポリシーを回避
-- - SET search_path = publicでスキーマを明示的に設定
-- - created_atは現在時刻で自動設定
-- - その他のprofilesテーブルのカラム（contact_name, company_nameなど）は後でユーザーが更新可能 