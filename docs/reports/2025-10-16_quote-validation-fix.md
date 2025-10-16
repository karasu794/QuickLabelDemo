# FQL-QUOTE-VALIDATION: /api/quote のバリデーション寛容化＋確認画面送信の正規化

- 日付: 2025-10-16
- 変更種別: fix + docs + tests

## 目的

見積もり計算が 422 となる不具合（`quoteParams.higherInsurance` 必須化）を解消し、後方互換的に寛容化。

## 変更概要

- サーバ Zod スキーマ（`src/lib/validators/quote.ts`）
  - `higherInsurance: z.boolean().optional().default(false)`
  - 数値項目を `z.coerce.number().nonnegative()` で強制変換
  - `originSelected/destinationSelected/isResidential` を `.optional().default(false)`
- /api/quote 補完ロジック（`src/app/api/quote/route.ts`）
  - `anyDeclared = packages.some(p => declaredValue>0)`
  - `effective.higherInsurance = (incoming ?? false) || anyDeclared`
  - `higherInsurance && totalDeclared<=0` の場合、WARNして `false` に矯正
  - Zod 422 時に `parsed.error.flatten()` を `console.warn` で出力
- 確認画面送信（`src/app/shipping/new/review/page.tsx`）
  - `higherInsurance` を常に含める（UI未指定時は `packages.some(declaredValue>0)`）
  - 数値を `Number(...)` で明示変換

## 影響範囲

- `/api/quote` リクエストの入力揺れ（数値/欠落）に強くなり、`higherInsurance` 欠落でも 422 にならない。
- 既存クライアントで保険未チェックかつ `declaredValue>0` の場合も自動ON。

## 受け入れ条件（結果）

- ケース1: higherInsurance 不送信 + declaredValue=0 → 成功（保険無し扱い）
- ケース2: higherInsurance 不送信 + declaredValue>0 → サーバで自動ON、成功
- ケース3: higherInsurance=true + declaredValue=0 → WARN出力し false に矯正、成功

## テスト

- Contract: `tests/contracts/api.quote.contract.test.ts`
  - 欠落 + declaredValue>0 で 200
  - true + totalDeclared=0 で 200 かつ WARN 部分一致
- E2E: `tests/e2e/quote_flow.spec.ts`
  - 未チェックでも declaredValue>0 でレート表示

## 回帰観点

- 数値 coercion の副作用（0/空文字/未定義）
- `isResidential` のデフォルト false 化による配送先種別
- バックグラウンド処理への `quoteParams` 受け渡し（補完後値が渡ること）

## 既知の課題

- 将来ポリシーにより `higherInsurance && totalDeclared=0` の扱い変更の可能性
- `MPS` エンドポイント側は今回対象外（必要に応じて追従）

## ログ仕様

- WARN: `higherInsurance=true but declaredValue=0: coerced to false`
- Zod: `Zod validation error: <flatten JSON>`

## 推奨アクション（次回）

- `/api/quote/mps` にも同等の数値 coercion / 補完の導入
- UI ガイダンス: 申告価額と追加保険の関係をツールチップで明確化
