## 決済処理（Square API連携 / 成功時に出荷連携）

- **主な責務**: Square決済のトークン受領→サーバ決済実行→結果に応じた出荷確定（Ship/Open Ship）連携。

- **構造概要**:
  - **UI**: `src/components/SquarePaymentForm.tsx`（Web SDKでトークン取得、`onTokenReceived`コールバック）
  - **API**:
    - 決済: `src/app/api/payment/route.ts`（最小）／ `src/app/api/payments/charge/route.ts`（拡張版、冪等・状態保存）
    - Webhook: `src/app/api/payments/webhook/route.ts`（決済ステータス→`shipments.payment_status`更新）
    - 連携: `src/app/api/open-ship/confirm/route.ts`, `src/app/api/ship-unified/route.ts`

- **主な関数・ロジック**:
  - フロントは Square Web SDK から `sourceId` を取得し、サーバ `/api/payment` に渡す
  - サーバは `SquareClient` で `payments.create()` を実行し、`paymentId/status` を返却
  - MPS統合フロー（`ship-unified`）では決済→Open Shipment作成→確定の順に実行
  - `payments/webhook` は署名検証後、`orderId` または `square_payment_id` で `shipments.payment_status` を更新

- **Supabase参照情報**:
  - `shipments`: `square_payment_id`, `payment_status`, `shipping_status`, `square_location_id`, `square_refund_id`
  - `open_shipments`: `payment_id`, `total_amount`（Open Ship 確定時に保存）

- **注意点・備考**:
  - 環境変数: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, クライアント側 `NEXT_PUBLIC_SQUARE_APP_ID`, `NEXT_PUBLIC_SQUARE_LOCATION_ID`
  - Webhookの署名検証（`verifySquareSignature`）を必ず通すこと
  - 金額の冪等性は `idempotencyKey` を利用。`payments/charge` ルートは `orderId` で冪等再利用
  - 本番では失敗時リトライや返金フロー（拡張）を検討


