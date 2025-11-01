**Goal**
- 主要ページ（Home、Contents/HTS、Review）で簡易なアクセシビリティ監査を実行し、人が読めるレポートを生成する。

**Scope**
- Home `/`
- `/shipping/new/contents`（または US の場合は `/contents/hts`）
- `/shipping/new/review`

---

@Browser

1. 各対象 URL について:
   - ページへ遷移し、ネットワークアイドルまで待つ。
   - この環境で Lighthouse が利用可能なら a11y チェックを実行。不可の場合は CDN 経由で axe-core を注入し監査を実行。
2. 重大度およびセレクタごとに違反を収集・グルーピングする。プレースホルダーテキストのみの色コントラスト警告は無視する。
3. JSON レポートを `tmp/browser/a11y_report.json` に、Markdown サマリを `tmp/browser/a11y_report.md` に保存（以下を含む）:
   - ページ URL
   - 重大度別の違反件数
   - アクション可能な上位 5 件と修正提案スニペット
4. `serious` または `critical` の問題が一つでもあればコマンドを失敗とする。

**Exit Criteria**
- アクション可能項目を含む Markdown レポートが生成され、重大度閾値に基づく成否がコマンドステータスに反映されている。

---

**Notes**
- 安定した `data-test` セレクタを role/xpath より優先する。
- 手順は冪等かつ堅牢に：可視になるまで待ってから操作する。
- 失敗時は必ず添付：コンソール直近 20 行 + 失敗ネットワーク 10 件 + 最終スクリーンショット。
- 成果物は `tmp/browser/` 配下に保存（既存パスがある場合はタイムスタンプ付き）。
- `BASE_URL` が異なる（Vercel プレビュー等）場合は、冒頭で設定しエコーする。

