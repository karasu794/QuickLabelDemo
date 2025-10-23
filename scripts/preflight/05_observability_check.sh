#!/usr/bin/env bash
set -euo pipefail
HOST="${1:-}"
if [[ -z "${HOST}" ]]; then
  echo "Usage: $0 <HOST>" >&2
  exit 1
fi
REQ_ID="fql-$(date +%s%3N)"

# ダミーGETでログライン確認（実際はアプリの観測画面・ログ基盤でREQ_IDを検索）
curl -sS -H "X-Request-Id: ${REQ_ID}" "${HOST%/}/api/health" | tee ./tmp/preflight/health.json >/dev/null

echo "Search logs for X-Request-Id: ${REQ_ID}"
echo "Expect to see the same id in UI->API(log), ship.create flow, DB steps."
