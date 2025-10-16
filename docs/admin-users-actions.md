# Admin: Users Actions（削除／永久停止／一時停止・再開）

## 概要
- 管理者が `/admin/users` から以下の操作を行える:
  - 削除（論理削除）
  - 永久停止（ban）
  - 一時停止（suspend） / 再開（resume）
- UI表示・APIの判定・RLS条件が一貫する設計。

## データモデル
- profiles に管理列を追加
  - `is_banned boolean not null default false`
  - `suspended_until timestamptz null`
  - `deleted_at timestamptz null`
- 補助ビュー
  - `v_is_active_user`: `deleted_at is null AND is_banned = false AND (suspended_until is null OR suspended_until < now())`

## API
- `POST /api/admin/users/[id]/ban` `{ reason? }`
- `POST /api/admin/users/[id]/suspend` `{ until: ISO string, reason? }`
- `POST /api/admin/users/[id]/resume`
- `DELETE /api/admin/users/[id]` `{ reason? }`
- 共通: `requireAdminAuthRoute()` ガード + Service Role で更新。成功レスポンスは `{ ok: true }`。
- 監査: 各操作で `admin_actions` に1件記録。

## 監査ログ
- `admin_actions(actor_id, target_user_id, action, reason, payload, created_at)`
- action in ('ban','suspend','resume','delete')

## UI / data-test
- 行内ボタン: `user-delete`, `user-ban`, `user-suspend`, `user-resume`
- 確認モーダル: `confirm-*`
- 入力: `input-reason`, `input-suspend-until`
- トースト: `toast-success`, `toast-error`
- 行 root: `user-row`

## テスト
- 契約: 401/403/200、DB状態・監査件数検証（`tests/contracts/admin.users.actions.contract.test.ts`）
- E2E: 行ボタン → モーダル → トースト → 再描画（雛形要件記載）

## リリース手順（抜粋）
1. DB マイグレーション適用（`20251012_admin_user_actions.sql`）
2. アプリデプロイ（APIとUIの同時反映）
3. スモーク: 管理者で /admin/users → 各操作 → `admin_actions` 記録確認
4. ロールバック: UI 非表示（flag）、API 一時403、RLSは `v_is_active_user` 条件を戻す

## 運用チェック（QA）
- 管理者のみ /admin/users へアクセス可能
- 行アクションが状態に応じて表示（suspend ↔ resume の出し分け）
- 確認/入力/実行/成功トースト/再描画の一連が成立
- 監査記録が1件追加
- `suspended_until` 経過後は自動ACTIVE
- 論理削除ユーザーは通常の一覧/参照から除外
