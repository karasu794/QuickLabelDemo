# 管理UIフローと権限対応（SpecWriter用）

本書は管理UIの主要フローを、RLS/権限条件と対応付けて要約したものです。一次情報に基づき、未確定は TODO とします。

## 前提

- 管理ナビ可視性は SSR 決定、CSRで上書きしない（`docs/admin-header-guard.md`）。
- 管理者判定: `role==='admin' OR is_admin===true`（UI/APIで一致）。
- RLSは admin=SELECT only、owner=CRUD、service_role=FULL（テーブル別は `rls-policies.md`）。

## 主要フロー

### 管理ヘッダー表示

- ルート: ヘッダーの `管理者ページ` リンク表示
- ガード: SSR で `showAdminNav` を確定。CSR初回の `session===null` で上書きしない。
- 失敗時: 一時的な不可視（フリッカー）。→ 実装は SSR props-only。

### 管理ユーザー操作（/admin/users）

- 操作: 削除, 永久停止(ban), 一時停止(suspend), 再開(resume)
- API: `POST /api/admin/users/[id]/(ban|suspend|resume)`, `DELETE /api/admin/users/[id]`
- UIセレクタ: `user-delete`, `user-ban`, `user-suspend`, `user-resume`, `confirm-*`, `user-row`
- 監査: `admin_actions` に記録（action: 'ban'|'suspend'|'resume'|'delete'）
- 失敗時: 403（非管理者）/ バリデーションエラー / DBエラー

### 管理設定（Phoenix 資産強制ON）

- API: `GET/POST /api/admin/settings`（DB `app_settings` を upsert）
- トグル: `FORCE_PHOENIX_LETTERHEAD`, `FORCE_PHOENIX_SIGNATURE`
- ガード: 管理者のみ（`role` or `is_admin`）
- キャッシュ: `Cache-Control: private, max-age=60`

## ルーティングガード

- Dev/診断APIはミドルウェアで Bearer `ACTIONS_TOKEN` を要求（`src/middleware.ts`）。
- 一般管理ページは SSR 判定によりリンク導線のみ可視化（クライアント側の再判定は行わない）。

## 失敗時のUI

- 権限不足: 非可視 or トースト表示 → 既定画面へ戻す
- 操作失敗: `toast-error` を表示し、リトライ導線を案内

---

### Sources

- `docs/admin-header-guard.md`
- `docs/admin-users-actions.md`
- `src/app/api/admin/settings/route.ts`
- `src/middleware.ts`

Last-Verified: 2025-10-20
