-- shipmentsテーブルの改善: 決済ステータスと輸送ステータスを分離
-- Square返金APIに必要な情報を追加

-- 1. 決済ステータス専用カラムを追加
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- 2. 輸送ステータス専用カラムを追加
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(20) DEFAULT 'draft';

-- 3. Square Location IDを追加（返金APIで必須）
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS square_location_id VARCHAR(255);

-- 4. 返金理由フィールドを追加
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- 5. 返金ID追跡用フィールド
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS square_refund_id VARCHAR(255);

-- 6. 既存のステータスを新しいカラムに移行
UPDATE public.shipments 
SET 
  -- 輸送ステータスの移行
  shipping_status = CASE 
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'shipment_created' THEN 'created'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'delivered' THEN 'delivered'
    ELSE 'created'  -- デフォルト値
  END,
  -- 決済ステータスの移行
  payment_status = CASE 
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN square_payment_id IS NOT NULL THEN 'completed'
    WHEN payment_id IS NOT NULL THEN 'processing'
    ELSE 'pending'
  END;

-- 7. インデックス追加
CREATE INDEX IF NOT EXISTS idx_shipments_payment_status ON public.shipments(payment_status);
CREATE INDEX IF NOT EXISTS idx_shipments_shipping_status ON public.shipments(shipping_status);
CREATE INDEX IF NOT EXISTS idx_shipments_square_location_id ON public.shipments(square_location_id);

-- 8. チェック制約追加（既存のステータスを含む）
ALTER TABLE public.shipments 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'));

ALTER TABLE public.shipments 
ADD CONSTRAINT check_shipping_status 
CHECK (shipping_status IN (
  'draft',
  'created',
  'shipment_created',  -- 既存の値を許可
  'confirmed',
  'in_transit',
  'delivered',
  'cancelled',
  'returned'
));

-- 9. コメント追加
COMMENT ON COLUMN public.shipments.payment_status IS '決済ステータス: pending(待機), processing(処理中), completed(完了), failed(失敗), refunded(返金), cancelled(キャンセル)';
COMMENT ON COLUMN public.shipments.shipping_status IS '輸送ステータス: draft(下書き), created(作成), confirmed(確定), in_transit(輸送中), delivered(配達完了), cancelled(キャンセル), returned(返送)';
COMMENT ON COLUMN public.shipments.square_location_id IS 'Square Location ID (返金APIで必須)';
COMMENT ON COLUMN public.shipments.refund_reason IS '返金理由';
COMMENT ON COLUMN public.shipments.square_refund_id IS 'Square返金ID';

-- 10. 既存のstatusカラムの値を確認（オプション）
-- SELECT DISTINCT status FROM public.shipments ORDER BY status;

-- 11. 既存のstatusカラムを非推奨としてマーク
COMMENT ON COLUMN public.shipments.status IS '非推奨: 代わりにpayment_statusとshipping_statusを使用してください'; 