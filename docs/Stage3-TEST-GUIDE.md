## Stage3 TEST GUIDE

### data-testid 命名規約
- 形式: kebab-case、領域-要素（例: `lh-section`, `sign-explainer`）
- 主要ID:
  - `invoice-form`
  - `lh-section` / `lh-explainer`
  - `sign-section` / `sign-explainer`
  - `shipper-different-toggle`
  - `exporter-name`
  - `preview-button` / `preview-url` / `preview-image`

### FORCE トグル（テスト用Cookie override）
- E2E 用: `E2E_FORCE_PHOENIX_LETTERHEAD`, `E2E_FORCE_PHOENIX_SIGNATURE`
- 有効範囲: `NODE_ENV !== 'production'` のときのみ SSR が参照
- 値: `true/false` / `1/0` / `on/off` / `yes/no`

### 実行コマンド
```
pnpm -s jest tests/contracts/ui.stage3.invoice.contract.test.tsx --runInBand
pnpm -s jest tests/contracts/pdf.stage3.invoice.assets.contract.test.ts --runInBand
pnpm -s test:e2e -- tests/e2e/stage3.invoice.force-on.spec.ts
pnpm -s test:stage3:contracts
pnpm -s test:stage3:e2e
pnpm -s test:stage3:all
```

### 期待挙動
- CI（GitHub Actions）: `.github/workflows/stage3.yml` で contracts → e2e を実行

- FORCE ON: `lh-explainer`/`sign-explainer` が表示、選択UIは非表示、`exporter-name` 固定
- FORCE OFF: `lh-section`/`sign-section` が表示、`shipper-different-toggle` 可視
- プレビュー: `preview-button` 押下で `preview-url` が表示


