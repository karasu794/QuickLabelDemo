#!/usr/bin/env bash
set -euo pipefail
HOST="${1:-}"
TRACKING="${TRACKING_NUMBER:-}"
if [[ -z "${HOST}" || -z "${TRACKING}" ]]; then
  echo "Usage: TRACKING_NUMBER=<tracking> $0 <HOST>" >&2
  exit 1
fi
REQ_ID="fql-$(date +%s%3N)"

curl -sS -X POST "${HOST%/}/api/ship/consistency" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: ${REQ_ID}" \
  -d "{\"trackingNumber\":\"${TRACKING}\"}" | tee ./tmp/preflight/consistency.json >/dev/null

if command -v jq >/dev/null 2>&1; then
  jq . ./tmp/preflight/consistency.json
fi
