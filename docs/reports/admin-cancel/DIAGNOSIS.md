### 2025-10-15 現状診断（Admin 出荷キャンセル）

#### 所在とコード抜粋（UI / API / サービス / 支払い）

- UI（管理画面ボタン）: `src/components/AdminCancelShipmentButton.tsx`
```1:8:src/components/AdminCancelShipmentButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { adminCancelShipmentAction } from '@/app/actions/adminActions'
```

- Admin Server Action（FedExキャンセル + Square返金 + DB更新）: `src/app/actions/adminActions.ts`
```123:131:src/app/actions/adminActions.ts
const { data: existingRecord, error: checkError } = await supabaseAdmin
  .from('shipments')
  .select('id, status, tracking_number, payment_id, square_payment_id, total_amount')
  .eq('tracking_number', trackingNumber)
  .single()
```
```168:176:src/app/actions/adminActions.ts
const cancelUrl = 'https://apis.fedex.com/ship/v1/shipments/cancel'
const cancelRequest = { accountNumber: { value: credentials.accountNumber }, trackingNumber }
const response = await fetch(cancelUrl, { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-locale': 'ja_JP' }, body: JSON.stringify(cancelRequest) })
```
```254:266:src/app/actions/adminActions.ts
const { data: updateData, error: updateError } = await supabaseAdmin
  .from('shipments')
  .update({ shipping_status: 'cancelled', payment_status: 'refunded', square_refund_id: refundResult.refund.id, refund_reason: 'FedEx shipment cancelled', updated_at: new Date().toISOString() })
  .eq('id', existingRecord.id)
  .select('id, shipping_status, payment_status, tracking_number')
```

- API（DBの cancel_shipment RPC 呼び出し）: `src/app/api/shipments/[shipmentId]/cancel/route.ts`
```4:8:src/app/api/shipments/[shipmentId]/cancel/route.ts
export async function POST(_request: NextRequest, { params }: { params: { shipmentId: string } }) {
  const { shipmentId } = params
  if (!shipmentId) {
    return NextResponse.json({ error: 'shipmentIdが指定されていません' }, { status: 400 })
  }
```
```14:21:src/app/api/shipments/[shipmentId]/cancel/route.ts
const { data, error } = await ((supabase as any).rpc('cancel_shipment', { p_shipment_id: shipmentId }))
if (error) { /* not_found / forbidden / bad_request に分類 */ }
return NextResponse.json({ ok: true, data: data ?? { ok: true } })
```

- 決済キャンセル（ジョブ/API）: `src/app/api/payments/[paymentId]/cancel/route.ts`, `src/lib/payments/worker/cancelPaymentWorker.ts`
```19:28:src/app/api/payments/[paymentId]/cancel/route.ts
const decision = decideCancel(payment)
if (decision.type === 'reject') {
  return NextResponse.json({ code: decision.code, reason: decision.reason }, { status: decision.code })
}
```
```26:33:src/lib/payments/worker/cancelPaymentWorker.ts
if (job.payload.expectedAction === 'void') {
  const res = await this.adapter.void(payment.id, { idempotencyKey: job.payload.idempotencyKey })
  ...
} else {
  const res = await this.adapter.refund(payment.id, { amount: payment.amount, currency: payment.currency, idempotencyKey: job.payload.idempotencyKey })
}
```

#### API 実在・応答

- 出荷キャンセル API は `/api/shipments/[shipmentId]/cancel` が存在。RPC `cancel_shipment` を叩く構成。
- Admin の処理は Server Action 経由（外部FedEx+Square+DB）で、UI ボタンはこの Action を直叩き。

#### UI 配線・トリガ

- `AdminCancelShipmentButton` → `adminCancelShipmentAction(trackingNumber)` 呼び出し。
- 成功時リロード、失敗時はエラーメッセージ表示。

#### 状態遷移・冪等性

- Admin Action: FedEx Cancel → Square Refund → `shipments` 更新（`shipping_status: cancelled` / `payment_status: refunded`）。
- 既キャンセルの再実行に対する明示冪等はコード上は未定義（UI側で非表示制御）。
- RPC ルートの冪等は RPC 実装依存（本リポにRPC本体は見当たらず）。

#### 権限/RLS

- Admin Action側: Supabase セッション＋`profiles.role==='admin'` を使用し管理者限定。
- `/api/shipments/:id/cancel`: 認証必須（`createClient()`）。Admin限定の検査は本ルート単体では不明。
- RLS: migrations で profiles/shipments のRLSは有効化。`cancel_shipment` RPCのポリシーは要確認。

#### 監査/ログ

- Admin Actionはコンソールログ多数。DB監査テーブルの永続ログは未確認。

#### 既存テスト（契約/E2E）

- 契約: `tests/contracts/stage4.payments.cancel.contract.test.ts` 等。支払いキャンセル側は存在。
- E2E: `tests/e2e/cancel_flow.spec.ts`, `tests/e2e/stage4.payments.cancel.spec.ts` 等。

#### 懸念/タイムアウト示唆

- 噂の `/api/ship/cancel` は存在せず、正は `/api/shipments/[shipmentId]/cancel`。旧パス参照で 404/Timeout の可能性。
- Admin Action は外部APIを同期呼び出しのため、外部要因でハングに見えることがある。

---

### 要点まとめ

- UI配線: Adminボタン → Server Action（外部API+DB更新）。APIルート（RPC cancel）も別経路で存在。
- 権限: Admin Actionで厳格化（profiles.role）。APIルートは認証必須だがAdmin限定は未確定。
- 冪等: UIの非表示制御あり。API側の明示冪等は要補強。
- ログ/監査: コンソール中心。DB監査未実装。

---

### 2025-10-16 QUICK_FIX 実施前サマリ

- 旧パス `/api/ship/cancel` 参照の可能性: あり（本リポ正は `/api/shipments/[shipmentId]/cancel`）
- ダミールート有無: 未存在（追加対象）
- Admin 認可状態: `getAdminContext()` 等があり、Admin判定ユーティリティをAPIで使用可能
- 最小修正範囲: 旧パスに 501 即時応答のダミー追加、管理UIボタンに `data-test="admin-cancel"` を付与（不足時）


