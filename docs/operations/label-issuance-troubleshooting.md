# ラベル発行トラブルシューティング（運用Runbook）

## 症状1: 価格が「—」のまま
- 想定原因
  - selectedRate が保存されていない
  - API レスポンスに total/currency が欠落
- 確認
  - 画面 `shipping/new/service` でレート選択が成功しているか
  - `src/app/api/quote` / `src/app/api/quote/mps` のレスポンス整合
- 対処
  - UIの `review-price` が通貨で表示されることを確認
  - E2E: review_price_calculated.spec.ts を参照

## 症状2: 「読み取り中」のまま止まる
- 想定原因
  - 作成後のラベル取得を同期で待っている
  - ステータス確定/ポーリング不足
- 確認
  - `/api/ship/create` が即時に `status: processing` を返すか
  - `/api/ship/status` が存在し、完了で `completed` を返却するか
  - レスポンス/ログに含まれる `x-request-id`（requestId） を控え、Hookdeck・アプリログ・DBで相関追跡できるか
- 対処
  - ページ `shipping/new/label` で指数バックオフによるポーリングを実装
  - 60秒以内に `label-download-link` が表示されることを確認

## 症状3: メール不達
- 想定原因
  - SPF/DKIM/DMARC 設定不備
  - プロバイダ側の一時失敗
- 確認
  - `/api/email/resend` が 200 を返し、UI トーストで「再送しました」を表示
  - ログは `x-request-id` で相関
- 対処
  - 再送ボタンからのリトライ、一定のレート制限を設定

### 非同期化後の確認項目（更新）
- /api/ship/create は常に202で `{status:'processing', shipmentId}` を返す
- /api/ship/status で processing→completed/failed に遷移し、いずれの分岐でもUIのローディングが解除される
- メール不達: shipment_emails に行が追加される。status='queued_for_retry' の場合は UI の[通知再送]から再送
- すべての問い合わせは x-request-id で Hookdeck/アプリログ/DB を横断照合


