-- 非破壊: invoice_options と *_money 併存
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shipments' AND column_name='invoice_options'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN invoice_options JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shipments' AND column_name='total_amount_money'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN total_amount_money JSONB;
  END IF;
END $$;

-- 備考: 同期トリガは別途検討（読み取りは *_money 優先）


