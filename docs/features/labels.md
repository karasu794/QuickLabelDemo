## ラベルPDF生成（署名・レターヘッド切替 / Phoenix専用レイアウト対応）

- **主な責務**: FedExラベルの取得・保存／商業インボイスのPDF生成におけるレターヘッド・署名の適用、Phoenix専用の固定資産優先の切替。

- **構造概要**:
  - **API**:
    - ラベルダウンロード/保存: `src/app/api/ship/create/route.ts`（FedEx URLからPDF取得→Blob保存）
    - 受領書/インボイス: `src/app/api/receipts/[transactionId]/route.ts`, `src/app/api/invoice/preview/route.ts`
  - **lib**:
    - PDFビルダー: `src/lib/pdf/adapters/token.builder.ts`, `src/lib/pdf/adapters/pdf-lib.builder.ts`（フォールバック含む）
    - 設定: `src/lib/config/receipt.ts`
    - 商業インボイステンプレート: `src/lib/pdf/commercialInvoiceTemplate.ts`

- **主な関数・ロジック**:
  - ラベル: FedExの `labelResponseOptions=URL_ONLY` で取得したURLからPDFをダウンロード→Blobに `labels/yyyy/mm/<orderId>-<tracking>.pdf` として保存
  - インボイス: `IInvoicePdfBuilder` の実装を動的選択（`pdf-lib` 未導入環境はトークン出力で代替）。`letterheadUrl`/`signatureUrl` を指定して描画
  - Phoenix専用UI: プレビューAPI経由で `FORCE_*` 設定を反映した結果を表示

- **Supabase参照情報**:
  - 直接のPDF保存先はVercel Blobを使用（Supabase Storageは管理資産用）
  - 管理/ユーザー資産のURL取得は各APIでSupabaseから参照

- **注意点・備考**:
  - 環境変数: `BLOB_READ_WRITE_TOKEN`（Blob保存）、PDF依存回避のため `TokenPdfBuilder` をデフォルトにできる構成
  - 画像形式: `jpg/png` の埋め込みに対応（`pdf-lib`実装）
  - 受領書のキャッシュ・番号付与は別機能に委譲（receipt機能参照）


