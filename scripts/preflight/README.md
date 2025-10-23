# Preflight scripts

- 01_idempotency.sh – ship/create idempotency
- 02_consistency.sh – consistency API check
- 04_sql_readonly.sql – orphan / duplicates (READ ONLY)
- 05_observability_check.sh – x-request-id trace seed

Set these before running:
- ENV_HOST_STAGING, ENV_HOST_PROD
- QUOTE_JOB_ID
- Supabase ENV in .env for test helpers (see docs/Preflight/CONFIG.md)
