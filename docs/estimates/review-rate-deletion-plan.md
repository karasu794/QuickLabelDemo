## レビュー画面 見積り機能の死コード/不要分岐 削除計画

本ドキュメントは、ステップ①（自動発火停止）・②（レートUI非表示）後に残る「レビュー画面の見積り機能」由来コードの削除候補を整理し、安全な削除順序を提示します。

### 前提フラグ
- `NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES=true`（既定）: レビュー画面でのレート取得を停止
- `NEXT_PUBLIC_HIDE_REVIEW_RATE_UI=true`（既定）: レビュー画面でのレート/見積UIを非表示

---

## Phase C 完了（2025-10-23）

- 変更内容
  - `/api/rates/from-draft/[id]` ルートを削除（UI/コンポーネント/ライブラリから参照ゼロのため）
- 影響
  - 現行フロー（トップ/サービス/レビュー）は影響なし
  - `git grep -n "/api/rates/from-draft"` がヒットゼロであることを確認
- QAポイント
  - `/api/rates/from-draft/*` が 404（Not Found）になる
  - `pnpm -s tsc --noEmit` が成功

### 追記: Test&Repair pass（2025-10-23）
- `/api/quote`（含む `/api/quote/mps`）に E2E用のモックモード（Cookie `core-mode=mock` または `CORE_MODE=mock`）を追加し、スモーク実行時に最低1件以上のダミーレートを返せるようにした。
- 本番/実環境では Cookie を付与しない限り実レート経路が使われるため、モックが漏れないことを確認。

### 1) 参照グラフ（呼び出し元/先/利用ファイル数）

| Symbol/File | Used by（呼び出し元） | 呼び出し先 | 他ページ利用 | 備考 |
|---|---|---|---:|---|
| `fetchActualRates`（`src/app/shipping/new/review/page.tsx`） | review/page 内 useEffect（現状 flag で return） | `/api/quote`, `/api/quote/mps` | いいえ | フラグONで不実行。状態: `actualShippingRates`, `ratesLoading`, `ratesError` は UI 非表示により実質未使用に近い |
| QuotePickerShared（`src/components/quotes/QuotePickerShared.tsx`）の `draftId` 経路 | review/page（flagでUI非表示/自動取得停止）、他ページ（トップ） | `getRatesForDraft` | あり（トップ側） | コンポーネント自体は共通。レビュー専用のドラフト自動取得分岐は停止済み |
| `getRatesForDraft`（`src/lib/rates/getRatesForDraft.ts`） | QuotePickerShared（draftIdモード） | `/api/rates/from-draft/:id` | あり（将来流用の可能性） | 現状レビューからは呼ばれない（UI非表示＋hook側ゲート） |
| `/api/rates/from-draft/[id]` | `getRatesForDraft` | FedEx Rate API（lib） | 不明（現状レビュー起点が主） | 他画面が使っていないか要確認（grep結果ではUI直呼びは無） |
| `/api/quote`（POST） | トップ見積/レビュー（停止済み） | ジョブ作成→process | あり（トップ見積） | 削除対象外 |
| `/api/quote/mps`（POST） | レビュー（停止済み） | `getFedExRates` | 不明（主にレビュー起点） | 既にレビューからは発火しない。トップで未使用なら将来削除候補 |
| `setSelectedRate` 書込み（レビュー起因） | QuotePickerSharedの onSelect/onConfirmed | Zustand | あり | UIが非表示のためレビュー起点では発火しない。ストア自体は他で利用 |

補足: grep結果（抜粋）
- `fetchActualRates` 定義: `src/app/shipping/new/review/page.tsx` のみ
- `QuotePickerShared` 利用: `src/app/shipping/new/review/page.tsx`, `src/app/page.tsx`
- `getRatesForDraft` 参照: `src/components/quotes/QuotePickerShared.tsx`, `src/lib/rates/getRatesForDraft.ts`
- `/api/rates/from-draft` 参照: `src/lib/rates/getRatesForDraft.ts` のみ（UIからの直参照なし）
- `/api/quote` 系参照: `src/app/shipping/new/review/page.tsx`, `src/app/page.tsx`, `src/lib/polling/useQuoteJobPolling.ts`, `src/app/api/quote/route.ts`

---

### 2) 共有/流用の有無の判定
- QuotePickerShared はトップページでも使用。削除対象は「レビュー専用分岐（draftId自動取得やレビュー固有UI）」に限定。
- `/api/quote` はトップ見積の主経路のため削除不可。`/api/quote/mps` はレビュー専用色が強く、トップ側未使用なら将来的に統合/削除可。
- `getRatesForDraft` と `/api/rates/from-draft/:id` はドラフト経由の見積導線。現状レビューからは遮断済みだが、他画面導線がなければ段階的縮退が可能。

---

### 3) 削除候補リスト（優先度順・段階）

| Phase | Symbol/File | Safe to remove | 根拠・注意 |
|---|---|---|---|
| A | review内の `quotePickerRates` 生成・`actualShippingRates`/`ratesLoading`/`ratesError` 周辺描画分岐（UI非表示時に未到達） | 条件付き | `isReviewRateUiHidden()` が既定ONのため未到達。将来再利用予定が無ければ段階的に削除可 |
| A | review内 `fetchActualRates` とそれに紐づく `useEffect`（flagでreturn） | 条件付き | 既に実行停止。UI非表示により利用価値が薄い。削除で挙動不変 |
| B | QuotePickerShared の `draftId` 自動取得分岐（useEffectのゲート部） | 条件付き | レビュー専用用途がなくなったため簡素化可能。ただしトップ流用影響を手動QAで確認 |
| B | `getRatesForDraft.ts` | 条件付き | 参照が QuotePickerShared のみで、draftId導線を閉じるなら縮退/削除可能。将来のドラフト導線要件があれば温存 |
| C | `/api/rates/from-draft/[id]` | 条件付き | 上記と連動。外部/管理画面からの利用がなければ最終段で削除 |
| C | `/api/quote/mps` | 条件付き | トップ未使用が確認できたら `/api/quote` に統合しMPSロジックを別実装に移行後に削除 |

