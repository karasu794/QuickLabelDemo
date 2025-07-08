-- 見積もりジョブを管理するテーブルの作成
CREATE TABLE quote_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- インデックスを作成
CREATE INDEX idx_quote_jobs_status ON quote_jobs (status);
CREATE INDEX idx_quote_jobs_created_at ON quote_jobs (created_at);

-- Row Level Security (RLS) を有効化
ALTER TABLE quote_jobs ENABLE ROW LEVEL SECURITY;

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを作成
CREATE TRIGGER update_quote_jobs_updated_at
    BEFORE UPDATE ON quote_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 見積もりジョブの読み取り権限（全ユーザー）
CREATE POLICY "Anyone can read quote jobs" ON quote_jobs
    FOR SELECT USING (true);

-- 見積もりジョブの作成権限（全ユーザー）
CREATE POLICY "Anyone can create quote jobs" ON quote_jobs
    FOR INSERT WITH CHECK (true);

-- 見積もりジョブの更新権限（システムのみ）
CREATE POLICY "System can update quote jobs" ON quote_jobs
    FOR UPDATE USING (true);

-- コメント追加
COMMENT ON TABLE quote_jobs IS '見積もりジョブの非同期処理を管理するテーブル';
COMMENT ON COLUMN quote_jobs.id IS 'ユニークなジョブID（UUID）';
COMMENT ON COLUMN quote_jobs.status IS 'ジョブのステータス（pending, processing, completed, failed）';
COMMENT ON COLUMN quote_jobs.request_payload IS 'FedEx APIへのリクエスト内容（JSON）';
COMMENT ON COLUMN quote_jobs.response_payload IS 'FedX APIからのレスポンス（JSON）';
COMMENT ON COLUMN quote_jobs.error_message IS 'エラーが発生した場合のメッセージ';
COMMENT ON COLUMN quote_jobs.created_at IS 'ジョブ作成日時';
COMMENT ON COLUMN quote_jobs.updated_at IS 'ジョブ更新日時';
COMMENT ON COLUMN quote_jobs.completed_at IS 'ジョブ完了日時'; 