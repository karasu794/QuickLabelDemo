## 見積もり取得・料金計算（FedEx統合）

- **主な責務**: 出荷元/先・荷物条件からFedEx料金見積もりを取得し、ユーザーに提示する。単品/複数個口（MPS）双方に対応。

- **構造概要**:
  - **UI**: `src/app/page.tsx`（トップの見積もりフォーム）、`src/components/QuoteFormComponent.tsx`、`src/components/FedExQuoteResults.tsx`
  - **API**:
    - 標準: `src/app/api/quote/route.ts`
    - MPS: `src/app/api/quote/mps/route.ts`
    - ジョブ処理: `src/app/api/quote/process/[jobId]/route.ts`
  - **lib/hooks**: `src/lib/fedex/auth.ts`（認証・Rate API呼び出し）, `src/lib/ratelimit.ts`（擬似レート制御）

- **主な関数・ロジック**:
  - `getFedExRates(rateInfo)`：Rate API呼び出しとレスポンス正規化（KG/CM基準、支払人情報付与）
  - `getFedExAccessToken(originCountry)` / `getFedExCredentialsByOrigin(originCountry)`：輸出入に応じて認証情報・口座番号を動的選択
  - `buildFedExRateRequest(...)` / `getAllServiceRates(...)`：詳細なレート取得（ジョブ処理ルート内）
  - `checkRate(key)`：現在は常時PASSのダミー実装（インターフェース維持）

- **Supabase参照情報**:
  - テーブル: `quote_jobs`
    - 主要カラム: `id`, `status`（'pending'|'processing_auth'|'processing_rate_request'|'completed'|'failed'）、`request_payload`, `response_payload`, `error_message`, `created_at`, `created_by`
    - RLS: 読み取り/作成は広く許容、更新は実質サーバ側（ポリシー定義あり）

- **注意点・備考**:
  - 環境変数: `FEDEX_EXPORT_*`, `FEDEX_IMPORT_*`（キー/シークレット/アカウント）, 任意の `NEXT_PUBLIC_FEDEX_API_BASE_URL`
  - 入力バリデーション（国/住所選択、重量>0、追加保険時の申告価額）をUIで必須化
  - MPSは単品時は通常Rate、複数時は概算/代表パッケージ戦略（MPSルート参照）
  - タイムアウト・再試行はジョブ処理側で管理（`process/[jobId]`）