削除は Phase A→B→C の順で実施。各Phase間でビルド・E2E・ネットワーク確認を挟む。

---

### 4) テスト影響（棚卸し）

| テスト | 影響 | 対応 |
|---|---|---|
| `tests/e2e/review_quote_select_flow.spec.ts` | レートUI非表示で常時skip中 | 恒久不要なら削除候補（Phase B以降） |
| `tests/e2e/review_quote_position.spec.ts` | 同上 | 同上 |
| `tests/e2e/issue_block_on_unselected.spec.ts` | 同上 | 同上 |
| `tests/contracts/rates.source.contract.test.ts` | `getRatesForDraft` 依存 | Phase B/C で機能縮退時に合わせて削除/置換 |
| `tests/e2e/review_hide_rate_ui.spec.ts` | 継続 | レートUI非表示の回帰として維持 |

---

### 5) 削除手順（提案）

1. Phase A（レビュー画面内の死コード整理）
   - `src/app/shipping/new/review/page.tsx`
     - `fetchActualRates` 関連（関数・state・effect）の削除
     - `quotePickerRates` と `QuotePickerShared` 系の分岐・propsの削除
     - `actualShippingRates`/`ratesLoading`/`ratesError` の状態と依存描画の削除
   - 根拠: UI非表示＋取得停止により未到達。ビルド・型で欠落検知可能。

2. Phase B（共通コンポーネントのレビュー専用分岐除去）
   - `src/components/quotes/QuotePickerShared.tsx`
     - `draftId` 自動取得分岐の簡素化（レビュー由来のゲート削除）
   - `src/lib/rates/getRatesForDraft.ts`
     - 使用箇所が無い場合は削除。ある場合はユースケース限定で温存。
   - テスト: `tests/contracts/rates.source.contract.test.ts` を削除/置換。

3. Phase C（API ルートの縮退）
   - `src/app/api/rates/from-draft/[id]/route.ts` を削除（他利用が無い前提）
   - `src/app/api/quote/mps/route.ts` を `/api/quote` に統合 or 非使用確認後削除

---

### 6) 影響ゼロの根拠
- フィーチャーフラグ既定ON（`NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES`, `NEXT_PUBLIC_HIDE_REVIEW_RATE_UI`）で、レビューからの発火/表示が完全停止している。
- トップ見積は `/api/quote`（標準）経路を使用し続けるため影響外。
- Zustand `selectedRate` は他導線（トップ見積→フォーム）で利用。レビュー起点の書込みが消えても他導線は維持。

---

### 7) ロールバック方針
- いずれのPhaseでも、削除前コミットに戻せば動作復帰可能。
- Phase A, B はフロント専用差分のためリスク小。Phase C はAPIのため切り戻し手順を別途準備。

---

### 附: 追加の観測ポイント
- `src/lib/polling/useQuoteJobPolling.ts` はトップ見積のジョブ監視で利用。レビュー停止と独立だが、参照漏れがないか確認済み。

---

## Phase A 実行結果（このコミット）

- 削除/縮退（review/page.tsx）
  - `fetchActualRates` 関数・関連 useEffect を削除
  - `actualShippingRates` / `ratesLoading` / `ratesError` / `quotePickerRates` 関連ロジックを削除
  - `QuotePickerShared` の分岐ブロックを UI 非表示フラグ時に非レンダ（最終的に null）へ単純化
  - 価格ブロックは `selectedRate` 未選択時に `—` 表示
- 保持（Phase B/C で再評価）
  - `getRatesForDraft`、`/api/rates/from-draft/[id]`、`/api/quote/mps` は現状維持
  - `QuotePickerShared` は `@deprecated` 明記のみ（機能は温存）

影響確認（根拠）
- `pnpm -s tsc --noEmit` パス（ビルド契約テスト追加）
- `/shipping/new/review` で `/api/(quote|rates)` が発火しないことを継続確認
- トップ見積（`/`）の見積→選択→フォーム流入が従来通りであること

---

## Phase B 完了（2025-10-23）

- 変更内容
  - `QuotePickerShared` を props 駆動に簡素化（`draftId`/`onConfirmed` を削除）
  - `getRatesForDraft.ts` を削除（参照ゼロ化）
  - 契約テスト `tests/contracts/rates.source.contract.test.ts` を削除
- 影響
  - 現行UI（トップ/サービス）は `rates` props 経路のみ利用のため影響なし
  - `/api/rates/from-draft/[id]` は Phase C で扱う（このフェーズでは未変更）
- QAポイント
  - `pnpm -s tsc --noEmit` が成功
  - トップ/サービスで見積結果の選択・遷移が従来通り

## Phase A 完了（2025-10-23）

- 削除ファクト（review/page.tsx）
  - `actualShippingRates` / `ratesLoading` / `ratesError` / `quotePickerRates` を完全削除
  - 旧ローディング/エラー分岐（`calculations.isLoading` 等の幽霊参照）を撤去
  - 見積UIプレースホルダは維持（旧シンボル非参照を確認）
- テスト整備
  - レビュー見積カード前提のE2Eをすべて `test.skip` に統一し、先頭に deprecate コメントを追加
  - `review_hide_rate_ui.spec.ts` は維持
- QAポイント
  - `/shipping/new/review` で `/api/(quote|rates)` のネットワーク発火がないこと
  - `selectedRate` 未選択時は価格サマリが「—」のまま
  - `pnpm -s tsc --noEmit` が成功


