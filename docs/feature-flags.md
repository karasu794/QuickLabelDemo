# Feature Flags 台帳

## 種別
- Release（短期：削除前提） / Experiment（検証後に削除） / Ops（常設可）

## 運用ルール
- Release/Experiment は Cleanup 期限必須（YYYY-MM-DD, UTC基準）
- 追加時はこのファイルに必ず行追加（CI突合）

## 一覧
| Flag | Type | Created | Status | Cleanup | Scope |
|------|------|---------|--------|---------|-------|
| SAMPLE_FEATURE | Release | 2025-10-01 | Active | 2025-11-01 | UI: shipments |
| EXP_NEW_QUOTE  | Experiment | 2025-10-03 | Off | 2025-10-20 | API: quotes |
| OPS_TOGGLE_X   | Ops | 2025-10-03 | Active | N/A | DevOps |
