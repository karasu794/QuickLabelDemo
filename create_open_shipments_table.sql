-- Open Shipment管理テーブル作成
-- FedEx Open Ship API対応の複数個口配送管理

CREATE TABLE open_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー情報
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- FedEx情報
  master_tracking_number VARCHAR(50) UNIQUE, -- FedExのマスター追跡番号
  fedex_index VARCHAR(100), -- FedExのユニークインデックス（オプション）
  fedex_job_id VARCHAR(100), -- 非同期処理用ジョブID（40個超の場合）
  
  -- ステータス管理
  status VARCHAR(20) NOT NULL DEFAULT 'created', 
  -- 'created', 'in_progress', 'processing', 'confirmed', 'cancelled'
  
  -- 荷物情報
  total_packages INTEGER NOT NULL DEFAULT 1, -- 予定総荷物数
  packages_added INTEGER NOT NULL DEFAULT 1, -- 現在追加済み荷物数
  
  -- 送り状情報
  shipper_info JSONB NOT NULL, -- 荷送人情報
  recipient_info JSONB NOT NULL, -- 荷受人情報
  service_type VARCHAR(50) NOT NULL, -- FedExサービスタイプ
  
  -- 決済情報
  payment_id VARCHAR(100), -- Square決済ID
  total_amount NUMERIC(10,2), -- 総額
  
  -- 結果データ
  tracking_numbers TEXT[], -- 全荷物の追跡番号配列
  label_urls TEXT[], -- ラベルURL配列
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE, -- 確定日時
  
  -- インデックス用
  CONSTRAINT valid_status CHECK (status IN ('created', 'in_progress', 'processing', 'confirmed', 'cancelled')),
  CONSTRAINT valid_packages CHECK (packages_added <= total_packages),
  CONSTRAINT valid_packages_count CHECK (total_packages > 0 AND packages_added >= 0)
);

-- インデックス作成
CREATE INDEX idx_open_shipments_user_id ON open_shipments(user_id);
CREATE INDEX idx_open_shipments_master_tracking ON open_shipments(master_tracking_number);
CREATE INDEX idx_open_shipments_status ON open_shipments(status);
CREATE INDEX idx_open_shipments_created_at ON open_shipments(created_at);
CREATE INDEX idx_open_shipments_fedex_job_id ON open_shipments(fedex_job_id) WHERE fedex_job_id IS NOT NULL;

-- Row Level Security (RLS) 設定
ALTER TABLE open_shipments ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のOpen Shipmentのみアクセス可能
CREATE POLICY "Users can only access their own open shipments" ON open_shipments
  FOR ALL USING (auth.uid() = user_id);

-- 未ログインユーザーでも一時的にアクセス可能（セッション管理）
CREATE POLICY "Allow anonymous access for session management" ON open_shipments
  FOR ALL USING (user_id IS NULL);

-- 管理者は全てのOpen Shipmentにアクセス可能
CREATE POLICY "Admin can access all open shipments" ON open_shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_open_shipments_updated_at 
    BEFORE UPDATE ON open_shipments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Open Shipment履歴ビュー（統計用）
CREATE VIEW open_shipments_summary AS
SELECT 
  user_id,
  status,
  service_type,
  COUNT(*) as shipment_count,
  SUM(total_packages) as total_packages_sum,
  AVG(total_amount) as average_amount,
  DATE_TRUNC('month', created_at) as month
FROM open_shipments
GROUP BY user_id, status, service_type, DATE_TRUNC('month', created_at);

-- コメント追加
COMMENT ON TABLE open_shipments IS 'FedEx Open Ship API対応の複数個口配送管理テーブル';
COMMENT ON COLUMN open_shipments.master_tracking_number IS 'FedExのマスター追跡番号（最初のパッケージ）';
COMMENT ON COLUMN open_shipments.fedex_index IS 'FedExのOpen Shipmentユニークインデックス';
COMMENT ON COLUMN open_shipments.fedex_job_id IS '40個超の場合の非同期処理ジョブID';
COMMENT ON COLUMN open_shipments.status IS 'Open Shipmentの状態: created, in_progress, processing, confirmed, cancelled';
COMMENT ON COLUMN open_shipments.total_packages IS '予定している総荷物数';
COMMENT ON COLUMN open_shipments.packages_added IS '現在までに追加済みの荷物数';
COMMENT ON COLUMN open_shipments.tracking_numbers IS '確定後の全荷物追跡番号配列';
COMMENT ON COLUMN open_shipments.label_urls IS '確定後の全ラベルURL配列'; 