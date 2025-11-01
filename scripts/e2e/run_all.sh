#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.e2e ]; then
  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue;;
      *=*) export "$line";;
    esac
  done < .env.e2e
fi

: "${BASE_URL?BASE_URL is required}"

# Playwright baseURL 用に環境変数を設定
export BASE_URL

# 1) Unit
pnpm exec vitest run tests/unit/successGate.test.ts || exit 1

# 2) E2E（SSR Gate）
E2E_SHIPMENT_PENDING_ID=${E2E_SHIPMENT_PENDING_ID:-}
E2E_SHIPMENT_COMPLETED_ID=${E2E_SHIPMENT_COMPLETED_ID:-}

if [ -z "${E2E_SHIPMENT_PENDING_ID}" ] || [ -z "${E2E_SHIPMENT_COMPLETED_ID}" ]; then
  echo "[seed] creating test shipments..."
  node scripts/e2e/seed_shipments.ts > /tmp/seed.json
  export E2E_SHIPMENT_PENDING_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/seed.json','utf8')).pendingId)")
  export E2E_SHIPMENT_COMPLETED_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/seed.json','utf8')).completedId)")
fi

pnpm playwright test tests/e2e/success_gate_enforce.spec.ts || exit 1

# 3) E2E（download-label 認可）
: "${E2E_OWNER_COOKIE?E2E_OWNER_COOKIE is required}"
: "${E2E_OTHER_COOKIE?E2E_OTHER_COOKIE is required}"
: "${E2E_OWNER_SHIPMENT_ID?E2E_OWNER_SHIPMENT_ID is required}"

pnpm playwright test tests/e2e/download_label_auth.spec.ts || exit 1

# 4) 任意: Hookdeck smoke（ALLOW_TEST_ROUTES=true の時のみ）
if [ "${ALLOW_TEST_ROUTES:-false}" = "true" ]; then
  pnpm playwright test tests/e2e/hookdeck_smoke.spec.ts || exit 1
fi

echo "\nAll internal tests passed. Ready for prod test." 


