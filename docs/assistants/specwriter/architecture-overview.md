# Architecture Overview — QuickLabel

本書は QuickLabel の全体像を短時間で把握できるように、レイヤ構成・主要ディレクトリ・データフロー・外部依存・認証/デプロイの要点を集約したものです。設計/実装の一次情報のみを反映し、未確定は TODO として明記します。

## レイヤ構成図（テキスト）

- UI（Next.js App Router, React 18）
  - 画面/フォーム/コンポーネント（`src/app/**`, `src/components/**`）
  - E2E用セレクタは `data-test`（詳細は `data-test-selectors.md`）
- API Routes（サーバ境界, `src/app/api/**/route.ts`）
  - Zod で入出力検証（`zod`, `validateOrThrow`）
  - リポジトリ/サービス呼び出し、外部API接続（FedEx/Square/Blob）
  - 監視ログ（`src/lib/observability/logger.ts`）
- Server Libraries（`src/lib/**`）
  - Supabase ラッパ（`@/lib/supabase/server`）
  - RateGuard（料金照合, `@/lib/ship/rateGuard.ts`）
  - 入力正規化/テキスト処理 等
- Data Access（Supabase, RLS）
  - RLS方針: admin=SELECT only, owner=CRUD, service_role=FULL（詳細は `rls-policies.md`）
  - シングルテナント運用に伴う RLS ON/OFF の切替マイグレーションあり（後述）
- 外部サービス
  - FedEx（発行/ラベルURL）
  - Square（決済確認）
  - Vercel Blob（PDF格納）

## 主要ディレクトリ

- `src/app/`: App Router。`page.tsx` と `api/**/route.ts` が並立。
- `src/components/`: 再利用UI。レスポンシブテーブル/カード等。
- `src/lib/`: サーバユーティリティ（Supabaseラッパ、RateGuard、観測ロガー 等）。
- `database/`, `supabase/`: SQL・マイグレーション・RLS定義/無効化スクリプト。
- `docs/`: 正準ドキュメント（`ARCHINDEX.md`, `Guardrails.md`, `feature-flags.md` 他）。

## データフロー（要約）

### 出荷作成 `/api/ship/create`（POST）

1) フラグガード: `SHIP_API_WRITE_ENABLED !== 'true'` なら 503（書き込み停止）
2) Zod で入力検証（住所/荷姿/HTSコード）
3) ユーザー取得（Supabase Auth）→ ドラフト同意確認（`drafts.disclaimer_agreed`）
4) RateGuard: 決済合計と見積/決済記録の差分を `REQUIRE_RATE_MATCH`, `RATE_GUARD_MAX_PCT/ABS` で検証
5) FedEx 発行 → ラベルPDF取得 → Vercel Blob へ保存
6) `shipments` へ永続化（`order_id` 冪等）→ 応答
7) 観測ログは各段階を `withTiming()` で出力（PII除外）

### 観測（例） `/api/diagnostics/runtime-logs`（GET）

- `ACTIONS_TOKEN` による Bearer 認証（ミドルウェア）
- `since/until/jobId/status/limit/cursor` を受け取り、整形済みログを返却（現状はダミー生成）

## 認証/認可

- 認証: Supabase Auth（`@supabase/auth-helpers-nextjs` ミドルウェア）
- 認可（API内）:
  - 管理APIは `role==='admin' OR is_admin===true` を許容（`src/app/api/admin/**` に実装例）
  - RLS: テーブルごとのポリシーは `rls-policies.md` を参照
  - Dev/診断系APIは `ACTIONS_TOKEN` でトークン保護（`src/middleware.ts`）

## 重要依存

- Next.js 14（App Router）/ TypeScript / React 18
- Supabase（RLS, auth, clientラッパ必須）
- Square（決済確認のみ）
- FedEx（送り状発行/ラベルURL）
- Vercel Blob（ラベルPDF保存）
- Zod（契約/バリデーション）

## デプロイ/設定

- 環境変数例は `env.example` を参照
  - `SHIP_API_WRITE_ENABLED`, `REQUIRE_RATE_MATCH`, `RATE_GUARD_MAX_*`, `ACTIONS_TOKEN`, `BLOB_READ_WRITE_TOKEN` 等
- Next 設定は `next.config.js`（CI/Windowsでの standalone 出力制御 等）
- CI/前処理: `scripts/preflight.mjs`, `scripts/check-docs-updated.js`, `scripts/check-flag-deadlines.js`

## リスク/注意

- RLSの有効/無効を切り替えるマイグレーションが混在（単一テナント運用向けの `disable_rls` あり）。運用方針に応じて選択・整合が必要（詳細は `rls-policies.md`）。
- route 直下での `supabase.from()` は禁止。必ずラッパ/リポジトリ経由（`docs/Guardrails.md`）。

---

### Sources

- `docs/ARCHINDEX.md`
- `docs/observability-shipping.md`
- `docs/Guardrails.md`
- `env.example`
- `next.config.js`
- `package.json`
- `src/app/api/ship/create/route.ts`
- `src/app/api/diagnostics/runtime-logs/route.ts`
- `src/middleware.ts`
- `database/migrations/20251007_stage1_integrated.sql`
- `database/migrations/20251007_rls_shipments.sql`
- `database/migrations/20251007_rls_address_book.sql`
- `database/migrations/20251007_rls_open_shipments.sql`
- `supabase/migrations/20251004_disable_rls.sql`

Last-Verified: 2025-10-20
