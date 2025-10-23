#!/usr/bin/env bash
set -euo pipefail
set +o history 2>/dev/null || true
set +o histexpand 2>/dev/null || true
: "${ENV_HOST_STAGING:?set ENV_HOST_STAGING}"
mkdir -p artifacts/go_nogo
# Webhookリプレイ（順序逆転の簡易検証）
bash scripts/preflight/06_webhook_replay.sh "$ENV_HOST_STAGING" | tee artifacts/go_nogo/webhook_replay.log
bash scripts/preflight/01_idempotency.sh "$ENV_HOST_STAGING" | tee artifacts/go_nogo/idempotency.log
bash scripts/preflight/02_consistency.sh "$ENV_HOST_STAGING" | tee artifacts/go_nogo/consistency.log
bash scripts/preflight/05_observability_check.sh "$ENV_HOST_STAGING" | tee -a artifacts/go_nogo/observability.log
npx playwright test tests/e2e/ship_success_page.spec.ts | tee artifacts/go_nogo/e2e_success_page.log
npm run test -- tests/contracts/rls_visibility.contract.test.ts | tee artifacts/go_nogo/rls_visibility.log
node scripts/go_nogo/report_aggregate.cjs staging
grep -q "\[FAIL\]\|Timeout\|ERR" artifacts/go_nogo/*.log && { echo "[NO-GO] failure keyword detected"; exit 1; }
