# Actions Guard

- Protected endpoints (require `Authorization: Bearer <ACTIONS_TOKEN>`):
  - /api/dev/health
  - /api/diagnostics/runtime-logs
  - /api/run-e2e
  - /api/runs/:jobId

## Header
- `Authorization: Bearer <token>` (exact match with `process.env.ACTIONS_TOKEN`)

## 401 Responses
- JSON { "error": "unauthorized" } + `WWW-Authenticate: Bearer`

## Notes
- Only listed endpoints are protected; other public API routes are unaffected.
- Return 401 fast, no body leaks.
