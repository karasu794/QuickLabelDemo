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
- Build Command: `pnpm build`
- Ignored Build Step: ドキュメント/画像/テストのみの変更ではビルドをスキップするシェルを登録

```bash
# example
if git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | egrep -qv '^(docs/|README.md|.*\.md|.*\.(png|jpg|jpeg|svg|gif)|\.github/|\.vscode/|test/|tests/|playwright/|e2e/)'; then
  echo "Build required" && exit 1
else
  echo "Skipping build" && exit 0
fi
```


