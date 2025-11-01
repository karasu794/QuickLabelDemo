**Goal**
- 実ブラウザで `@Browser` を用いて FQL の高速で信頼できるスモークテストを実行する。
- 重要なUXパスが不安定さなくレンダリングされ、操作できることを確認する。

**Preconditions**
- `BASE_URL` に到達できない場合は開発サーバーを起動: `pnpm dev`（ただし既存のローカルまたは Vercel プレビューへの接続を優先）。
- クリーンなブラウザプロファイル/セッションを使用する。

**Variables**
- `BASE_URL`: http://localhost:3000（プレビューURLがあれば上書き）
- `ADMIN_EMAIL`: （.env.local から）またはテスト管理者フィクスチャ
- `ADMIN_PASSWORD`: （.env.local から）またはテスト管理者フィクスチャ

**Selectors (stable)**
- ヘッダー認証インジケータ: `[data-test="nav-admin"]`, `[data-test="nav-signin"]`, `[data-test="nav-signout"]`
- Admin Cancel ボタン: `[data-test="admin-cancel"]`
- HS/HTS 入力: `[data-test="hs-code"]`, `[data-test="hts-code"]`
- Estimate CTA: `[data-test="estimate-next"]`
- Review ページマーカー: `[data-test="review-page"]`

---

@Browser

1. `${BASE_URL}` を開く。
2. ステータスが 400 未満でページがロードされ、タイトルに "Quick Label" を含むことを確認する。
3. `[data-test="nav-signin"]` が存在する場合、クリックして `${ADMIN_EMAIL}` と `${ADMIN_PASSWORD}` を入力・送信し、`[data-test="nav-admin"]` が現れるまで待つ。
4. 見積もりフローを進む:
   - 必須項目を最小限の有効データで入力（送信者/受取人、寸法、重量）。
   - `[data-test="estimate-next"]` をクリック。
   - 国別ロジックに応じて `/shipping/new/contents` または `/shipping/new/contents/hts` に到達したことを確認する。
5. 配送先が US の場合、HTS UI が存在することを確認する:
   - `[data-test="hts-code"]` が可視になるまで待つ。
   - プレースホルダー値（例: `8517.12.0000`）を入力してフォーカスを外し、バリデーション/ヘルプ文言が表示されることを確認する。
6. レビュー工程へ進む:
   - 通常のフローで `/shipping/new/review` に遷移する。
   - `[data-test="review-page"]` を待つ。
7. 成果物を保存:
   - スクリーンショット `tmp/browser/smoke_review.png` を保存。
   - セッションのネットワーク HAR を `tmp/browser/smoke.har` に保存。
8. アサーション:
   - コンソールに未捕捉エラーがないこと（既知の非ブロッキング警告は無視）。`TypeError`、`ReferenceError`、または 500 の連発があれば失敗。

**Exit Criteria**
- すべてのアサーションが通過し、成果物が保存されている。失敗した場合は、失敗ステップの要約に加え、直近のコンソール 20 行とネットワークエラー 10 件を添付する。

---

**Notes**
- 安定した `data-test` セレクタを role/xpath より優先する。
- 手順は冪等かつ堅牢に：可視になるまで待ってから操作する。
- 失敗時は必ず添付：コンソール直近 20 行 + 失敗ネットワーク 10 件 + 最終スクリーンショット。
- 成果物は `tmp/browser/` 配下に保存（既存パスがある場合はタイムスタンプ付き）。
- `BASE_URL` が異なる（Vercel プレビュー等）場合は、冒頭で設定しエコーする。

