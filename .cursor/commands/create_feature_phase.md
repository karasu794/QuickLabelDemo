# /create_feature_phase

## Purpose
"フェーズ型 AI駆動開発" を素早く回すための **標準コマンド**。  
指定の *feature* に対して、**情報収集 → 実装計画 → 実装 → テスト → 手動QA** を、Cursorが最小ラウンドで実行できるようガイドします。  
**必ず** 出力は `{ "files": [], "diffs": [], "tests": [], "manualQA": [] }` の JSON オブジェクトのみ。

---

## Usage
/create_feature_phase feature="<短い英名>" mode="<info|impl>" phase="<A|B|C|step|flag>" scope="<frontend|api|both>" notes="<任意の補足>"

markdown
コードをコピーする

### Examples
- 情報収集（削除計画を作る）
/create_feature_phase feature="review-rate" mode="info" phase="A" scope="frontend"

diff
コードをコピーする
- 実装（Step5 追加など）
/create_feature_phase feature="service-step" mode="impl" phase="step" scope="frontend"

diff
コードをコピーする
- 実装（Feature Flag導入）
/create_feature_phase feature="review-rate" mode="impl" phase="flag" scope="frontend"

markdown
コードをコピーする

---

## Parameters
- `feature` (required): 対象機能の識別子（例: `review-rate`, `service-step`）
- `mode` (required):  
- `info`: 情報収集・計画作成（.mdに出力）  
- `impl`: 実装（差分とテストを生成）
- `phase` (required):  
- `flag` … 停止/非表示のためのフラグ導入  
- `A` … 画面ローカルの死枝削除（安全）  
- `B` … 共有コンポーネントのレビュー専用分岐除去 or deprecated化  
- `C` … API/Utilの物理削除（最終段）  
- `step` … 新ステップの追加（ルーティング/ガード）
- `scope` (required): `frontend` | `api` | `both`
- `notes` (optional): 特記事項（ルール変更など）

---

