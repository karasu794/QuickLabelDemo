-- notifications テーブル作成
-- システム通知を管理するテーブル

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Service role can manage notifications" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role');

-- 認証されたユーザーは読み取り専用
CREATE POLICY "Authenticated users can view notifications" ON public.notifications
    FOR SELECT USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 初期データの挿入（テスト用）
INSERT INTO public.notifications (type, message, is_read) 
VALUES 
    ('system', 'システムが正常に起動しました', true),
    ('special_offer', '特別オファーが発生しました - FedEx割引適用', false)
ON CONFLICT DO NOTHING;

-- コメント追加
COMMENT ON TABLE public.notifications IS 'システム通知管理テーブル';
COMMENT ON COLUMN public.notifications.type IS '通知タイプ（special_offer, system, error等）';
COMMENT ON COLUMN public.notifications.message IS '通知メッセージ内容';
COMMENT ON COLUMN public.notifications.is_read IS '既読フラグ';
COMMENT ON COLUMN public.notifications.metadata IS '追加データ（JSON形式）';
COMMENT ON COLUMN public.notifications.read_at IS '既読にした日時'; 