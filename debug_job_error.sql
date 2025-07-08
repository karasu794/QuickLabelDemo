-- 失敗したジョブの詳細情報を確認
SELECT 
  id,
  status,
  error_message,
  created_at,
  updated_at,
  completed_at,
  request_payload,
  response_payload
FROM quote_jobs 
WHERE id = '9c3f88fb-6cfc-4697-ad35-5608092b1a20';

-- 最近の失敗したジョブも確認
SELECT 
  id,
  status,
  error_message,
  created_at,
  updated_at,
  completed_at
FROM quote_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 5;

-- 今日の全ジョブのステータス分布
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM quote_jobs 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status
ORDER BY status; 