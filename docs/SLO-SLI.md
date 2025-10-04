# SLO / SLI

## 原則
- 各APIの SLI は最大2つ（success_rate, p95_latency_ms）
- SLO は目安（例：success >= 99.5%, p95 <= 800ms）
- Feature Flag ON/OFF で分割集計

## 例
### /api/ship/create
- SLI: success_rate, p95_latency_ms
- SLO: 99.5%, 800ms
- Flag: N/A（必要時は追加）

### /api/receipts/pdf
- SLI: success_rate, p95_latency_ms
- SLO: 99.0%, 3000ms
- Flag: N/A（必要になれば追加）