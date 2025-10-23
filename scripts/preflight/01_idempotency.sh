#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-}"
if [[ -z "${HOST}" ]]; then
  echo "Usage: $0 <HOST>" >&2
  exit 1
fi

# NOTE:
# - Stagingで実行してください。
# - 実際に成功させるには Square 決済と有効な出荷データが必要です。
# - 既存の成功ケースの orderId と body を BODY_JSON に指定して実行することを推奨します。
# - 例) BODY_JSON='{"orderId":"ord-...","serviceType":"FEDEX_INTERNATIONAL_PRIORITY",...}'

REQ_ID="fql-$(date +%s%3N)"
IDEMP="fql-$(date +%s%3N)"
BODY_JSON="${BODY_JSON:-}"
if [[ -z "${BODY_JSON}" ]]; then
  echo "[WARN] BODY_JSON が未設定です。API要件を満たすJSONを環境変数で渡してください。" >&2
fi

mkdir -p ./tmp/preflight

curl -sS -X POST "${HOST%/}/api/ship/create" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: ${REQ_ID}" \
  -H "Idempotency-Key: ${IDEMP}" \
  -d "${BODY_JSON}" | tee ./tmp/preflight/r1.json >/dev/null

# 同一キー・同一ボディで再実行
curl -sS -X POST "${HOST%/}/api/ship/create" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: ${REQ_ID}" \
  -H "Idempotency-Key: ${IDEMP}" \
  -d "${BODY_JSON}" | tee ./tmp/preflight/r2.json >/dev/null

if command -v jq >/dev/null 2>&1; then
  diff <(jq -S . ./tmp/preflight/r1.json) <(jq -S . ./tmp/preflight/r2.json) && echo "[OK] idempotent: responses are identical" || { echo "[NG] responses differ"; exit 2; }
else
  diff ./tmp/preflight/r1.json ./tmp/preflight/r2.json && echo "[OK] idempotent: responses are identical" || { echo "[NG] responses differ"; exit 2; }
fi
