# Guardrails（非機能ルール集・SpecWriter版）

本書は `docs/Guardrails.md` の一次情報を、SpecWriter 用に短句・決定形式で再編したものです。High は即ブロック、Medium は要確認、Low は推奨。推測は行いません。

## High（必ずブロック）

- サーバの Supabase 生成は `@/lib/supabase/server` のラッパ限定。直 import/直接生成禁止。
- API `route.ts` からの直 `.from()` 呼び出し禁止（リポジトリ/ユーティリティ経由）。
- repo 関数は ctx を第一引数に取る（例外なし）。
- orgId/userId はサーバ起点。フォーム/URL入力を信頼しない。
- トランザクション内で外部API禁止（FedEx など）。
- 公開APIの戻り値は Zod 契約と一致必須。
- Service Role Key をクライアントに露出しない。
- PDF 生成で外部フォント未設定を禁止（Noto Sans JP）。
- `/api/ship/create` は `order_id + advisory lock` で冪等性必須。

## Medium（要確認）

- Vercel 環境変数は dev/prod を分離。
- PDF タイムアウト/メモリの対策（ページ分割/遅延）。
- Feature Flags（Release/Experiment）は Cleanup 期限必須。
- Google Maps Autocomplete 初期化の `useCallback` 化。
- Supabase 認証メール日本語テンプレ維持/重複メールのUI検知。
- モバイルはカード化優先、横スクロールは最終手段。
- Idle Timeout: 管理15分/決済5分（例外はPR合意）。

## Low（推奨）

- UI エラーはトースト＋ロールバック。全リロードは避ける。
- Persistent Login: 管理者は一時ログイン推奨。

## 実装・観測への反映

- 静的検査前処理: `scripts/preflight.mjs`、`scripts/check-docs-updated.js`。
- SLI/SLO: `docs/SLO-SLI.md`。主要APIで success_rate, p95 を持つ。
- 監視ログ: `src/lib/observability/logger.ts`、`/api/ship/create` が段階ログを出力。

---

### Sources

- `docs/Guardrails.md`
- `docs/SLO-SLI.md`
- `src/app/api/ship/create/route.ts`
- `src/lib/observability/logger.ts`

Last-Verified: 2025-10-20
