# RLS Policies — 決定表（SpecWriter用）

本書は Supabase RLS のテーブル別ポリシーを、実SQLと運用方針に一致する形で整理した決定表です。単一テナント運用での RLS 無効化スクリプトも存在するため、環境/フェーズごとの整合が必要です（推測は禁止、差分は Sources を参照）。

## 方針

- 原則: admin=SELECT only、owner=CRUD、service_role=FULL。
- 例外/ロールバック: `supabase/migrations/20251004_disable_rls.sql` により一括無効化する構成あり。切替はPR管理。
- 管理者判定: `profiles.is_admin=true` または `profiles.role='admin'`（`v_is_admin` ビュー経由の定義あり）。

## 決定表（主要テーブル）

| Table | anon | authenticated | owner | admin | service_role |
|---|---|---|---|---|---|
| profiles | × | △（自分のみ）| 自分: CRUD | 全SELECT（またはFULL, SQL差分あり）| FULL |
| shipments | × | △ | 自分: CRUD | SELECT only | FULL |
| open_shipments | × | △ | 自分: CRUD | SELECT only | FULL |
| address_book | × | △ | 自分: CRUD | SELECT only | FULL |
| app_settings | × | △（通常はSELECTのみ）| N/A | N/A | FULL |
| quote_jobs | △（旧: public許可の痕跡あり）| △ | 自分: 参照優先 | N/A | FULL |
| notifications | × | △ | 自分: CRUD | N/A | FULL |

注: `profiles` は単一ポリシーで owner ALL を設定する SQL も存在（`database/enable_profiles_rls.sql`）。運用時にどちらかへ統一が必要。

## SQL 由来の一次情報（抜粋）

- `database/migrations/20251007_stage1_integrated.sql`: `v_is_admin` で admin 判定を集約。`shipments` の admin=SELECT only / owner CRUD / service_role FULL を定義。
- `database/migrations/20251007_rls_shipments.sql`: `Admin select shipments` 他、owner CRUD, service_role FULL。
- `database/migrations/20251007_rls_open_shipments.sql`: 同パターン。
- `database/migrations/20251007_rls_address_book.sql`: 同パターン。
- `database/allow_server_access.sql`: 各主要テーブルに service_role FULL の明示。
- `supabase/migrations/20251004_disable_rls.sql`: 主要テーブルの RLS を一括無効化。
- `database/enable_profiles_rls.sql`: `profiles` の owner ALL 単一ポリシー版。

## UI 側の制約

- 管理UI（`/admin/**`）は SSR 判定でリンク可視/不可視を固定（`docs/admin-header-guard.md`）。
- API は `requireAdminAuthRoute()` 同等の明示的ガード（実装例: `src/app/api/admin/**`）。

## 要注意クエリ

- route 直下での `.from()` 呼び出しは原則禁止。サーバラッパ/リポジトリ経由（`docs/Guardrails.md`）。
- `open_shipments` の匿名許可は廃止方針（ROLLBACK 手順がSQLに残存）。現行運用では OFF を前提。

## TODO（不足・要確認）

- `profiles` の最終的な運用形（admin FULL vs SELECT only vs owner ALL）の統一。
- `quote_jobs` の匿名可否（旧ポリシー痕跡の整理）。

---

### Sources

- `database/migrations/20251007_stage1_integrated.sql`
- `database/migrations/20251007_rls_shipments.sql`
- `database/migrations/20251007_rls_open_shipments.sql`
- `database/migrations/20251007_rls_address_book.sql`
- `database/allow_server_access.sql`
- `database/enable_profiles_rls.sql`
- `supabase/migrations/20251004_disable_rls.sql`

Last-Verified: 2025-10-20
