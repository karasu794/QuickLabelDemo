# QuickLabel - Supabase Type Generation

## Supabase 型生成（ローカル）

1. `.env.local` に `SUPABASE_PROJECT_REF` を設定してください。
2. 次でDBスキーマから型を生成して `src/types/supabase.ts` を更新します。

```bash
npm run typegen
```

※ 環境変数のexportは不要です。スクリプトが `.env.local` を自動読込します。

## CIの型ドリフト検出

GitHub Actions ジョブ「Supabase Typegen Drift Check」が、リモートのスキーマから生成した `src/types/supabase.gen.ts` と既存の `src/types/supabase.ts` を比較し、差分があれば失敗します。

ドリフトを解消するには、ローカルで `npm run typegen` を実行し、差分をコミットしてください。

---

## 本番出荷（単品ラベル）用の安全フラグ（server-only）

`.env`（サーバ専用）に以下を追加します。フロントへ公開しないでください。

```
SHIP_API_WRITE_ENABLED=false
REQUIRE_RATE_MATCH=false
RATE_MATCH_YEN_TOLERANCE=300
RATE_MATCH_PERCENT_TOLERANCE=2
```

- `SHIP_API_WRITE_ENABLED=false`: 誤配備防止の物理ラッチ。true の時のみ FedEx へ書き込みます。
- `REQUIRE_RATE_MATCH=true`: Rate→Ship の金額乖離チェックを有効化。許容値は `RATE_MATCH_*` で調整。

## 出荷API（単品）
- `POST /api/ship/create`
  - 前段ガード: 認証必須、CSRF(Origin/Referer)チェック、`SHIP_API_WRITE_ENABLED` が false なら 503。
  - 冪等性: `order_id` ユニーク + 既存返却。最終ロックにアドバイザリーロックを使用。
  - 乖離チェック: `REQUIRE_RATE_MATCH` が true のとき有効化（参照値が無い場合はWARNでスキップ）。
  - 成功時: ラベルPDFを Vercel Blob に保存し、`{ trackingNumber, labelUrl }` を返却。

旧フロー（複数個口/Open Ship）は引き続き存在しますが、本番の単品発行は `/api/ship/create` を推奨します。

---

## CORE_MODE（体験重視の最小ダウングレード）

- 目的: 誤発行なしで「見積り → 擬似発行」フローを評価するモード
- 有効化: `.env` に `CORE_MODE=true` を設定（既定は false）
- 挙動:
  - 未ログインでも `/api/quote` が 200 を返し、`{ success: true, jobId: "core-..." }` を返却（DB書き込みなし、Service Role未使用）
  - `/api/ship/create` は POST メソッドのみを `ensurePost` で検査（Origin/Referer は未検査）
  - レート制限はノップ（常時PASS）。`SHIP_API_WRITE_ENABLED=false` を尊重し書き込みは実行されない
  - ヘッダーの管理ナビは非表示（URL直打ちは従来どおり保護）
- 禁止事項:
  - RLS/DBポリシーの変更、Service Role の新規導線追加、課金/書き込みの解放
- ロールバック:
  - `.env` の `CORE_MODE=false` に戻すだけで現行挙動に復帰

---

## middleware撤去とAPI最小責務 / ログ方針

- 本プロジェクトは `src/middleware.ts` を撤去済みです（MW-REMOVED）。
- 認証/CORS/CSRF/レート制限/管理ガードのグローバル前処理は行いません。
- 代わりに、API単位で必要な最小責務のみ実施します。
  - 例: `POST /api/ship/create` は `ensurePost` によりPOST以外を 405 で拒否。
- 既存の仕組みが必要になった場合は、該当API内で最小限の実装を追加してください。
- SR-D: ログは生データを出力（maskPII撤去）。外部送信は行わず、短期ローテーションを推奨します。

## 開発環境とパッケージ管理

- 本リポは pnpm を使用します。Node は engines に記載の範囲に固定してください。
- Corepack を有効化すると、Vercel/CI/ローカルで同一の pnpm バージョンが使われます。

```bash
# 初回のみ（Node 18+）
corepack enable
# 以降は lockfile に基づいてインストール
pnpm install --frozen-lockfile --prefer-offline
```

## Vercel 設定のヒント

- Install Command: `pnpm install --frozen-lockfile --prefer-offline`
- Build Command: `pnpm run vercel-build`
- Ignored Build Step: ドキュメント/画像/テストのみの変更ではビルドをスキップするシェルを登録

```bash
# example
if git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | egrep -qv '^(docs/|README.md|.*\.md|.*\.(png|jpg|jpeg|svg|gif)|\.github/|\.vscode/|test/|tests/|playwright/|e2e/)'; then
  echo "Build required" && exit 1
else
  echo "Skipping build" && exit 0
fi
```

## 本番相当ビルドのローカル再現

```bash
pnpm dlx vercel build --cwd .
# 失敗時のログを保存
pnpm dlx vercel build --cwd . 2>&1 | tee artifacts/build-log.txt
```

CI で `artifacts/build-log.txt` をアーティファクト収集することで、失敗層の特定が容易になります。

## Docs Index
- アーキ構造: `/docs/ARCHINDEX.md`
- 再発防止ルール: `/docs/Guardrails.md`
- フラグ台帳: `/docs/feature-flags.md`
- リリース手順: `/docs/Release-Runbook.md`
- SLO/SLI: `/docs/SLO-SLI.md`

> 詳細手順や過去メモは `/docs/archive/` を参照（正準は上記）。

## Preflight（実装前の一発チェック）
開発前に必ず以下を実行してください：

```bash
# 厳格モード（推奨）
npm run preflight

# 警告モード（導入初期やノイズ多い時）
npm run preflight:warn
```


