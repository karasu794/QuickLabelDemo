# WAVE2 – UI/UX & OPS INTEGRATION
> 新規ファイルを極力作らず、既存実装を改変。変更前に grep/open で対象ファイルを列挙してから編集すること。

## GOAL
出荷UIの体験を安定化し、レタヘ/署名強制・キャンセル・Webhook監視を統合。
対象: ⑧⑨⑩⑪⑬ + 表記変更

## PREP（事前探索）
- `grep -R "Stepper\|step" apps/web`  
- `grep -R "services.*forceShow" apps/web`  
- `grep -R "letterhead\|signature\|FORCE_PHOENIX" -n`  
- `grep -R "cancel\|refund" apps/api`  
- `grep -R "webhook" apps/api`

## SCOPE
- `/apps/web/app/shipping/new/*`（フォーム/ステップ/遷移）
- `/apps/web/components/Stepper.tsx`
- `/apps/web/components/forms/*`
- `/packages/phoenix-brand/`（有効資産解決）
- `/apps/admin/branding/`, `/apps/user/mypage/branding/`（アップロードUI）
- `/apps/api/payments/`（キャンセルsimulate分岐）
- `/apps/api/webhooks/`（失敗監視）
- `/apps/pdf/lib/commercialInvoiceTemplate.ts`（ヘッダ/署名反映）

## APPLY
1) **ステップ完了判定（⑧）**  
   - react-hook-form（または現行手段）で、**正規化→検証→保存200→dirty=false** を満たしたら `synced` 表示。  
   - `data-test="step1-status"|"step2-status"` を実装。

2) **サービス再選択導線（⑨）**  
   - `/review` に「サービスを変更」ボタン。  
   - クリックで `/services?from=review&forceShow=1`。  
   - 直前選択サービスを**強調**（選択中バッジ）、レート再取得→`/review` で**再計算**反映。

3) **表記変更（「仕向地」→「お届け先（国／地域）」）**  
   - UI/i18n辞書を一括置換。  
   - 帳票は「送り先（国／地域）」を使用（英語は Destination）。  
   - `tests/e2e/i18n_labels.spec.ts` 更新。

4) **レタヘ/署名強制（⑩）**  
   - `FORCE_PHOENIX_LETTERHEAD/SIGNATURE` ONでユーザー選択UIを**非表示**、  
     固定名 **"Phoenix Co., Ltd. Norio Yamaguchi"（1行）** 自動入力（編集不可）。  
   - PDFは**最上部にレターヘッド**、署名はフッター（既定右下）。

5) **キャンセル処理（⑪）**  
   - `SIMULATE_PAYMENT=true` で Square/FedEx 呼び出しを**スタブ**に切替（外部通信ゼロ）。  
   - UIからキャンセル→注文/請求/返金/送り状の状態遷移を一貫させる。  
   - 冪等キーで多重押下を防止。

6) **Webhook監視（⑬）**  
   - `/api/webhooks/error` を追加し、検証失敗/一時失敗をログ集約。  
   - リトライ・重複受信は冪等に処理。

## TEST（E2E）
- `tests/e2e/step_check_completion.spec.ts`：保存→✅点灯までの遷移  
- `tests/e2e/service_reselect_flow.spec.ts`：再選択→確認画面反映  
- `tests/e2e/i18n_labels.spec.ts`：「お届け先（国／地域）」が全画面に反映  
- `tests/e2e/stage3.invoice.force-on.spec.ts`：FORCE ON時のUI/出力制御  
- `tests/e2e/payment_cancel.spec.ts`：simulateでキャンセル処理一式  
- `tests/e2e/webhook_error_monitor.spec.ts`：再送・順不同・冪等確認

## RISK / GUARD
- 金額系は Wave1 の `charges-core` を**参照のみ**。UIからロジックに手を出さない。  
- Phoenix割引のラベル/位置/順序は**変更禁止**（スナップショットでCIガード）。  
- 変更前に必ず対象ファイルを探索→冒頭に「探索ログ」を残す。

## NEXT
- 本番設定の確認：FORCE_* / SIMULATE_* / Webhook鍵の切替手順をOps Runbookに追記。
