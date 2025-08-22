-- キャッシュ無効化トリガー関数とトリガーの作成
-- 取引データ変更時の自動キャッシュ無効化機能

-- 1. キャッシュ無効化を記録するテーブル（オプション）
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  invalidation_reason VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. キャッシュ無効化トリガー関数
CREATE OR REPLACE FUNCTION invalidate_receipt_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- receipt_cacheテーブルから該当レコードを削除
  DELETE FROM receipt_cache 
  WHERE transaction_id = COALESCE(NEW.id, OLD.id)
    AND transaction_type = TG_ARGV[0];
  
  -- ログ記録（オプション）
  INSERT INTO cache_invalidation_log (
    transaction_id, 
    transaction_type, 
    invalidation_reason
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_ARGV[0],
    CASE 
      WHEN TG_OP = 'UPDATE' THEN 'データ更新'
      WHEN TG_OP = 'DELETE' THEN 'データ削除'
      ELSE 'データ変更'
    END
  );
  
  -- 変更通知（将来的にWebhookやPub/Sub実装時に使用）
  PERFORM pg_notify(
    'cache_invalidation',
    json_build_object(
      'transaction_id', COALESCE(NEW.id, OLD.id),
      'transaction_type', TG_ARGV[0],
      'operation', TG_OP,
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. shipmentsテーブル用トリガー
-- 更新時のトリガー（重要なフィールドが変更された場合のみ）
CREATE OR REPLACE FUNCTION should_invalidate_shipment_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- 領収書に影響する重要なフィールドの変更をチェック
  IF (
    OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
    OLD.payment_id IS DISTINCT FROM NEW.payment_id OR
    OLD.square_payment_id IS DISTINCT FROM NEW.square_payment_id OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.cancelled_at IS DISTINCT FROM NEW.cancelled_at OR
    OLD.refunded_at IS DISTINCT FROM NEW.refunded_at
  ) THEN
    -- キャッシュ無効化を実行
    PERFORM invalidate_receipt_cache();
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- shipmentsテーブルの更新トリガー
DROP TRIGGER IF EXISTS trigger_invalidate_shipment_cache_on_update ON shipments;
CREATE TRIGGER trigger_invalidate_shipment_cache_on_update
  AFTER UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION should_invalidate_shipment_cache();

-- shipmentsテーブルの削除トリガー
DROP TRIGGER IF EXISTS trigger_invalidate_shipment_cache_on_delete ON shipments;
CREATE TRIGGER trigger_invalidate_shipment_cache_on_delete
  AFTER DELETE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_receipt_cache('shipment');

-- 4. open_shipmentsテーブル用トリガー
-- 更新時のトリガー（重要なフィールドが変更された場合のみ）
CREATE OR REPLACE FUNCTION should_invalidate_open_shipment_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- 領収書に影響する重要なフィールドの変更をチェック
  IF (
    OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
    OLD.payment_id IS DISTINCT FROM NEW.payment_id OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.cancelled_at IS DISTINCT FROM NEW.cancelled_at OR
    OLD.refunded_at IS DISTINCT FROM NEW.refunded_at
  ) THEN
    -- キャッシュ無効化を実行
    PERFORM invalidate_receipt_cache();
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- open_shipmentsテーブルの更新トリガー
DROP TRIGGER IF EXISTS trigger_invalidate_open_shipment_cache_on_update ON open_shipments;
CREATE TRIGGER trigger_invalidate_open_shipment_cache_on_update
  AFTER UPDATE ON open_shipments
  FOR EACH ROW
  EXECUTE FUNCTION should_invalidate_open_shipment_cache();

-- open_shipmentsテーブルの削除トリガー
DROP TRIGGER IF EXISTS trigger_invalidate_open_shipment_cache_on_delete ON open_shipments;
CREATE TRIGGER trigger_invalidate_open_shipment_cache_on_delete
  AFTER DELETE ON open_shipments
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_receipt_cache('open_shipment');

-- 5. プロファイル変更時のキャッシュ無効化（ユーザー情報が領収書に影響する場合）
CREATE OR REPLACE FUNCTION invalidate_user_receipt_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- ユーザーの全取引のキャッシュを無効化
  -- shipmentsテーブルのキャッシュ削除
  DELETE FROM receipt_cache 
  WHERE transaction_id IN (
    SELECT id FROM shipments WHERE user_id = COALESCE(NEW.id, OLD.id)
  ) AND transaction_type = 'shipment';
  
  -- open_shipmentsテーブルのキャッシュ削除
  DELETE FROM receipt_cache 
  WHERE transaction_id IN (
    SELECT id FROM open_shipments WHERE user_id = COALESCE(NEW.id, OLD.id)
  ) AND transaction_type = 'open_shipment';
  
  -- ログ記録
  INSERT INTO cache_invalidation_log (
    transaction_id, 
    transaction_type, 
    invalidation_reason
  ) 
  SELECT id, 'shipment', 'ユーザー情報変更'
  FROM shipments 
  WHERE user_id = COALESCE(NEW.id, OLD.id)
  UNION ALL
  SELECT id, 'open_shipment', 'ユーザー情報変更'
  FROM open_shipments 
  WHERE user_id = COALESCE(NEW.id, OLD.id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- プロファイルテーブルの更新トリガー（重要なフィールドのみ）
CREATE OR REPLACE FUNCTION should_invalidate_profile_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- 領収書に影響するプロファイル情報の変更をチェック
  IF (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.company_name IS DISTINCT FROM NEW.company_name OR
    OLD.address IS DISTINCT FROM NEW.address OR
    OLD.phone IS DISTINCT FROM NEW.phone
  ) THEN
    -- ユーザーキャッシュ無効化を実行
    PERFORM invalidate_user_receipt_cache();
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profilesテーブルの更新トリガー
DROP TRIGGER IF EXISTS trigger_invalidate_profile_cache_on_update ON profiles;
CREATE TRIGGER trigger_invalidate_profile_cache_on_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION should_invalidate_profile_cache();

-- 6. 手動キャッシュクリア用の関数
CREATE OR REPLACE FUNCTION manual_clear_receipt_cache(
  p_transaction_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_older_than_hours INTEGER DEFAULT NULL
)
RETURNS TABLE(cleared_count INTEGER, message TEXT) AS $$
DECLARE
  cleared_count INTEGER := 0;
  message TEXT;
BEGIN
  -- 特定の取引IDのキャッシュをクリア
  IF p_transaction_id IS NOT NULL THEN
    DELETE FROM receipt_cache WHERE transaction_id = p_transaction_id;
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    message := format('取引ID %s のキャッシュを %s 件削除しました', p_transaction_id, cleared_count);
    
  -- 特定のユーザーのキャッシュをクリア
  ELSIF p_user_id IS NOT NULL THEN
    DELETE FROM receipt_cache 
    WHERE transaction_id IN (
      SELECT id FROM shipments WHERE user_id = p_user_id
      UNION
      SELECT id FROM open_shipments WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    message := format('ユーザーID %s のキャッシュを %s 件削除しました', p_user_id, cleared_count);
    
  -- 古いキャッシュをクリア
  ELSIF p_older_than_hours IS NOT NULL THEN
    DELETE FROM receipt_cache 
    WHERE created_at < NOW() - INTERVAL '1 hour' * p_older_than_hours;
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    message := format('%s 時間以上古いキャッシュを %s 件削除しました', p_older_than_hours, cleared_count);
    
  -- 全キャッシュをクリア
  ELSE
    DELETE FROM receipt_cache;
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    message := format('全キャッシュを %s 件削除しました', cleared_count);
  END IF;
  
  -- ログ記録
  INSERT INTO cache_invalidation_log (
    transaction_id, 
    transaction_type, 
    invalidation_reason
  ) VALUES (
    p_transaction_id,
    'manual',
    message
  );
  
  RETURN QUERY SELECT cleared_count, message;
END;
$$ LANGUAGE plpgsql;

-- 7. キャッシュ統計取得用の関数
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE(
  total_cached INTEGER,
  oldest_cache TIMESTAMP WITH TIME ZONE,
  newest_cache TIMESTAMP WITH TIME ZONE,
  shipment_count INTEGER,
  open_shipment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_cached,
    MIN(created_at) as oldest_cache,
    MAX(created_at) as newest_cache,
    COUNT(CASE WHEN transaction_type = 'shipment' THEN 1 END)::INTEGER as shipment_count,
    COUNT(CASE WHEN transaction_type = 'open_shipment' THEN 1 END)::INTEGER as open_shipment_count
  FROM receipt_cache;
END;
$$ LANGUAGE plpgsql;

-- 8. インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_receipt_cache_transaction_id ON receipt_cache(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_cache_created_at ON receipt_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_transaction_id ON cache_invalidation_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_created_at ON cache_invalidation_log(created_at);

-- 9. RLS (Row Level Security) の設定
ALTER TABLE cache_invalidation_log ENABLE ROW LEVEL SECURITY;

-- 管理者のみがログを参照可能
CREATE POLICY "管理者のみログ参照可能" ON cache_invalidation_log
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- システムのみがログを挿入可能
CREATE POLICY "システムのみログ挿入可能" ON cache_invalidation_log
  FOR INSERT
  WITH CHECK (true); -- トリガーからの挿入を許可

COMMENT ON TABLE cache_invalidation_log IS 'キャッシュ無効化ログテーブル - 自動無効化の履歴を記録';
COMMENT ON FUNCTION invalidate_receipt_cache() IS 'キャッシュ無効化トリガー関数 - 取引データ変更時に自動実行';
COMMENT ON FUNCTION manual_clear_receipt_cache(UUID, UUID, INTEGER) IS '手動キャッシュクリア関数 - 管理用';
COMMENT ON FUNCTION get_cache_statistics() IS 'キャッシュ統計取得関数 - 監視用';