### 低リスク修正提案（提案のみ・実装なし）

- 提案1（UI）: `/api/quote` の応答が `{ jobId }` の場合は `/api/quote/[jobId]` を 2–3s 間隔でポーリングし、`status==='completed'` で `data.rates` を採用。45–60s でタイムアウト・エラー明示。
  - 擬似コード:
```tsx
// after POST /api/quote
if (res.ok && resJson.jobId) {
  const jobId = resJson.jobId
  const started = Date.now()
  const tryFetch = async () => {
    const r = await fetch(`/api/quote/${jobId}`, { cache: 'no-store' })
    const j = await r.json()
    if (j.status === 'completed' && j.data?.rates) return j.data
    if (Date.now() - started > 60000) throw new Error('見積りがタイムアウトしました')
    await new Promise(rs => setTimeout(rs, 2500))
    return tryFetch()
  }
  const data = await tryFetch()
  setActualShippingRates(data)
}
```

- 提案2（UI）: MPS 分岐の一時撤廃。`/api/quote/mps` 参照を削除し、常に `/api/quote` へPOST。

- 提案3（API）: 暫定 `/api/quote/mps` ルートを追加し、`POST /api/quote` を内部呼び出しして同shapeを返す。

- 提案4（API/成功画面）: `/api/ship/create` のレスポンスに `shipmentId` を追加。フロントの遷移URLに `shipmentId` を付ける。

- 提案5（UI/成功画面）: `shipmentId` 不足時は `trackingNumber` で `/api/shipments?tracking=...` を呼び出して不足項目を補完。スピナー固定化を回避。

- 提案6（データ）: `shipments` に `label_urls`（text[]）列を追加し、MPSの複数ラベルを永続化。`open_shipments.label_urls` と一貫性確保。

- 提案7（メール）: ベンダ接続（Resend/SendGrid/SES）と非同期キューを導入。短期は運用で手動送付。

- 提案8（観測性）: `x-request-id` を UI→API→外部API→DB に貫通し、関連ログを相関できるようにする。
