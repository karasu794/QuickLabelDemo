## Ask Gate (立ち止まるための質問集)

本リストは `/docs/ARCHINDEX.md`・`/docs/Guardrails.md`・`/docs/Release-Runbook.md`・`/docs/SLO-SLI.md`・`/docs/feature-flags.md`・`/docs/CURSOR_WORKFLOW.md` を前提に、破壊的変更・契約差分・不整合リスクがある際に確認すべき質問をまとめたものです。

## API / DB 契約
- この変更は既存のAPIレスポンス/リクエストを壊していないか？
- Zodスキーマや型定義と差分が出ていないか？
- 参照しているARCHINDEXの契約と矛盾していないか？

## 認証 / 認可
- requireAuth / requireAdminAuth の判定条件に変更があるか？
- 認証まわりのエラー返却（401/403）はGuardrailsに従っているか？

## データ / 永続化
- スキーマ変更が既存データを壊さないか？
- マイグレーションは双方向（up/down）に対応できるか？
- NULL許容や既存値保持ルールを満たしているか？

## 外部サービス連携
- FedExやSupabaseなどの外部API契約を壊していないか？
- TX内で外部呼び出しをしていないか（Guardrails参照）？

## フロントエンド / UI
- SSRとCSRでセッション状態に矛盾が出ていないか？
- GuardrailsのUIルール（カード化優先など）を破っていないか？

## 運用 / ドキュメント
- Release-Runbookに更新が必要な変更か？
- SLO-SLIを満たせなくなる変更か？
- feature-flagsで管理すべき範囲か？

### 適用範囲の注記（今回の修正）
- 互換性破壊やDBスキーマ変更が必要な場合のみ ASK の審査対象。
- Supabaseクライアントのラッパ統一／型抽出による循環解消／E2Eのスモーク化は挙動非破壊のため ASK 対象外。

## セーフティ / ログ
- 失敗時にロールバックや再試行ができるか？
- logInfo/logError に十分な情報が残るか？
- ALERT_WEBHOOK_URL の通知対象に含める必要があるか？
