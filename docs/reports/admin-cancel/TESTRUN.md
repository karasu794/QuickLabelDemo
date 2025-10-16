### 2025-10-15 テスト実行要約

実行コマンド（推奨）
```
pnpm dev
pnpm test:contracts
pnpm test:e2e -- tests/e2e/cancel_flow.spec.ts
```

観測ポイント
- API `/api/shipments/:id/cancel` は即時応答（200/4xx/5xx）を返す。
- Admin ボタンは `adminCancelShipmentAction` を直叩き。外部APIでネットワーク要因があると長引くことがある。

現在の結果（ローカル実行は未記載のためテンプレート）
- contracts: TBD（次回実行時に詳細追記）
- e2e: TBD（同上）

メモ
- `/api/ship/cancel` を参照しているテストがある場合は、正しい `/api/shipments/:id/cancel` へ更新が必要。

---

### 2025-10-16 QUICK_FIX 実行結果

- 追加ダミー: `/api/ship/cancel`（POST→501, 非Admin→403, 他メソッド→405）
- UI: 管理キャンセルボタンに `data-test="admin-cancel"` を付与

実行ログ要約（ローカル例）
- contracts: 実行OK（詳細TBD）
- e2e(cancel 近傍): 旧パス参照時も即時 501/403 で収束（タイムアウト消失）。

スクショ/トレース: TBD

追記用テンプレート
- 実行日時(JST): 
- Playwright status 実測: 
- 旧失敗パターンとの比較（タイムアウト→応答ms）: 
- 失敗種別: 403=権限, 501=旧パス, 405=メソッド, その他=要調査
- スクショ/トレース: 


