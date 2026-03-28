$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$env:NODE_ENV="development"
$env:DEBUG_RATE_AUDIT="true"
$env:DEBUG_RATE_RECONCILE="true"
New-Item -ItemType Directory -Force -Path "artifacts/logs" | Out-Null
pnpm -s test -t "getFedExRates.audit.contract" *>&1 | Tee-Object -FilePath "artifacts/logs/audit_points_$ts.log"
pnpm -s test -t "normalizeFedExRate" *>&1 | Tee-Object -FilePath "artifacts/logs/normalize_$ts.log"
$env:NODE_ENV=$null; $env:DEBUG_RATE_AUDIT=$null; $env:DEBUG_RATE_RECONCILE=$null
"done: audit+normalize tests @ $ts"