## Output contract
- **必須**: 出力は JSON **のみ**（Markdown禁止）
- 形式:
```json
{
  "files": ["<新規作成ファイルのパス>"],
  "diffs": ["```<startLine>:<endLine>:<path>\n<unified diff> \n```"],
  "tests": ["- 説明…", "- 追加/変更テスト…"],
  "manualQA": ["- 手動チェック1", "- 手動チェック2"]
}
diffs は 複数可。各diffはフェンス内に path を明示。

Conventions（必ず守る）
Feature Flags は src/lib/config/featureFlags.ts に追加。ブール評価は "1"|"true"|"on"|"yes" をtrue扱い。

例:

ts
コードをコピーする
export function isServiceStepEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_ENABLE_SERVICE_STEP ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}
.env.example にも必ず追記。

常に最小リスク：

先に flag → A → B → C の順。

API物理削除（Phase C）は参照ゼロ確認後のみ。

テスト：

tests/e2e/ に E2E、tests/contracts/ に型/ビルド系。

フラグに依存するE2Eは 条件skip を許容。

例: build.no-dead-imports.contract.test.ts で tsc --noEmit を実行。

手動QA：

Network(不要APIゼロ発火), 画面ガード, data-test, Flag ON/OFF 両動作, ビルド/型OK を必ず列挙。

絶対に壊さない：

impl でも サーバAPIの挙動変更/削除は phase="C" かつ scope に api を含む場合のみ。

共有コンポーネントのAPI破壊的変更は deprecated化 で回避。

Mode: info（情報収集テンプレ）
下記をベースに、docs/estimates/<feature>-plan.md を新規作成し、参照グラフと削除/追加計画をまとめます。

収集項目:

呼び出しマップ（画面 → hooks/services → API）

自動発火トリガ（useEffect 等）

Zustand/Store のキーと setter

テスト影響（E2E/契約）

削除候補（Phase A/B/C）と根拠

ロールバック方針

期待出力:

json
コードをコピーする
{
  "files": ["docs/estimates/<feature>-plan.md"],
  "diffs": [],
  "tests": ["- 影響を受けるテストの一覧（ファイル名）"],
  "manualQA": ["- Network で不要APIが発火しない", "- Flag ON/OFF で動作が切り替わる"]
}
Mode: impl（実装テンプレ）
phase と scope に応じて、以下のいずれかを実施。

phase="flag"
フラグ関数追加（featureFlags.ts）

.env.example 追記

対象ページで 自動発火のゲート 追加

E2Eを flag に応じて skip

例: NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES, NEXT_PUBLIC_HIDE_REVIEW_RATE_UI, NEXT_PUBLIC_ENABLE_SERVICE_STEP

phase="A"（ローカル死枝カット）
対象ページから未参照 state/effect/補助関数を削除

actualShippingRates 等の残存参照を JSX から除去

build.no-dead-imports.contract.test.ts を追加 or 維持

phase="B"（共有分岐の整理）
共有コンポーネントのレビュー専用分岐を削除または @deprecated 明記

共有APIは「最小API（props: rates/isLoading/error/onSelectRate）」に揃える

phase="C"（API/Util削除）
lib/... / app/api/... の参照ゼロを確認後、物理削除

削除前のレポに根拠を追記

phase="step"（新ステップ追加）
ルート追加（例: /shipping/new/service）

既存ステップ配列に挿入（layout.tsx）

遷移先修正（例: contents → service）

review 側で selectedRate 未選択なら service にリダイレクト

E2E追加: service_step_flow.spec.ts

期待出力（共通）:

json
コードをコピーする
{
  "files": ["<新規ファイル>"],
  "diffs": ["```<start>:<end>:<path>\n<diff>\n```"],
  "tests": ["- 追加/変更テストの説明"],
  "manualQA": ["- 具体的な目視チェックリスト"]
}
Snippet Library（頻出追記用）
featureFlags.ts 追加関数
ts
コードをコピーする
export function isFlagOn(envName: string, def = 'true'): boolean {
  const v = (process.env[envName] ?? def).toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}
export function isServiceStepEnabled(): boolean {
  return isFlagOn('NEXT_PUBLIC_ENABLE_SERVICE_STEP', 'true')
}
export function isReviewRatesDisabled(): boolean {
  return isFlagOn('NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES', 'true')
}
export function isReviewRateUiHidden(): boolean {
  return isFlagOn('NEXT_PUBLIC_HIDE_REVIEW_RATE_UI', 'true')
}
build.no-dead-imports 契約テスト
ts
コードをコピーする
// tests/contracts/build.no-dead-imports.contract.test.ts
// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => f(); expect = (v?: any) => ({ toBe: (_: any) => {} }) }
const cp = require('child_process')
test('tsc noEmit passes (no dead imports / unused symbols)', async () => {
  try { cp.execSync('pnpm -s tsc --noEmit', { stdio: 'inherit' }) } catch { throw new Error('TypeScript check failed') }
  expect(true).toBe(true)
})
E2E: 条件skipの雛形
ts
コードをコピーする
const FLAG_ON = (process.env.NEXT_PUBLIC_ENABLE_SERVICE_STEP ?? 'true').toLowerCase() !== 'false'
;(FLAG_ON ? test : test.skip)('Step5 flow ...', async ({ page }) => { /* ... */ })
Safety Rails
API破壊は不可（phase=Cかつscope=apiのときのみ）。

差分は最小化、既存フローのロールバック手段（flag OFF）を必ず維持。

ドキュメント更新: docs/estimates/*.md に必ず「実行結果」を追記する diff を含めること。

Done Definition（自動で self-check）
pnpm -s tsc --noEmit pass

pnpm build pass

Networkタブの観測結果が manualQA に沿う

追加/変更 E2E が緑（flag条件含む）