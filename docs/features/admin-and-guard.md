## 管理機能とガード（is_admin / role='admin' / サーバ側強制）

- **主な責務**: 管理画面・APIを管理者のみに許可し、サーバ側で厳格に制御。UIのチラつき/不整合を回避。

- **構造概要**:
  - **UI**: `src/app/admin/**`（`layout.tsx`, `page.tsx`, ユーザー一覧など）
  - **API**: `src/app/api/admin/**`（設定/アセット/ユーザー操作）
  - **lib**: `src/lib/auth/route.ts`（`requireAdminAuthRoute`）, `src/lib/auth/server-auth.ts`, `src/lib/auth/isAdmin.ts`
  - **ドキュメント**: `docs/admin-header-guard.md`

- **主な関数・ロジック**:
  - `requireAdminAuthRoute()` が `profiles(role,is_admin)` を照会し 401/403 を返却
  - SSRで `showAdminNav` を確定し、CSRで上書きしない。Headerは `initialAuth.user` を短時間保持
  - Admin APIは cookie-auth + RLS下でService Role不要の設計が基本（必要に応じ切替）

- **Supabase参照情報**:
  - `profiles`: `role`, `is_admin` による管理者判定
  - 関連RLS: `open_shipments`, `address_book` などで `Admin select` を許可する方針のマイグレーションあり

- **注意点・備考**:
  - `ADMIN_EMAILS` による上書きがある場合は、方針と実装の一貫性を確保
  - E2Eで管理ナビの可視性を継続検証（ログイン/リロード/トークン更新）
  - 管理APIはCSRF/署名検証が必要なもの（Webhook等）を除きCookie認証で十分


