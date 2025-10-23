### 2025-10-21 | FQL 本番 | ラベル作成が進まずスピナーが止まらない・確認メール未着・整合性崩れ

- ENV: 本番（Vercel + Supabase + 外部API: FedEx, Square, メール送信ベンダ未連携）
- ORG_ID: a1db0733-28a2-4267-a0e9-8850f3059b99
- USER_ID: 43aa7777-c059-4ca2-8593-f7c7add6e382
- QUOTE_JOB_ID: 4293b1b8-49fa-4d91-ae67-b584189ef85d
- TIME_RANGE: 2025-10-17T00:00:00Z 〜 現在（UTC/JST）

---

### Timeline（UTC/JST）
- 2025-10-17 00:00Z 以降: 見積もり実行。`quote_jobs.status=completed` で `rates` が返っている行が存在（複数サービスの `totalNetFedExCharge`）。
- 同時間帯: 「料金詳細」が「計算中...」のまま固定化、送り状作成完了後の成功ページでスピナー継続、確認メール未着、が発生。
- 2025-10-21: 分析により、UI待機条件の設計不一致・成功画面の必須パラメータ不整合・メール送信未接続・MPS系の永続化不足を特定。

---

### Root Cause(s)
- RC1（UI待機設計の不一致・ポーリング欠如）
  - `ReviewPage` は `/api/quote` から即時 `rates` を受け取る想定で `setActualShippingRates` に代入しているが、実際のAPIは `{ ok, jobId, serviceFeePercentage }` を返してバックグラウンドで `/api/quote/process/[jobId]` がレート計算を実施。UI側に `/api/quote/[jobId]` ポーリングが無いため、`shippingFee` が 0 のまま→「計算中...」固定化。
  ```169:216:src/app/shipping/new/review/page.tsx
        const ratesData = await response.json()
        setActualShippingRates(ratesData)
  ```
  ```291:363:src/app/api/quote/route.ts
        const processingUrl = `${siteUrl}/api/quote/process/${jobIdCreated}`;
        // 非同期で処理を開始
        ...
        return NextResponse.json({ ok: true, jobId: jobIdCreated, serviceFeePercentage });
  ```
  ```25:63:src/app/api/quote/[jobId]/route.ts
    case 'completed':
      return NextResponse.json({ status: 'completed', data: job.response_payload, ... })
  ```
- RC2（成功ページの必須パラメータ不整合）
  - 成功ページは URL に `trackingNumber`・`paymentId`・`shipmentId` の3つが揃わないと `shipmentData` を確定しない。一方 `/api/ship/create` は `shipmentId` を返さず、成功ページ移行後にローディングが継続。
  ```145:166:src/app/shipping/new/success/page.tsx
    const shipmentId = searchParams.get('shipmentId')
    if (trackingNumber && paymentId && shipmentId) { setShipmentData(...) }
  ```
  ```380:385:src/app/api/ship/create/route.ts
    return NextResponse.json({ trackingNumber: tracking, labelUrl, labelUrls: responseLabelUrls, ... })
  ```
- RC3（メール送信未実装）
  - 送り状作成後のメール送信（Resend/SendGrid/SES等）に相当するエンドポイント/処理が見当たらず、確認メールは送られていない（横断検索で `email|mailer|sendgrid|resend|smtp` 該当ルートなし）。
- RC4（MPS系の経路と永続化の不備）
  - `ReviewPage` は MPS 条件で `/api/quote/mps` を参照するが該当ルートが存在せず 404 となりうる。
  - `/api/ship/create` のレスポンスには `labelUrls[]`（複数ラベル）が含まれるが、`shipments` テーブルは `label_url`（単一）のみで複数ラベルを永続化していない。`open_shipments` には `label_urls` があるため、MPSでの整合ビューが分断。
  ```282:326:src/app/api/ship/create/route.ts
    let labelUrl = ''
    let responseLabelUrls: string[] = []
    ...
    responseLabelUrls = [labelUrl, ...rawUrls.slice(1)]
  ```
  ```631:779:src/types/supabase.ts
    shipments.Row: { label_url: string | null, ... }
    open_shipments.Row: { label_urls: string[] | null, ... }
  ```

---

### Evidence（原典・抜粋）
- `/api/quote` は jobId を返し、バックグラウンドで `/api/quote/process/[jobId]` を起動。
```293:331:src/app/api/quote/route.ts
setTimeout(async () => { await fetch(processingUrl, { method: 'POST', ... }) })
```
- 成功ページは `shipmentId` 不足でローディング継続。
```188:199:src/app/shipping/new/success/page.tsx
{isReady && !shipmentData && ( <Loader2 .../> 送り状情報を読み込み中... )}
```
- MPS向け `/api/quote/mps` がUIのみ参照されている。
```136:145:src/app/shipping/new/review/page.tsx
const apiEndpoint = packages.length >= 2 ? '/api/quote/mps' : '/api/quote'
```

