-- quote_jobsテーブルのstatusカラムを更新して詳細な処理段階をサポート
ALTER TABLE quote_jobs 
DROP CONSTRAINT IF EXISTS quote_jobs_status_check;

ALTER TABLE quote_jobs 
ADD CONSTRAINT quote_jobs_status_check 
CHECK (status IN ('pending', 'processing_auth', 'processing_rate_request', 'completed', 'failed'));

-- コメントを更新
COMMENT ON COLUMN quote_jobs.status IS 'ジョブのステータス（pending: 待機中, processing_auth: 認証中, processing_rate_request: 料金取得中, completed: 完了, failed: 失敗）'; 