#!/usr/bin/env bash
set -euo pipefail
HOST=${1:?set HOST}
set +o history 2>/dev/null || true
set +o histexpand 2>/dev/null || true
RID="whreplay-$RANDOM-$(date +%s)"
mkdir -p fixtures
if [[ ! -f fixtures/square_payment_succeeded.json ]]; then
  cat > fixtures/square_payment_succeeded.json <<'JSON'
{ "type": "payment.updated", "data": { "object": { "payment": { "id": "test-payment-id", "status": "COMPLETED" } } } }
JSON
fi
if [[ ! -f fixtures/fedex_label_created.json ]]; then
  cat > fixtures/fedex_label_created.json <<'JSON'
{ "type": "fedex.label.created", "data": { "trackingNumber": "TEST123456789" } }
JSON
fi
curl -s -X POST "$HOST/api/payments/webhook" -H "x-request-id: $RID" -H "X-Test-Bypass-Signature: 1" -H "Content-Type: application/json" -d @fixtures/square_payment_succeeded.json >/dev/null || true
sleep 2
# FedEx webhookはダミー (実装されていない場合はNOP)
curl -s -X POST "$HOST/api/fedex/webhook" -H "x-request-id: $RID" -H "Content-Type: application/json" -d @fixtures/fedex_label_created.json >/dev/null || true
echo "[OK] webhook replay seeded ($RID)"
