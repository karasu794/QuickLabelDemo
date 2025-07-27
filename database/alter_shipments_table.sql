-- shipments テーブルにuser_idカラムを追加
-- 管理者の取引管理ページで、ユーザー情報との結合を可能にする

-- user_id カラムを追加
ALTER TABLE public.shipments 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- user_id のインデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);

-- 既存のRLSポリシーを更新（ユーザーは自分の送り状のみ閲覧可能）
DROP POLICY IF EXISTS "Authenticated users can view shipments" ON public.shipments;

CREATE POLICY "Users can view own shipments" ON public.shipments
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- 新しいポリシー：認証されたユーザーは自分の送り状を作成可能
CREATE POLICY "Users can create own shipments" ON public.shipments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- コメント追加
COMMENT ON COLUMN public.shipments.user_id IS '送り状を作成したユーザーのID (auth.users テーブルへの外部キー)';

-- shipmentsテーブルとprofilesテーブルの結合用のビューを作成（管理者用）
CREATE OR REPLACE VIEW public.shipments_with_user_info AS
SELECT 
    s.id,
    s.tracking_number,
    s.status,
    s.total_amount,
    s.payment_id,
    s.label_url,
    s.created_at,
    s.updated_at,
    p.email,
    p.contact_name,
    p.company_name,
    -- 荷送人・荷受人情報
    s.shipper_company,
    s.shipper_contact,
    s.recipient_company,
    s.recipient_contact,
    s.recipient_country,
    -- JSON データ
    s.packages,
    s.items,
    s.shipping_purpose
FROM public.shipments s
LEFT JOIN public.profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC;

-- ビューに対するRLSポリシー（管理者のみアクセス可能）
ALTER VIEW public.shipments_with_user_info OWNER TO postgres;

-- 管理者用のポリシー設定
CREATE POLICY "Service role can access shipments view" ON public.shipments_with_user_info
    FOR SELECT USING (auth.role() = 'service_role');

COMMENT ON VIEW public.shipments_with_user_info IS '管理者用: 送り状とユーザー情報を結合したビュー'; 