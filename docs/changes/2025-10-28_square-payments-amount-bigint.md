# Square Payments: AmountをSDK直前のみBigInt化（JPY整数）

根拠:
- docs/vendors/square/reference.md の CreatePayment / AmountMoney（amount = smallest unit integer、JPY = 小数0）
- docs/vendors/square/openapi.json の /v2/payments スキーマ

方針:
- アプリ内の金額は number を維持
- SDK呼び出し直前のみ BigInt を渡す
- 応答JSONは number を維持（BigIntを混在させない）

実装:
- 新規: `src/lib/vendors/square/amount.ts` → `normalizeJPYAmount(amount)`（四捨五入→正の整数→BigInt）
- 変更: `src/app/api/payments/charge/route.ts`
  - amountの正規化を導入
  - `amountMoney.amount` に BigInt を使用
  - エラー分類とHookdeck `payment.error` 通知（SQUARE_CONFIG / LOCATION_REQUIRED / SOURCE_REQUIRED / INVALID_AMOUNT / SQUARE_ERROR / AMOUNT_TYPE_ERROR / VALIDATION_ERROR / QL-JSON）
  - 既存レスポンス型を維持（BigIntは返却しない）

テスト:
- Unit: `tests/unit/square_amount.test.ts`（丸め・BigInt型）
- Unit-like: `tests/unit/payments_charge_bigint.mock.test.ts`（BigInt利用確認）

備考:
- 成功時はHookdeck通知しない（既存方針踏襲）。