---

### Repro（再現手順 | Staging・READ ONLY）
1) 条件: `packages.length >= 2`・JP→US・Residential。
2) ホームで見積 POST → `/api/quote` は `{ ok, jobId, serviceFeePercentage }` を即返却。
3) `ReviewPage` は `setActualShippingRates` にそのまま代入→ `rates` 無く `shippingFee=0` → 「計算中...」固定化。
4) 決済→ `/api/ship/create` 成功→ 成功ページへ遷移。URLに `shipmentId` 未付与のため `shipmentData` 確定せずローディング継続。
5) 確認メールは送られない（メール送信実装無し）。

---

### Impact（影響）
- UX: 料金が表示されず決済に進みにくい／成功確定できない。
- 運用: ユーザ問い合わせ・手動案内の増加。
- データ: MPS の複数ラベル参照性が低く、事後配布/再印刷が困難。

---

### 暫定回避策（no-code / 低リスク運用）
- UI運用:
  - 料金が出ない場合は「再取得」操作を案内（リロードではなく）。
  - 成功ページでローディング継続時、URLに一時的に `&shipmentId=<任意>` を付与して回避（ラベル自体は `/api/download-label` 経由で取得可能）。
- Ops（メール）:
  - 出荷完了メールをテンプレで手動送付（件名/本文テンプレ用意）。
- BE最小リスク:
  - 暫定 `/api/quote/mps` を `/api/quote` にフォワード（同一shape）。
  - `/api/ship/create` のレスポンスに `shipmentId` を付与（DB挿入結果の id）。

---

### 恒久対策（提案）
- UI待機の再設計:
  - `/api/quote` 応答から `jobId` を取得し `/api/quote/[jobId]` を 2–3s 間隔でポーリング。45–60s でタイムアウト・明示エラー。`completed` で `response_payload.rates` を採用。
  - MPS 分岐を撤廃して `/api/quote` に統一、もしくは `/api/quote/mps` を実装。
- 成功画面:
  - `shipmentId` が無い場合は `trackingNumber` で `/api/shipments` を検索して補完（URL依存を低減）。
- メール:
  - ベンダ接続（Resend/SendGrid/SES）＋非同期キュー化・リトライ・バウンス記録・UI手動再送。
- データ整合:
  - `shipments` に `label_urls`（text[] など）を追加し、MPS でも複数ラベルを永続化。
- 観測性:
  - `x-request-id` を UI→API→FedEx→Blob 保存まで貫通させ相関を記録。

---

### DB検証（READ ONLY; 本番での実行例）
- a) QUOTE_JOB 裏取り
```sql
select id, status, created_at, completed_at,
       (response_payload->'rates') is not null as has_rates,
       jsonb_path_query_array(response_payload, '$.rates[*].totalNetFedExCharge') as sample_rates
from quote_jobs
where id = '4293b1b8-49fa-4d91-ae67-b584189ef85d';
```
- b) 当該時間帯±2hの `shipments` / `open_shipments`
```sql
select id, user_id, tracking_number, label_url, created_at, payment_status
from shipments
where created_at between (timestamp '2025-10-17T00:00:00Z' - interval '2 hour') and now()
  and (user_id = '43aa7777-c059-4ca2-8593-f7c7add6e382' or user_id is not null)
order by created_at desc
limit 200;

select id, master_tracking_number, label_urls, tracking_numbers, status, created_at
from open_shipments
where created_at between (timestamp '2025-10-17T00:00:00Z' - interval '2 hour') and now()
order by created_at desc
limit 200;
```
- c) 失敗痕跡（存在する場合）
```sql
select id, type, is_read, created_at from notifications
where created_at >= timestamp '2025-10-17T00:00:00Z';

select id, type, status, last_error_code, last_error, created_at
from jobs
where created_at >= timestamp '2025-10-17T00:00:00Z'
order by created_at desc
limit 200;
```
- d) RLS 可視性差分
  - 認証ユーザーで `/api/shipments` を参照し、サービスロールでの SQL 結果と突合。

---

### Nice-to-have（提案）
- 最終整合API: `GET /api/shipments/:id/consistency`（`shipments×open_shipments×notifications` を一括返却）。
- 重要ステップに `x-request-id` を付与し、UI→API→Webhook→DB を関連付け。
