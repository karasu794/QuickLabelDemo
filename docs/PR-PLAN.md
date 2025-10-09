## PR Plan: Stage3 Letterhead/Signature Force

### 変更点
- Stage4: PDF Adapter 層を導入（IInvoicePdfBuilder）。当面は TokenPdfBuilder（依存ゼロ）でトークン埋込を返却。将来 pdf-lib に差し替え可能
- Admin/Mypage 資産API 追加（画像MIME/サイズ検証、Storage保存、DB記録）
- SSR で `FORCE_PHOENIX_*` を取得し UI に反映
- `data-testid` を導入し E2E/契約で一貫検証
- プレビューAPI（最小）で安定応答 `{ url: '/static/preview.png' }`

### テスト観点
- 契約テスト
  - UI: FORCE ON/OFF で表示/非表示分岐
  - PDF前段: user優先→admin fallback
- E2E（Playwright）
  - FORCE ON: 選択UI非表示、説明/固定表示
  - FORCE OFF: 選択UI表示、トグル可視
  - プレビュー押下で URL 表示

### data-testid リスト
- `invoice-form`, `lh-section`, `lh-explainer`, `sign-section`, `sign-explainer`, `shipper-different-toggle`, `exporter-name`, `preview-button`, `preview-url`, `preview-image`

### E2E 用 Cookie override
- `E2E_FORCE_PHOENIX_LETTERHEAD`, `E2E_FORCE_PHOENIX_SIGNATURE`
- `NODE_ENV !== 'production'` のみ有効

### 実行
```
pnpm -s jest --runInBand
pnpm -s test:e2e -- tests/e2e/stage3.invoice.force-on.spec.ts
pnpm -s test:stage4:contracts
# pdf-lib を導入した環境でのみ
# ENABLE_PDFLIB_TESTS=1 PDF_BUILDER=pdf-lib pnpm -s test:stage4:contracts
```

# PR#1a: RLSポリシー定義（Enableは後段）

目的

- `shipments`, `open_shipments`, `address_book`, `drafts` のRLSポリシーを揃える。
- admin = SELECTのみ、owner = CRUD許可、service_role = FULL。
- `open_shipments` の匿名許可（`user_id IS NULL`）を撤廃。

変更点

- `database/migrations/20251007_rls_*.sql` を追加し、各テーブルのポリシーを定義。
- 既存の混在ポリシーは `DROP POLICY IF EXISTS` で整理。
- すべてのSQLにロールバック手順コメントを併記。

注意

- RLSの有効化（ENABLE）は本PRでは実施しない（PR#1bで切替）。
- APIの実装変更や取消RPC化は後続PRで対応。

ロールバック

- 各SQL末尾の `-- ROLLBACK:` 手順に従い、新ポリシーDROP→旧ポリシー再作成で復旧可能。

後続PR

- PR#1b: RLS Enable、`/api/ship/cancel` のRPC化、実挙動E2E。
- PR#2: RateGuardのENV統一と参照合計実装。
