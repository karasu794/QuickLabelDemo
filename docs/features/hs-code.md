## HSコード入力と補助（米国宛てのみ / FedEx補助API）

- **主な責務**: 品名入力に応じたHSコード候補の取得・選択。特に米国宛てなど一部宛先での分類補助を提供。

- **構造概要**:
  - **UI**: `src/components/HSCodeAutocomplete.tsx`（デバウンス検索・候補選択）
  - **API**: `src/app/api/shipments/hs-code/route.ts`
  - **統合**: 内容品入力画面 `src/app/shipping/new/contents/page.tsx` で `HSCodeAutocomplete` を使用

- **主な関数・ロジック**:
  - `/api/shipments/hs-code` に `searchText` と `destinationCountryCode` をPOST
  - FedEx Commodity APIへアクセストークン取得→検索を試行。エラー時は明示的にJSONエラー返却
  - UI側は500msデバウンス・候補のキーボード操作対応・選択で `hsCode`/`description` を反映

- **Supabase参照情報**:
  - 直接参照なし。選択結果は後続の出荷/インボイス構築で `harmonizedCode` として使用

- **注意点・備考**:
  - 環境変数: `FEDEX_EXPORT_*` / `FEDEX_IMPORT_*`（HSコード検索は通常輸出キーを利用）
  - 仕向国により州コード必須等の違いがあるため、UIで `US/CA` の州コード補助
  - 候補0件時のUX（空表示・エラーメッセージ）を考慮


