## その他

- **主な責務**: 他ファイルに属さない補助機能や横断的サービスの要点を記録。

- **構造概要**:
  - **受領書（レシート）**:
    - API: `src/app/api/receipts/[transactionId]/route.ts`
    - DB: `receipt_numbers`, `receipt_cache`（番号採番・生成物キャッシュ）
    - lib: `src/lib/services/receiptNumberService.ts`, `src/lib/services/cacheInvalidationService.ts`
  - **Open Ship（MPS）**:
    - API: `src/app/api/open-ship/create|add-packages|confirm/route.ts`
    - DB: `open_shipments`（`shipper_info/recipient_info` JSONB、`tracking_numbers/label_urls` 配列）
  - **Ship API（単品）**:
    - API: `src/app/api/ship/route.ts`, `src/app/api/ship/create/route.ts`
    - 役割: FedExトークン取得→バリデーション→作成→ラベル取得/保存
  - **ジョブ基盤**:
    - DB: `jobs`, `job_events`、RPC `jobs_pick_for_update`（バックグラウンド処理）
  - **レートガード**:
    - lib: `src/lib/ratelimit.ts`（現在は常時PASSのダミー）、`env.example` にしきい値系ENV
  - **テスト**:
    - コントラクト/E2E: `tests/contracts/**`, `tests/e2e/**`

- **主な関数・ロジック**:
  - レシートは取引種別（`shipment`/`open_shipment`）に応じてデータ取得→PDF生成→番号付与
  - Open Shipは作成→パッケージ追加→確定の手順に分解

- **Supabase参照情報**:
  - `shipments`: `payment_status`/`shipping_status` 分離、`square_payment_id` 等の拡張カラム
  - `open_shipments`: ステータス/追跡番号/ラベルURL配列

- **注意点・備考**:
  - 本番でのWebhook署名検証・RLS整合性・Service Role利用範囲を遵守
  - PDF生成は環境（Vercel/ローカル）差異に留意し、フォールバックビルダーを活用


