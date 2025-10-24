fql_invoice_overhaul
Role

FQLの実装ディレクター。以下の差分を安全に段階実装し、既存挙動を壊さずにE2Eまで緑にする。
以降の応答は常に次のJSONのみ（余計な文章禁止）：{ "files": [], "diffs": [], "tests": [], "manualQA": [] }

Fixed Principles

既存デザイン踏襲／命名・型・フォルダ構成は現行と整合

データ破壊禁止・移行は非破壊Migrationで併存→後日クリーンアップ

UI/帳票は標準DTOだけを見る（ラベルは共通辞書）

data-test 選択子優先（文言に依存しないE2E）

Variables
DOCS_GLOB="docs/fedex_api/**/*.md"
EXTRACTED_JSON="docs/fedex_api/_extracted.json"

MONEY_PATH="src/types/money.ts"
RATE_PATH="src/types/rate.ts"
INV_PATH="src/types/invoice.ts"
TAX_CFG_PATH="src/config/tax.ts"

RATE_ADAPTER_PATH="src/lib/rates/normalizeFedExRate.ts"
BREAKDOWN_UTIL_PATH="src/lib/rates/calcBreakdown.ts"
ADDR_RULES_PATH="src/lib/address/formatRules.ts"
ADDR_FN_PATH="src/lib/address/formatAddress.ts"

UI_INV_OPTS="src/app/shipping/new/review/InvoiceOptions.tsx"
UI_BREAKDOWN="src/app/shipping/new/review/BreakdownTable.tsx"

MIGRATION_NAME="20251024_invoice_options.sql"
USD_FALLBACK="JPY"

Locked Requirements（今回の確定仕様）

通貨：ISO-4217フル対応。UI/サーバ/帳票は通貨コード基準で処理・保存・表示

手数料：第三者請求手数料/サービス料/決済手数料はシステム利用料(18%) に集約

課税：国際送料は非課税、システム利用料にのみ消費税（既定10%・設定化）

18%の基準：割引後送料（＝基本料金−割引。各種割増は除外）

インボイス・オプション（チェックボックス）

商業インボイス生成（テンプレ適用）

既存インボイスPDF添付（ファイル選択）

レターヘッド適用／署名適用（既存アップロード資産から選択）

申告通貨（ISO-4217セレクト）

Incoterms（DAP/DDP/EXW等）

Duties/Taxesの請求先（Shipper/Recipient/Third-Party）

HS/HTSコード・原産国を明細印字

住所：国別フォーマットで整形（addressFormatRules層を実装）

内訳整合：FedEx Rate→標準DTOに正規化し、見積/決済/帳票を同一マッピングで表示

baseCharge→基本料金、discounts→割引、surcharges.FUEL→燃料割増、surcharges.PEAK/DEMAND→混雑時割増、その他はその他割増。0円も明示

PDF統一：金額セクションを
[基本料金/割引/燃料割増/混雑時割増/システム利用料/消費税/合計] で統一し通貨コード表記・非課税注記を併記

Files to Create（最低限）
src/types/money.ts
src/types/rate.ts
src/types/invoice.ts
src/config/tax.ts
src/lib/rates/normalizeFedExRate.ts
src/lib/rates/calcBreakdown.ts
src/lib/address/formatRules.ts
src/lib/address/formatAddress.ts
src/app/shipping/new/review/InvoiceOptions.tsx
src/app/shipping/new/review/BreakdownTable.tsx
database/migrations/20251024_invoice_options.sql

FedEx API Extraction（自動）

DOCS_GLOB を走査し、以下を抽出→ EXTRACTED_JSON へ保存：

Rate主要キー：baseCharge,discounts,surcharges（FUEL,PEAK/DEMAND,REMOTE,OTHER 等）, totalNetCharge, currency

Customs/Declared：declaredValue,currencyCode の必須性

Invoice要件：HTS/原産国/Incoterms/Taxes Bill-to/署名/レターヘッド/既存PDF添付

Address推奨整形（GB/US/JPなど）

Sandbox制約（itemized欠落時の例）

既存調査結果（touchPoints/conflicts/specSignals/fileMap/metrics）を照合し、優先度の高い衝突を最小差分で修正するPlanに反映

Implementation Plan（段階実装）
0) 既存調査の取り込み

