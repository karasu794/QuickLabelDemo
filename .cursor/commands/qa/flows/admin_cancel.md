**Goal**
- Admin UI がキャンセルアクションを起動でき、API が決定的に応答することを検証する（モック/スタブでも可）。

**Preconditions**
- 管理者としてサインイン済み（セッションがあれば再利用）。
- キャンセル操作が可能な出荷行が少なくとも 1 件表示されていること。

**Variables**
- `BASE_URL`: http://localhost:3000

**Selectors**
- `[data-test="admin-cancel"]`

---

@Browser

1. `${BASE_URL}/admin`（または該当する場合は `/admin/shipments`）を開く。
2. `[data-test="admin-cancel"]` が有効になるまで待つ。
3. ネットワークインスペクタを開き、既存のリクエストをクリアする。
4. `[data-test="admin-cancel"]` をクリック。
5. `/api/ship/cancel` への対応するネットワークリクエストを待ち、以下を記録する:
   - HTTP ステータス
   - JSON ボディ（最大 2KB）
6. 期待される結果のいずれかであることを確認する（実エンドポイント構築中は設定で調整可）:
   - `status` が {200, 202, 404, 403, 501} に含まれる
   - レスポンスが有効な JSON `{ ok: boolean }` または `{ disabled: true }`、もしくは `message` を含むエラー形式である
7. スクリーンショット `tmp/browser/admin_cancel.png` と `{status, bodySnippet}` を含む簡易レポート `tmp/browser/admin_cancel_report.json` を保存。

**Exit Criteria**
- UI が応答性を保ち、リクエストが期待ステータスで完了し、未処理例外がログに出ない。

---

**Notes**
- 安定した `data-test` セレクタを role/xpath より優先する。
- 手順は冪等かつ堅牢に：可視になるまで待ってから操作する。
- 失敗時は必ず添付：コンソール直近 20 行 + 失敗ネットワーク 10 件 + 最終スクリーンショット。
- 成果物は `tmp/browser/` 配下に保存（既存パスがある場合はタイムスタンプ付き）。
- `BASE_URL` が異なる（Vercel プレビュー等）場合は、冒頭で設定しエコーする。

