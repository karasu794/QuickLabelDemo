# Guardrails（再発防止ルール集）

## 目的
開発中に踏みがちな地雷を**短句ルール**で固定化。静的解析/Askゲート/テストに反映。

## High（必ずブロック）
- route.ts から **直** supabase.from 呼び出し禁止（repo経由）
- repo 関数は **ctx を第一引数**に取る（未満はHigh）
- orgId/userId をフォームやURLから受け取らない（**サーバ起点**）
- TX **内**で外部API呼出し禁止（例外は理由明記）
- 公開APIの戻り値 ≠ Zod契約 → ブロック
- Service Role Key をクライアントで使わない

## Medium（要確認）
- Feature Flag（Release/Experiment）は**Cleanup期限必須**
- PDF生成は Noto Sans JP 使用
- Google Maps Autocomplete 初期化は useCallback

## Low（推奨）
- 管理UIはモバイルでカード化優先
- Idle Timeout: 管理15分 / 決済5分
- Persistent Login: 管理者は一時ログイン推奨

## 反映先
- 静的解析（第2案）
- Askゲート質問（第4案）
- 最小契約テスト（第6案）
- 週次ドリフト健診（第7案）
