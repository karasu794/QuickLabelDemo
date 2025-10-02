# Ship (Prod, Single-Package) - Implementation Notes

## Server-only ENV
```
SHIP_API_WRITE_ENABLED=false
REQUIRE_RATE_MATCH=false
RATE_MATCH_YEN_TOLERANCE=300
RATE_MATCH_PERCENT_TOLERANCE=2
```

## API
- `POST /api/ship/create`
  - 認証必須 (`requireOrg`) / CSRF(Origin/Referer) チェック
  - 冪等性: `order_id` ユニーク + 再読込返却、最終ロック: `pg_advisory_xact_lock(hashtext(order_id))`
  - 乖離チェック: 環境でON時のみ。参照値不在/通貨不一致は WARN スキップ
  - ラベル: FedEx URL→PDF取得→Vercel Blob 保存（`application/pdf`）→ URL返却（署名付きを推奨）
  - エラー応答: `{ code, message }` のみ（detailsはサーバログ）

## ロギング
- すべて `correlationId=orderId`。イベント: `ship_create_requested/blocked/succeeded/failed`
- PII を `maskPII()` で伏字化

## エラーコード
- `WRITE_DISABLED` (503): ラッチOFF
- `PAYMENT_REQUIRED` (402/403): 決済未完了
- `RATE_MISMATCH` (409): 乖離超過
- `SHIP_FAILED` (502): FedEx 呼び出し失敗（サマリ）

## テストチェックリスト（抜粋）
- 認証なし → 401
- ラッチOFF → 503
- 決済未完了 → 402/403
- 初回成功 → Blob保存 + DB 1件 + URL返却
- 2回目（同payload）→ FedEx未呼出・既存返却
- 乖離ON・閾値超過 → 409
- 競合同時2リクエスト → FedEx 1回（ロック/UNIQUEで抑止）
