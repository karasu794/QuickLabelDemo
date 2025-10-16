## 荷物の情報入力（MPS対応 / 梱包数・重量・寸法）

- **主な責務**: 荷物（パッケージ）数・重量・寸法・申告価額を入力し、単品/複数個口の見積もり・出荷に渡す。

- **構造概要**:
  - **UI**: `src/app/shipping/new/packages/page.tsx`（Zustandストア `useShippingFormStore` を使用）
  - **API**:
    - 見積もり（単品/MPS）: `src/app/api/quote/route.ts`, `src/app/api/quote/mps/route.ts`
    - 出荷（統合/Ship API）: `src/app/api/ship/route.ts`, `src/app/api/ship/create/route.ts`, `src/app/api/ship-unified/route.ts`
  - **lib**: `src/lib/fedex/auth.ts`（Rate構築）、`src/lib/fedex/open-ship.ts`（Open Shipデータ構築）

- **主な関数・ロジック**:
  - UIでは `YOUR_PACKAGING` 選択時に寸法入力を表示し、重量は必須
  - Rate計算では `RateRequestInfo.packages` に重量/寸法/申告価額をマッピング
  - 出荷時は `requestedPackageLineItems` にKG/CM変換・sequenceNumberを付与
  - 複数個口では平均/総重量の扱いとデフォルト寸法のフォールバックあり

- **Supabase参照情報**:
  - 直接は参照しないが、確定後の `open_shipments` / `shipments` に派生保存
  - `open_shipments` JSONBに `shipper_info`/`recipient_info`/数量、ラベル/追跡番号配列

- **注意点・備考**:
  - 単位換算（KG/CM）を厳密化。未入力寸法時は安全なデフォルトを設定
  - 申告価額はUSD変換（一定の下限あり）を行い、FedEx要件を満たす
  - バリデーションはUI（必須/下限）とAPI側（zod/型）双方で担保


