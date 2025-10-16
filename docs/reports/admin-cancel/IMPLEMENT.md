## 2025-10-17 FINALIZED

- /api/ship/cancel: FedEx + Square + DB + 監査 + 冪等を統合（200/204/207 即応）
- E2E/Contract: 2xx 化へ更新（非ハングを保証）
- UI: `AdminCancelShipmentButton` は API 呼び出し後に成功/冪等で即時反映（リロード）
- Status: Ready for Release Candidate

実行コマンド（例）
```
pnpm test:contracts -- tests/contracts/api.cancel.route.contract.test.ts
pnpm test:e2e -- tests/e2e/admin_cancel.flow.spec.ts
```

## 2025-10-17 通知拡張完了
- FedEx/Square の成否を日本語で通知
- /admin/notifications に success/error 色分けで可視化
- エラー時も日本語メッセージを自動登録（部分失敗含む）
- FIXPLAN と整合済

