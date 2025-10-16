# FQL-SERVICE-FEE: サービス手数料を app_settings.value 参照に切替

- 日付: 2025-10-16
- 変更種別: feat + docs + tests

## 目的

確認画面のサービス手数料(%)をDB設定 `public.app_settings(key='service_fee_percentage')` の `value` を単一ソースとして使用。

## 変更概要

- 新規: `src/lib/settings/getServiceFeePercentage.ts`
  - Service Role で `value, service_fee_percentage` を参照
  - `parseFloat(value)` → NaN なら `service_fee_percentage` → 更にダメならデフォルト(10)
  - 範囲クランプ: 0〜50、メモリキャッシュ: 5分（失敗30秒）
- 新規API: `GET /api/app-settings/service-fee`
  - `{ serviceFeePercentage: number }` を返却
  - `Cache-Control: s-maxage=300, stale-while-revalidate=600`
- 既存API拡張: `POST /api/quote`
  - 応答JSONに `serviceFeePercentage` を同梱
- UI: `src/app/shipping/new/review/page.tsx`
  - まず quote 応答の `serviceFeePercentage` を使用
  - 無い場合は `GET /api/app-settings/service-fee` で取得
  - ハードコード 15% を撤廃

## 受け入れ条件

- 料金詳細がDB設定の手数料率を反映（ハードコード不使用）
- 不正／欠損時もフォールバックで安全に動作
- Contract/E2E 緑、レポート保存

## テスト

- Contract:
  - `GET /api/app-settings/service-fee` が number を返す
  - `POST /api/quote` 応答に `serviceFeePercentage` を含む
- E2E:
  - 確認画面で「サービス手数料 (X%)」が表示される

## 回帰観点

- 値のパース（小数/空/非数）、クランプ範囲、キャッシュの更新タイミング
- 料金詳細の計算と表示の整合性（同一パラメータ使用）

## 既知の課題

- 管理画面の即時反映はAPI経由で担保（キャッシュ5分）。将来はイベント駆動で無効化可。

## 推奨アクション（次回）

- 管理画面の保存時にキャッシュ無効化フックを追加
- 他の設定値（消費税率など）も同一ユーティリティで統合

