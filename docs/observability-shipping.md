## 目的

Vercel 本番/プレビューで、ラベル発行処理の失敗/停滞ポイントを即時特定できるよう、段階別の構造化ログを実装。

## 実装概要

- 共通ロガー: `src/lib/observability/logger.ts`
  - `createLogger(ns, diagId)` → `{ info(), warn(), error(), debug(), child() }`
  - `withTiming(log, step, fn, context?)` で実行時間を計測し、`duration_ms` を自動付与
  - `APP_LOG_LEVEL`（silent|error|warn|info|debug）で出力レベル制御
  - `APP_LOG_STACK_DEBUG=true` の場合、debug レベルで stack を一部出力
- エントリポイント `/api/ship/create`
  - リクエスト毎に `diagId = crypto.randomUUID()` を生成
  - 入力解析・支払検証・ドラフト同意確認・RateGuard・FedEx本発行・ラベル取得・BLOB保存・DB永続化を `withTiming` で段階計測
  - 成否に関わらず `step: 'done'` もしくはエラー時の段階で `ok:false` を出力
- FedEx クライアント（`src/lib/fedex/client.ts`）
  - 送信/受信ログから `body` を除外（PII/巨大オブジェクト防止）
  - `X-Correlation-Id` を request/response で `corrId` として記録

## ログフォーマット（例）

```json
{
  "ts":"2025-10-16T12:34:56.789Z",
  "level":"info",
  "ns":"ship.create",
  "diagId":"b1c8...-uuid",
  "step":"fedex.request.shipment",
  "duration_ms":123,
  "ok":true,
  "context":{"countryFrom":"JP","countryTo":"US","service":"FEDEX_INTERNATIONAL_PRIORITY","packageCount":1}
}
```

## ステップ一覧

- `start`
- `blocked`（WRITE_DISABLED）
- `input.parse`
- `payment.verify`
- `db.read.shipments.idempotent` / `idempotent.hit`
- `db.read.drafts`
- `rateguard.assert`
- `fedex.request.shipment`
- `label.fetch`
- `blob.put.label`
- `db.write.shipments`（`on-dup` リカバリ読取含む）
- `done`

## PII/機微データの取り扱い

- ログに個人名/住所/電話/メール/ラベル画像(base64)等は出力しない
- 郵便番号、住所詳細は出力しない（国コードなど最小限のみ）
- FedEx 送信ボディはログしない

## 環境変数

- `.env.example`
  - `APP_LOG_LEVEL=info`
  - `APP_LOG_STACK_DEBUG=false`

## 運用手順（目視確認）

1. 開発環境で `APP_LOG_LEVEL=debug` とし、`/api/ship/create` を最短パスのモックで実行
2. `diagId` をキーにログを時系列で追跡し、主要フェーズが連続して出力されることを確認
3. プレビュー/本番では Vercel ログで `diagId` を検索し、停滞/失敗のステップを特定

## よくある失敗と切り分け

- `payment.verify` が `ok:false` → 決済未完了/ID不整合
- `rateguard.assert` 失敗 → 期待額と決済額の差分を確認
- `fedex.request.shipment` で失敗 → FedEx 側のバリデーション/資格情報/重量整合など
- `label.fetch` 失敗 → ラベルURL取得不可/トークン失効
- `blob.put.label` 失敗 → Blob トークン未設定
- `db.write.shipments` 失敗 → 重複/DB接続/権限


