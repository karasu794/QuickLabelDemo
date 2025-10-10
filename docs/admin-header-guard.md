# Admin Header Guard — 運用方針

## 背景
管理者ログイン時、ヘッダーの「管理者ページ」リンクが一時的に消えるフリッカーが発生していた。原因は初回CSRで `supabase.auth.getSession()` が `null` を返す瞬間に `setUser(null)` で SSR の認証済み状態を上書きしていたこと。

## 方針（不変ルール）
- `showAdminNav` は SSRで確定（`getAdminContext()`）し、クライアントで上書きしない（read-only）。
- `HeaderClient` は初回CSRで `session===null` の場合に user を null へ落とさない（SSRの `initialAuth.user` を保持）。
- APIの管理者判定は `role==='admin' OR is_admin===true` を許容し、UIと一致させる。

## 実装要点
- `src/components/header/HeaderServer.tsx`: SSRで `showAdminNav` を決定。
- `src/components/header/HeaderClient.tsx`: `effectiveUser = user ?? initialAuth.user` を短時間使用し、`showAdminNav` は props-only。
- `src/lib/auth/route.ts`: `requireAdminAuthRoute()` は `select('role,is_admin')`、両条件を許容。

## テスト
- `tests/e2e/admin_header.spec.ts`
  - admin: 可視性が常時維持（遷移/リロード/トークン更新）
  - member/guest: 非表示
- CI: `.github/workflows/e2e-admin-header.yml` にて PR 必須ジョブ化
- 失敗時アーティファクト:
  - `test-results/**/trace.zip`, `playwright-report/`

## 運用チェックリスト
- [ ] 新たなクライアント認証フロー追加時、`showAdminNav` を上書きしていないか
- [ ] `profiles` の `role/is_admin` 仕様を変更した場合、`isAdmin.ts` と API ガードも更新
- [ ] E2E adminケース用の CI Secrets（`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`）は最新のテスト用ユーザーと一致


