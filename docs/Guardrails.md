# Guardrails — 再発防止ルール集（短句）

> 形式: [Rule] / Rationale / Detector / Scope
> Detector: Static(静的解析) | Ask(実装前Q&A) | Test(最小契約テスト)

## Auth / Context / Middleware
- [Rule] route.ts で直 `supabase.from` 禁止
  - Rationale: RLS/認可の抜け道
  - Detector: Static(High), Test(API)
  - Scope: 全API
- [Rule] repo 関数は `(ctx, ...)` を第一引数
  - Rationale: org/user 混同防止
  - Detector: Static(High), Ask
  - Scope: repos/**

## DB / RLS / TX
- [Rule] 外部APIは TX外（例外時は理由を明記）
  - Rationale: ロック長期化・整合性崩壊
  - Detector: Static(High), Ask
- [Rule] 送り状作成は冪等化（order_id + advisory lock）
  - Rationale: 重複発行防止
  - Detector: Test(repo/API), Ask

## API Contract
- [Rule] Zod入出力を先頭で宣言（変更時はDiff提示）
  - Rationale: 破壊変更の可視化
  - Detector: Ask, Static(Med), Test(API)

## Feature Flags
- [Rule] Release/Experiment は Cleanup 期限必須
  - Rationale: 放置負債の回避
  - Detector: CI, Ask
- [Rule] Ops Flag は常設可（Runbookに記載）
  - Detector: Review

## UI / UX（抜粋）
- [Rule] モバイルはカード化優先（横スクロール許容は例外）
  - Detector: Review

## Secrets / Platform
- [Rule] Supabase Service Role Key をクライアントで使用禁止
  - Detector: Static(High), Review

> 追加: 3行フォーマットで短く増やす。古い/重複は週次レポートで整理。
