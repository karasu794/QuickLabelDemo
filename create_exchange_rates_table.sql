-- 為替レート情報を保存するテーブルを作成

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  currency_pair VARCHAR(10) NOT NULL DEFAULT 'USD_JPY',
  rate DECIMAL(10, 6) NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_pair ON exchange_rates(currency_pair);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at ON exchange_rates(currency_pair, fetched_at DESC);

-- 最新の為替レートのみを保持するため、古いレコードを削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_exchange_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しいレコードが挿入された際に、同じ通貨ペアの古いレコードを削除
  DELETE FROM exchange_rates 
  WHERE currency_pair = NEW.currency_pair 
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（新しいレコード挿入時に自動的に古いレコードを削除）
DROP TRIGGER IF EXISTS trigger_cleanup_old_exchange_rates ON exchange_rates;
CREATE TRIGGER trigger_cleanup_old_exchange_rates
  AFTER INSERT ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_exchange_rates();

-- 更新時間を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（レコード更新時に自動的にupdated_atを更新）
DROP TRIGGER IF EXISTS trigger_update_exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER trigger_update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 初期データ（必要に応じて）
-- INSERT INTO exchange_rates (currency_pair, rate) VALUES ('USD_JPY', 150.0) ON CONFLICT DO NOTHING; 