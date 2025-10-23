-- 新規: メール送信履歴
CREATE TABLE IF NOT EXISTS shipment_emails (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   uuid NOT NULL,
  message_id    text,
  status        text NOT NULL CHECK (status IN ('sent','failed','queued_for_retry')),
  error         text,
  request_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipment_emails_shipment ON shipment_emails (shipment_id);


