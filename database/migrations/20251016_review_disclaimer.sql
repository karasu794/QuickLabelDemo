-- Review Disclaimer (consent) minimal columns (non-destructive)

-- Drafts: store pre-payment consent state
ALTER TABLE IF EXISTS public.drafts
  ADD COLUMN IF NOT EXISTS disclaimer_agreed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS disclaimer_agreed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS terms_version text NULL;

-- Shipments: store finalized consent and payment linkage
ALTER TABLE IF EXISTS public.shipments
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS terms_version text NULL,
  ADD COLUMN IF NOT EXISTS payment_tx_id text NULL;

-- Optional: prevent duplicate consent linkage per order or payment tx (idempotency guard)
-- Not enforcing uniqueness hard (prod decision), but provide an index for analytics/lookup
CREATE INDEX IF NOT EXISTS idx_shipments_payment_tx_id ON public.shipments(payment_tx_id);

-- App settings: optional current terms version as key-value
-- Uses key: 'current_terms_version' → value: 'v1' (string)
INSERT INTO public.app_settings (key, value, description)
VALUES ('current_terms_version', 'v1', '現在の利用規約/免責事項のバージョン文字列')
ON CONFLICT (key) DO NOTHING;


