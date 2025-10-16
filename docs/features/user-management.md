## ユーザー管理（ログイン / MyPage / supabase.auth / profile拡張）

- **主な責務**: 認証（メール/パスワード）、プロフィール編集、管理者判定（role/is_admin）、MyPage 機能を提供。

- **構造概要**:
  - **UI**: `src/app/login/`（`LoginFormNew.tsx`/`LoginForm.tsx`）、`src/app/mypage/profile/page.tsx`
  - **API**: `src/app/api/auth/sign-in/route.ts`, `src/app/auth/callback/route.ts`
  - **Context**: `src/contexts/AuthContext.tsx`（状態・管理者フラグ検出）

- **主な関数・ロジック**:
  - サインインはRoute Handler経由でSSR Cookieを確立→クライアントの `supabase.auth.setSession` で同期
  - 管理者判定は `profiles(role,is_admin)` を読み取り、`role==='admin' OR is_admin=true` を許容
  - ヘッダーの管理ナビはSSRで確定しCSRで上書きしない（`docs/admin-header-guard.md`）

- **Supabase参照情報**:
  - テーブル: `profiles`（`auth.users(id)` FK）
  - 主要カラム: `id, email, full_name, company_name, phone_number, address_*`, `role`, `is_admin`
  - RLS: Profilesの既定方針に従い本人のみ編集、読み取りは用途に応じ制限

- **注意点・備考**:
  - フェーズドな新ログインUIフラグ: `NEXT_PUBLIC_ENABLE_NEW_LOGIN`
  - 利用規約/プライバシー同意はサインアップUIで強制（`src/lib/validators/auth.ts`）
  - 管理機能の可視性はSSR propsで固定、`HeaderClient` は `initialAuth` を尊重


