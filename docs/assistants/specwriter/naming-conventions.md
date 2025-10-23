# 命名規約（SpecWriter用）

本書はコード/DB/テスト/ドキュメントの命名規約を横断的にまとめたものです。一次情報（既存実装/ドキュメント）に整合し、OK/NG 例を最小で提示します。

## 共通
- 英語の識別子（関数/変数/パス/セレクタ/フラグ名）。
- kebab-case: `data-test` セレクタ名、ファイル名（Next.js ルート）
- camelCase: 変数/関数（TS）
- PascalCase: React コンポーネント

## UI / テスト
- `data-test` 属性は kebab-case（例: `preview-button`, `disclaimer-checkbox`）。
- `data-testid` は使用しない（`PR-PLAN.md` の導入記述ありだが実装は `data-test`）。

OK 例:
- `data-test="modal-addressbook-picker"`
- コンポーネント `AddressBookPicker.tsx`

NG 例:
- `dataTest="modalAddressBookPicker"`（キャメル/属性名不正）
- `data-testid`（別属性）

## 環境変数/フラグ
- 露出域に応じて `NEXT_PUBLIC_*` を付与（クライアントのみ）。機微値は `NEXT_PUBLIC_*` を使わない。
- RateGuard 旧名との互換キーは段階的廃止方針（`RATE_MATCH_*`）。

OK 例:
- `SHIP_API_WRITE_ENABLED`, `REQUIRE_RATE_MATCH`（サーバ側）
- `NEXT_PUBLIC_ENABLE_NEW_LOGIN`（UIフラグ）

NG 例:
- `PUBLIC_REQUIRE_RATE_MATCH`（露出域の誤り）

## DB / マイグレーション
- テーブル: snake_case（例: `open_shipments`, `app_settings`）
- カラム: snake_case（例: `created_at`, `is_admin`）
- ポリシー名: 簡潔な英文（例: `Owner select shipments`）
- マイグレーション: 日付接頭辞で目的を短句に（`20251007_rls_shipments.sql`）

## テスト名
- e2e/contract: 対象と期待の短句（`ui.stage3.invoice.contract.test.tsx` 等）
- `tests/**` 配下はパターンでスクリプト起動可能（`package.json` 参照）

---

### Sources
- `docs/Stage3-TEST-GUIDE.md`
- `docs/PR-PLAN.md`
- `database/migrations/*.sql`
- `src/components/**`

Last-Verified: 2025-10-20


