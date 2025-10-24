# Charges Spec — QuickLabel 現行実装サマリ

最終更新: 2025-10-24

本ドキュメントは、本リポジトリ内で確認できる「charges（料金内訳相当）」の構造、ラベル順序、合計計算ルールを整理したものです。

> 注意: 指定の `/packages/charges-core` は本リポジトリ内に存在しません（2025-10-24 時点）。そのため、ここでは現行の実装（領収書生成・料金計算・PDFテンプレート）を対象にサマリします。

---

## 1. 対象範囲（実装所在）
- 計算・内訳（charges相当）
  - `src/lib/services/dataRetrievalService.ts` — `calculateTotals`, `getFeeRates` ほか
  - `src/types/receipt.ts` — `ReceiptTotals` と `FeeBreakdown`
- 項目（PDF表示）
  - `src/lib/utils/receiptTemplate.ts` — HTMLテンプレート生成（Puppeteer/PDF用）
  - `src/components/ReceiptTemplateNew.tsx` および `src/components/ReceiptTemplate.tsx` — Reactテンプレート（同様の並び）
- 付随ユーティリティ
  - `src/lib/quote/breakdown.ts` — FedEx Rate 応答からの Residential サーチャージ抽出（現時点で計算連携なし）

---

## 2. データモデル（charges相当）
- 領収書トータル: `ReceiptTotals`
  - `subtotal: number` — 税抜小計（現行実装では下記のサービス手数料・決済手数料を含む）
  - `tax: number` — 税額
  - `total: number` — 合計金額（小計+税）
  - `fees: FeeBreakdown`
    - `serviceFee: number` — サービス手数料（第三者請求など）
    - `processingFee: number` — 決済手数料
    - `exchangeRate?: number` — 参考用の為替レート
    - `phoenixException?: boolean` — Phoenix 判定フラグ

- 項目（PDF行）
  - 実装では `charges[]` の明示的配列はなく、PDFテンプレート内の固定行ラベルと `totals/fees` の値で表示。

---

## 3. 合計計算ルール（現行実装）
計算は `src/lib/services/dataRetrievalService.ts` の `calculateTotals` に実装。

- 料率の取得
  - `app_settings` から `service_fee_percentage`, `processing_fee_percentage`, `tax_rate`, `exchange_rate` を取得。
  - 取得失敗時のデフォルト: `serviceRate=5%`, `processingRate=3%`, `taxRate=10%`, `exchangeRate=150`。

- Phoenix 取引判定
  - `shipper_country === 'JP'` で true。
  - もしくは JSONB `shipper.country|countryCode === 'JP'` で true。

- 計算式（変数名は実装準拠）
```ts
const totalAmount = shipment.total_amount || 0
const subtotalBeforeTax = totalAmount / (1 + taxRate)

let serviceFee = Math.floor(subtotalBeforeTax * serviceRate)
let processingFee = Math.floor(subtotalBeforeTax * processingRate)

// Phoenix 取引時の減額
if (isPhoenix) {
  serviceFee = Math.floor(serviceFee * 0.8)   // 20% 減額
  processingFee = Math.floor(processingFee * 0.7) // 30% 減額
}

const subtotal = subtotalBeforeTax + serviceFee + processingFee
const tax = Math.floor(subtotal * taxRate)
const total = Math.floor(subtotal) + tax
```

- 重要な性質
  - `subtotal` は「税抜小計」だが、サービス手数料と決済手数料を内包する実装になっている。
  - 税額は上記 `subtotal` に税率を掛けて算出（＝手数料部分も課税対象になっている）。

---

## 4. PDFテンプレートでのラベル・表示順序
両テンプレート（`src/lib/utils/receiptTemplate.ts` と `src/components/ReceiptTemplateNew.tsx`）で、明細行は同じ順序とラベルで描画されます。

- 明細行（固定ラベルと値の対応）
  1. `国際送料（消費税適応外）` — 金額: `Math.round(totals.subtotal)`
  2. `第三者請求利用料（2.5%）` — 金額: `Math.round(totals.fees.serviceFee || 0)`
  3. `特別割引アカウント使用料` — 金額: `0`
  4. `決済システム手数料（4%）` — 金額: `Math.round(totals.fees.processingFee || 0)`

- サマリ（小計/税/合計）
  - 小計: `Math.round(totals.subtotal + serviceFee + processingFee)` として表示
  - 税: `Math.round(totals.tax)`（ラベルは「(2+3+4) ×10%」と表記）
  - 合計: `totals.total`

- 実装上の矛盾点（要確認）
  - 行1の金額に `totals.subtotal`（手数料込み）を使用し、行2・4で手数料を再掲しているため、
    表示上「(1)がすでに手数料を含むのに(2)(4)も加算」＝二重計上に見える。
  - 税ラベルは「(2+3+4) ×10%」だが、実装上は `subtotal` 全体に課税（＝行1相当部分にも課税）。
  - これらは表示ロジックと計算ロジックの整合性課題として認識が必要。

---

## 5. 付随ユーティリティ（Residential サーチャージ抽出）
- `src/lib/quote/breakdown.ts`
  - FedEx Rate API 応答から、`surchargeType|type|name|description|category` に `residential` を含む要素の `amount` を合算。
  - 返り値は `number | undefined`（0 なら `undefined`）。
  - 現時点では領収書計算や表示と連動していないため、将来的に charges 統合が必要。

---

## 6. 既知の計画値との乖離（参考: WAVE1 PLAN）
`.cursor/commands/wave1_charges_api.md` の計画では、以下が想定されています：
- 第三者請求: 2.5%
- 決済手数料（Square）: 3.25%
- 税対象: (2+3+4) のみ、(1) は非課税
- `charges-core` にロジックを集約

現行実装との差分:
- 料率デフォルトが `service=5%`, `processing=3%`。
- 税計算が「`subtotal`（手数料込み）」に対して実施。
- 表示文言は 2.5% / 4% を示すが、実際の料率は設定値依存（初期値は 5%/3%）。
- `charges-core` は本リポジトリに存在しない。

---

## 7. まとめ（現行仕様の要点）
- 計算源は `dataRetrievalService.calculateTotals`。
- `subtotal` は「配送税抜（推定）+ 手数料（2種）」の合算。
- 税は `subtotal` に課税（＝手数料も課税）。
- PDF は固定4行のラベル順（1: 国際送料, 2: 第三者請求, 3: 特別割引アカウント, 4: 決済手数料）で表示。
- 表示と計算の整合性に課題（行1金額・小計・課税範囲の不一致）。

---

## 8. 補足（今後の整合化の指針・非機能）
- 計算: 行1=配送税抜（`subtotalBeforeTax`）、行2=第三者請求、行3=割引/0、行4=決済手数料 とし、税は (2+3+4) のみ課税に揃える。
- 料率: 設定値 or フラグで WAVE1 仕様（2.5%/3.25%）へ切替可能に。
- charges 配列の統一: （将来的に）`charges-core` へ内訳・計算・描画順のソースオブトゥルースを集約。
