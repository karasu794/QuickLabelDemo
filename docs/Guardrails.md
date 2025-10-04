# Guardrails（再発防止ルール集）

## 目的
開発中に踏みがちな地雷を**短句ルール**で固定化。静的解析/Askゲート/テストに反映。

## High（必ずブロック）
- サーバのSupabase生成は `@/lib/supabase/server` のラッパを使用すること（`createServiceRoleClient` / `createRouteHandlerClient` 等）。`@supabase/supabase-js` の直 import と直接生成は禁止。
- route.ts から **直** supabase.from 呼び出し禁止（repo経由）
- repo 関数は **ctx を第一引数**に取る（未満はHigh）
- orgId/userId をフォームやURLから受け取らない（**サーバ起点**）
- TX **内**で外部API呼出し禁止（例外は理由明記）
- 公開APIの戻り値 ≠ Zod契約 → ブロック
- Service Role Key を**クライアントで使用禁止**（Vercel 環境変数でも漏洩しない設計）
- PDF 生成で**外部フォント未設定**のままリリースしない（Noto Sans JP 必須）
- Supabase 認証URLは dev/prod で固定化（環境に依存させない）
- /api/ship/create の**冪等性なし**実装（`order_id` + advisory lock 必須）
- 外部API（FedEx）を**トランザクション内**で呼ぶ実装

## Medium（要確認）
- Vercel 環境変数は dev/prod を**明示分離**（同名キーの上書き混入を避ける）
- PDF 生成のタイムアウト/メモリ上限に対して**ページ分割 or 遅延処理**方針を選定
- Feature Flag（Release/Experiment）は**Cleanup期限必須**
- Google Maps Autocomplete 初期化は useCallback
- 認証メールは日本語化済みテンプレートを維持
- 重複メール登録は silent fail → クライアント側で検知必須
- モバイルでは**カード化優先**、横スクロールテーブルは最終手段
- 管理テーブルは列数>6で**表示分割 or スタック**を検討
- Idle Timeout: 管理15分 / 決済5分を維持（環境により例外はPRで承認）
- Supabase重複メールは**UIで明示的に検知**（silent failを放置しない）
- Google Maps Autocomplete の初期化は **useCallback** で包む（再レンダ時の二重初期化防止）
- 住所入力のフォーカス移動時は **debounce/cleanup** を入れる（イベント多重発火でバリデーション崩れを防止）
- フォームの reset/submit 直後は **router.refresh() を即時呼ばない**（セッション未同期のちらつき防止）

## Low（推奨）
- 管理UIはモバイルでカード化優先
- Persistent Login: 管理者は**一時ログイン**、一般は長期OK（端末信頼設定あり）
- UIエラーは **トースト＋ロールバック**、ページ全体のリロード禁止

## 反映先
- 静的解析（第2案）
- Askゲート質問（第4案）
- 最小契約テスト（第6案）
- 週次ドリフト健診（第7案）
