# FQL SpecWriter (Cursor) — 使用ガイド

本書は Assistant「FQL SpecWriter (Cursor)」の使い方を統一します。モデル出力は JSON（Structured Outputs）準拠。生成された `files/diffs/tests/manualQA` は本リポジトリに直接適用可能です。

## モデル/出力フォーマット

- 返却は常に JSON オブジェクト（`docs/gpts/specwriter.md` のスキーマに準拠）
- バリデーション: `scripts/validate-gpt-json.ts` で Zod チェック

## ツール/前提

- 入力一次情報: 本ディレクトリのナレッジ（architecture-overview, feature-flags, rls-policies, guardrails など）
- 参照ファイル: `src/**`, `database/**`, `supabase/**`, `docs/**`

## 投げるべきプロンプト例

- 「/api/ship/create の RateGuard を段階適用。許容差分を既定値→ENV化し、契約テストとE2Eを更新」
- 「RLSを admin=SELECT only, owner=CRUD, service_role=FULL に統一し、明示的にENABLEするPRを作成」

## 段階出力テンプレ

1) PREP: 目的/影響/互換性/ENV/実装方針（最小差分）
2) APPLY: 変更ファイルごとの編集内容（小さな差分）
3) TEST: 契約/E2E/ユニット、手動QA、ロールバック
4) RISK/NEXT: 残課題/将来改善

## 既知の落とし穴

- `data-testid` ではなく `data-test` を使用。
- RLS有効/無効のSQLが混在。運用方針に合わせて有効化/無効化を切り替えるPRを分離。
- Service Role Key はサーバ専用。クライアントへ露出しない。

---

### Sources

- `docs/gpts/specwriter.md`
- `docs/assistants/specwriter/*`
- `scripts/validate-gpt-json.ts`

Last-Verified: 2025-10-20
