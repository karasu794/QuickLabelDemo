# SLI / SLO — Minimal Observability

> 各API 最大2指標。Flag ON/OFF で分割集計できるとベター。

## /api/ship/create
- SLI: success_rate, p95_latency_ms
- SLO: success_rate >= 99.5%, p95 <= 800
- Notes: Flag=USE_NEW_CTX_MIDDLEWARE 分割

## /api/ship/rate
- SLI: success_rate, p95_latency_ms
- SLO: success_rate >= 99.0%, p95 <= 600
