# API Contracts Index（SpecWriter用）

本書は主要APIの入出力とエラー、関連フラグ/RLS/契約テストの索引です。一次情報に基づき、未確定は TODO で明記します。

## 目次

- /api/ship/create (POST)
- /api/diagnostics/runtime-logs (GET)
- /api/dev/health (GET)
- /api/hts/suggest (GET/POST)
- /api/admin/settings (GET/POST)
- /api/admin/users/* (POST/DELETE)

## /api/ship/create (POST)

- 入力: orderId, serviceType, bill.payer, shipper/recipient, package(s), htsCode?, payment_tx_id?, terms_version?
- 出力: { trackingNumber, labelUrl, serviceType, rate, currency, htsCode?, masterTrackingNumber, trackingNumbers[], labelUrls[] }
- エラー: 503 WRITE_DISABLED, 400 BAD_REQUEST/HTS_CODE_REQUIRED/RATE_GUARD_MISMATCH, 402 PAYMENT_REQUIRED, 500 PERSIST_FAILED, 502 SHIP_FAILED
- Flags: SHIP_API_WRITE_ENABLED, REQUIRE_RATE_MATCH, RATE_GUARD_MAX_PCT/ABS
- RLS: shipments owner CRUD / admin SELECT / service_role FULL
- Notes: advisory lock（order_id）、Blob 保存、PIIをログ出力しない

## /api/diagnostics/runtime-logs (GET)

- 入力: since?, until?, jobId?, status?(OK|ERROR), limit?(1..100), cursor?
- 出力: { items: { jobId, step, status, cause, created_at }[], nextCursor }
- エラー: 401 Unauthorized（ACTIONS_TOKEN 不一致時）, 422 validation_error
- Flags: ACTIONS_TOKEN（ミドルウェア保護）
- Notes: 仕様はダミー実装（将来拡張）

## /api/dev/health (GET)

- 出力: { ok: true, env, openai: boolean, supabase: boolean, guarded: true, ts }
- Flags: ACTIONS_TOKEN（ミドルウェア保護）

## /api/hts/suggest (GET/POST)

- POST 入出力: `HTSInputSchema` → `HTSOutputSchema`（Zod）
- GET 入力: q, dest=US, limit=1..20（認証必須/未認証は空配列）
- GET 出力: 候補配列（最大 limit）
- Flags: FEATURE_HTS_SUGGESTIONS（OFF で空配列）

## /api/admin/settings (GET/POST)

- GET: Phoenix 強制トグルの集約（DB値優先、ENVフォールバック）
- POST: `FORCE_PHOENIX_LETTERHEAD`/`FORCE_PHOENIX_SIGNATURE` を upsert（boolean）
- Guard: 管理者のみ（role==='admin' OR is_admin===true）
- Cache: private, max-age=60

## /api/admin/users/*

- `POST /api/admin/users/[id]/(ban|suspend|resume)` / `DELETE /api/admin/users/[id]`
- 出力: { ok: true }
- 監査: `admin_actions` に1件記録
- Contract Tests: tests/contracts/admin.users.actions.contract.test.ts（TODO: 実ファイルの有無確認）

---

### Sources

- `src/app/api/ship/create/route.ts`
- `src/app/api/diagnostics/runtime-logs/route.ts`
- `src/app/api/dev/health/route.ts`
- `src/app/api/hts/suggest/route.ts`
- `src/app/api/admin/settings/route.ts`
- `docs/admin-users-actions.md`
- `docs/observability-shipping.md`

Last-Verified: 2025-10-20
