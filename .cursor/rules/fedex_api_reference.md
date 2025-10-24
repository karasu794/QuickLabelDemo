### FedEx API 参照ルール（Backend実装用）

- 目的: FedEx関連のバックエンド変更・追加時に、必ずクローリング済みの公式Docs/サンプルに基づく実装・レビューを行う。

#### 参照元の標準パス
- クローラMarkdown: `docs/fedex_api_specs/md/`
- 例サンプル（Docs抽出）: `docs/fedex_api_specs/samples/docs-examples/`
- API実体サンプル（OAuth取得）: `docs/fedex_api_specs/samples/*.sample.json`
- 索引: `docs/fedex_api_specs/index.md`

#### 実装・レビュー時の必須チェック
1) 対象APIのDocs（`md/`）の関連章を確認（パラメータ必須性・制約・地域差）。
2) `docs-examples/` に該当リソースのOpenAPI/エラーマッピング/Postmanがあれば参照。
3) 可能なら `*.sample.json` の実体レスポンス構造も参照（存在すれば）。
4) エラー設計は `*-Common-ErrorMapping.json` を優先参照。
5) 差分があれば `docs/fedex_api_specs/index.md` に記載のSource URLで一次情報を再確認。

#### 実務ルール（Cursor補助）
- 変更ファイルに `FedEx` / `Rate` / `Ship` / `Track` / `Address` / `Documents` が含まれる場合、上記パスから関連資料を自動サジェスト。
- 該当ファイル編集開始時に、`index.md` の当該エントリと `docs-examples/` の関連ファイル名をコメントに添付（コード外部のPR説明欄推奨）。

#### メンテ
- 新API/章を追加したら `scripts/fedex_docs_crawler.ts` の `SEED_URLS` を更新し `pnpm docs:fedex:all` を実行。


