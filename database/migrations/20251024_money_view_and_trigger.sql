-- *_money jsonb と既存列の単方向同期(READ:new / WRITE:legacy)。逆方向はRAISE EXCEPTION
-- 例: shipments テーブルの total_amount / currency → total_money

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'total_money'
  ) THEN
    ALTER TABLE public.shipments ADD COLUMN total_money jsonb;
  END IF;
END $$;

-- ビュー: *_money を優先して読み出す
CREATE OR REPLACE VIEW public.v_shipments AS
SELECT 
  s.*, 
  COALESCE(s.total_money, jsonb_build_object('amount', s.total_amount, 'currency', s.currency)) AS total_money_view
FROM public.shipments s;

-- トリガ: *_money への直接書込は拒否（ビュー経由）
CREATE OR REPLACE FUNCTION public.trg_block_money_jsonb_write()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'write to *_money is not allowed; update legacy columns instead';
END;$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'block_total_money_write'
  ) THEN
    CREATE TRIGGER block_total_money_write
    BEFORE INSERT OR UPDATE OF total_money ON public.shipments
    FOR EACH ROW EXECUTE FUNCTION public.trg_block_money_jsonb_write();
  END IF;
END $$;


