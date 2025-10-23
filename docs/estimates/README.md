フェーズ型 AI駆動開発テンプレート（FQL標準）
🎯 目的

段階的な仕様削除・新規Step追加・FeatureFlag導入を、
Cursor / ChatGPT / Supabase / Vercel 環境で安全に高速実装するための社内標準テンプレート。

🧩 基本原則
フェーズ	概要	成果物
① 情報収集（InfoScan）	現行構造・参照関係・依存を特定	docs/...-plan.md
② 検証/非表示（Flag化）	該当機能の停止またはUI非表示	実装＋tests/e2e/..._hide.spec.ts
③ 安全削除（PhaseA/B/C）	死コード除去・型保証	docs/...-deletion-plan.md
④ 新ステップ設計	新機能挿入・画面配線定義	docs/...-step-plan.md
⑤ 実装指示生成	Cursor向け JSONプロンプト	{ files, diffs, tests, manualQA }
⑥ QA/確認	manualQA 実行＋E2E確認	tests/e2e/... 更新
⑦ ドキュメント更新	.md への実施結果追記	進捗トレーサブル
⚙️ 構成ガイドライン
📁 ディレクトリ構造
docs/
 ├─ estimates/
 │   ├─ review-rate-deletion-plan.md
 │   ├─ service-step-plan.md
 │   └─ README.md ← このテンプレ
 └─ features/
     └─ feature-flags.md
src/
 ├─ app/shipping/new/
 │   ├─ contents/page.tsx
 │   ├─ service/page.tsx (新Step)
 │   ├─ review/page.tsx
 │   └─ layout.tsx
 └─ lib/config/featureFlags.ts
tests/
 ├─ e2e/
 │   ├─ review_hide_rate_ui.spec.ts
 │   ├─ service_step_flow.spec.ts
 │   └─ issue_block_on_unselected.spec.ts
 └─ contracts/
     └─ build.no-dead-imports.contract.test.ts

🧠 フラグ設計規約
フラグ名	目的	既定値	使用場所
NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES	Reviewページの見積取得停止	true	review/page.tsx
NEXT_PUBLIC_HIDE_REVIEW_RATE_UI	Review見積UI非表示	true	review/page.tsx
NEXT_PUBLIC_ENABLE_SERVICE_STEP	新ステップ有効化	true	contents/page.tsx / review/page.tsx

各フラグは isXxxEnabled() / isXxxHidden() として featureFlags.ts に統一的に定義する。
Boolean変換は "1"|"true"|"on"|"yes" をtrue扱い。

🔄 手順テンプレート（ChatGPT → Cursor）
① 情報収集プロンプト
docs/estimates/[feature]-plan.md を作成し、
対象機能（例: fetchActualRates, QuotePickerShared）に関する
- 呼び出し関係
- 依存ファイル
- UI利用箇所
- 削除フェーズ（A/B/C）
を包括的に調査・整理する。

② 実装プロンプト生成
docs/estimates/[feature]-plan.md の内容に従い、
PhaseA（停止/非表示）または新Step追加を行うCursor用プロンプトを生成せよ。
出力は { "files": [], "diffs": [], "tests": [], "manualQA": [] }。

③ 手動QA

.env.local に該当FlagをONで確認

NetworkでAPI発火有無を検証

data-test セレクタ基準でDOM確認

/shipping/new/... ページ遷移が設計通りであること

pnpm -s tsc --noEmit が成功すること

📘 推奨テスト命名
種別	命名例	目的
E2E	review_hide_rate_ui.spec.ts	非表示・ガード挙動
E2E	service_step_flow.spec.ts	新ステップの遷移確認
Contract	build.no-dead-imports.contract.test.ts	型/ビルド健全性検査
Regression	issue_block_on_unselected.spec.ts	回帰検出・skip保持
✅ 成功条件（品質ゲート）

既存テストが全緑（skip除外）

FeatureFlag切替で2パス両対応

Network/API呼び出しが想定内

型チェック通過

実施ログ（.md）が追記済

🧾 実例リンク

docs/estimates/review-rate-deletion-plan.md … 段階削除（PhaseA〜C）

docs/estimates/service-step-plan.md … 新ステップ挿入（Step5）

tests/e2e/service_step_flow.spec.ts … 新ステップE2E

src/lib/config/featureFlags.ts … Flag定義統一