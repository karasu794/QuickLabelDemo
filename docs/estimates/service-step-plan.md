## サービス別見積ステップ（Step5）挿入 設計メモ

本資料は、現行ウィザードに「5: サービス別見積」を挿入し、4→5→6→7 の新順序に差し替えるための実装材料です。

---

### 1) 現行ステップ定義/順序・画面パス

- ステップ配列（表示用ナビ）: `src/app/shipping/new/layout.tsx`
  - 現行: 1) `/shipping/new/shipper` 2) `/shipping/new/recipient` 3) `/shipping/new/packages` 4) `/shipping/new/contents` 5) `/shipping/new/review` 6) `/shipping/new/success`
  - Guard参照: `useShippingFormStore().isStepCompleted(stepHref)` を用いて完了マークの表示

- 遷移例（4→5）: `src/app/shipping/new/contents/page.tsx`
  - `handleSubmit` で `setItems` 後に `router.push('/shipping/new/review')`

- ステップ完了管理（Zustand）: `src/store/shippingFormStore.ts`
  - `completedSteps: string[]`
  - `markStepCompleted(stepPath)` / `isStepCompleted(stepPath)`
  - `selectedRate: SelectedRate | null`（サービス選択結果の保持）

---

### 2) 遷移ガード/直リンクガード（実体）

- 直リンク抑止は各ページ個別に実装（例: `useWaitForHydration` 経由の条件分岐、`isUS` によるHTS分岐など）。
- ステップ完了チェックは主にサイドナビ表示（`layout.tsx`）での完了表示に使用。ページ遷移自体の厳格ガードは弱め。必要に応じてページ側に簡易ガード導入可。
- `markStepCompleted` 呼出: 現行では「確認完了時」に `/shipping/new/review` で呼び出し（決済後）。中間ステップ完了（例: contents 完了）では未呼出のため、新ステップ導入時に適切な位置で付与する。

---

### 3) 料金・サービス選択の保持先

- Zustand の `selectedRate` を継続利用（構造: `serviceName`, `amount`, `currency`, `serviceType?`, `transitTime?`）。
- 永続化: `persist(partialize)` に含まれており、ブラウザ再訪でも維持される。
- ドラフト/DB への確定保存（PUT `/api/drafts/:id/service`）は `QuotePickerShared` のドラフトモードが保持。新ステップでは props 渡し（rates配列）中心で、ドラフト統合は後段検討。

---

### 4) 既存APIの利用想定（新Step5）

- 単品: POST `/api/quote`（ジョブ作成→結果ポーリング）
- 複数口（必要に応じて）: POST `/api/quote/mps`（即時計算）
- ドラフト取得由来: GET `/api/rates/from-draft/:id` は「使わない」方針（レビュー起点での導線は既に停止）。
- トップ見積との共有: 料金レスポンス→`FedExRate` への変換は既存 `FedExQuoteResults`/`QuotePickerShared` の入力形式に寄せる（DTO/adapter最小）。

---

### 5) 新旧ステップマッピングと追加Route

| 現行 | 新ステップ | 画面パス | 備考 |
|---|---|---|---|
| 1: 荷送人情報 | 1: 荷送人情報 | `/shipping/new/shipper` | 変更なし |
| 2: 荷受人情報 | 2: 荷受人情報 | `/shipping/new/recipient` | 変更なし |
| 3: 荷物情報 | 3: 荷物情報 | `/shipping/new/packages` | 変更なし |
| 4: 内容品の詳細 | 4: 内容品の詳細 | `/shipping/new/contents` | 変更なし（USは `/contents/hts` 経由） |
| 5: 確認 | 5: サービス別見積（新） | `/shipping/new/service` | 新規ページ（QuotePickerShared を rates props で利用） |
| 6: 完了 | 6: 確認 | `/shipping/new/review` | 既存レビュー（レートUI非表示のまま）。Step5からの選択結果（selectedRate）を前提に表示 |
| - | 7: 完了 | `/shipping/new/success` | 変更なし |

追加Route/コンポーネント（最小）
- 追加: `src/app/shipping/new/service/page.tsx`（新規）
  - 役割: 条件入力（既存ストアの shipper/recipient/packages/items）から見積を実行し、`QuotePickerShared` に rates を props 渡しで表示。選択で `selectedRate` を保存し `markStepCompleted('/shipping/new/service')` の上で `/shipping/new/review` へ遷移。
  - UI: ルート要素 `data-test="service-step-root"`、カード `data-test="quote-card"`（既存再利用）、選択ボタン `data-test="quote-select"`。
  - API: `/api/quote`（単品）/`/api/quote/mps`（必要時）

---

### 6) 遷移ガード（変更点）

- `contents` → `service`: `ContentsForm.onSubmit` で `router.push('/shipping/new/service')` に変更。`markStepCompleted('/shipping/new/contents')` は `onSubmit` 直後に付与可（必要であれば）
- `service` → `review`: `selectedRate` が falsy の場合は `review` に進めない。`service` ページで選択確定時に `setSelectedRate` と `markStepCompleted('/shipping/new/service')` を実行し、`/shipping/new/review` へ
- `review`（確認）: 既存通り、決済完了時に `markStepCompleted('/shipping/new/review')`

---

### 7) 必要な store キー（再確認）

- 継続利用: `selectedRate`
- 追加の検討（任意）: `selectedServiceLabel`（表示名キャッシュ）
- ステップ完了: `completedSteps` に `/shipping/new/service` を追加して管理

---

### 8) 最小実装案

- ルート追加: `/shipping/new/service`
- ページ実装: ServiceStepShell（新規） + `QuotePickerShared`（props 渡しモード）
- 既存からの流用:
  - `FedExQuoteResults`（表示）
  - `QuotePickerShared`（選択時に `setSelectedRate` を呼び、`onSelectRate` 経由で review へ）
  - 料金取得ロジック: `review/page.tsx` で削除した `fetchActualRates` の要領を service ページに移植（ただしフラグ対象外）

---

### 9) 既存テストの移設候補

- `tests/e2e/review_quote_select_flow.spec.ts` → Step5 へ（サービス選択 UI）
- `tests/e2e/review_quote_position.spec.ts` → Step5 へ（quote vs price の配置は Step5 のみで検証）
- `tests/e2e/issue_block_on_unselected.spec.ts` → Step5 へ（未選択時の進行不可）

---

### 10) 手動QA 雛形

1. `/shipping/new/contents` でフォーム送信 → `/shipping/new/service` へ遷移
2. `/shipping/new/service` で見積が動作し、カード選択で `selectedRate` が保存される
3. `selectedRate` 未選択のまま `review` に直アクセスすると、ガードにより戻される（または案内が出る）
4. 選択済みで `/shipping/new/review` を開くと、価格ブロックが `selectedRate` を元に表示され、決済に進める
5. 成功フローで `/shipping/new/success` に到達