src/lib/charges/core.ts, src/lib/services/dataRetrievalService.ts, src/lib/quote/*, src/app/api/{quote,ship}/**, src/lib/fedex/**, src/lib/utils/receiptTemplate.ts を読み込み、「唯一の真実」をcharges-coreに集約する方針で差分案を生成

src/lib/validators/shared.ts の currencyCodeSchema を ISO-4217フル対応へ拡張（外部リスト or 定数生成）

1) 型/設定

types/money.ts：export type Money = { amount: number; currency: string }

types/rate.ts：export type RateBreakdown = { baseCharge: Money; discounts: Money; surcharges: { fuel?: Money; peak?: Money; other?: Money; }; totalNetCharge: Money }

types/invoice.ts：export type InvoiceOptions = { generateCommercialInvoice: boolean; attachExistingInvoicePdf?: string; letterheadId?: string; signatureId?: string; declareCurrency: string; incoterms?: string; dutiesPayer?: 'Shipper'|'Recipient'|'Third-Party'; printHSHTS: boolean; printOriginCountry: boolean }

config/tax.ts：

export const VAT_RATE = 0.10;
export const SYSTEM_FEE_RATE = 0.18;
export const SYSTEM_FEE_BASE = 'netFreight'; // base - discount

2) DB Migration（非破壊）

invoice_options JSONB 追加（出荷単位）

金額列を通貨込み新列 *_money JSONB で併存（旧数値列は温存）

書込トリガ/ビューで旧列↔新列の一方向同期を暫定実装（読み取りは新列優先）

3) Rate正規化アダプタ

normalizeFedExRate.ts：FedExレスポンス→ RateBreakdown

FUEL→surcharges.fuel、PEAK/DEMAND→surcharges.peak、上記以外はotherへ集約

itemized欠落時も other としてフェイルセーフ

通貨コードはレスポンス優先・未検出時は見積の選択通貨→さらに USD_FALLBACK

4) 計算ユーティリティ

calcBreakdown.ts：入力=RateBreakdown + 設定 + 通貨

netFreight = base - discount（割増除外）

systemFee = netFreight * SYSTEM_FEE_RATE

vatOnSystemFee = systemFee * VAT_RATE

非課税：base/discount/fuel/peak/other

grandTotal = netFreight + fuel + peak + other + systemFee + vatOnSystemFee（Moneyで返却）

5) 通関・為替の統一

src/app/api/ship/route.ts, src/lib/fedex/open-ship.ts, src/app/api/quote/process/[jobId]/route.ts, src/lib/fedex/auth.ts の申告通貨/換算を一本化

固定0.0067を撤去し、ExchangeRateService 経由の換算へ移行

通関通貨はUSD基準（既存仕様とFedEx要件を踏襲）だが、入力は任意通貨→換算

6) ラベル辞書の統一

src/lib/charges/core.ts と src/lib/utils/receiptTemplate.ts／UIのラベルを共通辞書へ

表示順は [基本料金, 割引, 燃料割増, 混雑時割増, システム利用料, 消費税, 合計] に固定

0円も行表示（今回の確定仕様）

7) 住所フォーマット層

formatRules.ts：国コード→配列テンプレ（例）

GB: [name, company, line1, line2?, city, county?, postal, "UNITED KINGDOM (GB)"]

JP: [name, company, postal, state, city, line1, line2?, "JAPAN (JP)"]

formatAddress.ts：formatAddress(address, countryCode): string[]（UI/PDF兼用）

8) UI組込み

見積画面：InvoiceOptions.tsx（チェック群＋ファイル選択＋ISO-4217セレクト検索）／BreakdownTable.tsx（標準DTO表示・0円明示）

決済/確認画面：見積と完全同一レイアウト・同値（差分禁止）

既存ページへ最小侵襲でインポート・レンダリング差分

9) PDF統一

共通パーシャル（金額セクション／レターヘッド／署名）を追加し、見積/請求/商業インボイスの3テンプレへインクルード

ヘッダ：通貨コード

フッタ注記：

「国際輸送費は消費税の課税対象外です」

「消費税はシステム利用料にのみ課税」

10) テスト生成

単体

tests/unit/calcBreakdown.spec.ts：

送料1万円/割引1千円/燃料0/混雑0 → systemFee=9,000×0.18=1,620、VAT=162、合計=10,782（厳密一致）

tests/unit/formatAddress.spec.ts：JP/GBの順序・国名大文字表記スナップショット

契約/モック

tests/contracts/normalizeFedExRate.contract.test.ts：Fuel/Peak/Otherの有無でDTOが正規化される

E2E（Playwright）

tests/e2e/invoice_options_flow.spec.ts：チェックON/OFFでPDFの差分スナップショット

tests/e2e/currency_select_and_breakdown.spec.ts：通貨切替・内訳一致・0円行の明示表示

既存のラベル依存E2Eは data-test 選択子へ置換

11) 緑化パイプ & 最小修正

typecheck → build → test:unit → test:contracts → test:e2e を順実行し、落ちた箇所のみ最小差分で再試行

Acceptance (自動Assert + 手動QA)

見積/決済/帳票の内訳ラベル・並び・金額が完全一致

国際送料は非課税、システム利用料にのみ消費税

システム利用料 = 割引後送料 × 18%

申告通貨はPDF/画面ともコードで表示（例: GBP）

住所は国別テンプレで整形され、PDFも同一出力

すべてのテスト（単体/契約/E2E）が緑

