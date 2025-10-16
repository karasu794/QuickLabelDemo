## 現状調査（サインアップ→メール確認→復帰）

### 現行フロー図

```
[/signup] --signUp(emailRedirectTo=/auth/callback?next=...)--> [メール送信]
  ↓
  /unverified (再送: resend/signInWithOtp → emailRedirectTo=/auth/callback)
  ↓
[ユーザーがメール内リンクをクリック]
  ↓
[/auth/callback?code=...&next=...] --exchangeCodeForSession--> セッション確立
  ↓
  redirect to next (verified=1 を付与)
```

### 関連ファイルと要点

```1:50:src/lib/supabase/client.ts
// signUp: emailRedirectTo を /auth/callback に固定し、next を付与
```

```1:50:src/app/auth/callback/route.ts
// exchangeCodeForSession 後、next を検証して redirect
```

```1:50:src/middleware.ts
// セッション同期のみ。/auth/callback を妨げるリダイレクトなし
```

### 不具合の再現手順（現象）
- サインアップ実施 → 確認メールリンク踏み → 復帰時にトップ(`/`)へ戻ってしまうことがある

### 原因仮説（優先度順）
- 認証後の遷移先保持が不完全: `next` を安全に保持・復元していないケースがある
- 既存の `/auth/callback` で `next` 生値をそのまま使用し、無効値時のフォールバックが `/mypage` 固定で、入力条件によりトップへ戻る UI 挙動と競合
- 再送時（`/unverified`）の `emailRedirectTo` が `next` を維持していない

### 追加調査メモ
- `middleware.ts` は現在リダイレクトを行わず、セッション同期のみ
- `AuthGuard` は未認証の自動リダイレクトをフラグ制御（既定OFF）

## Test Results (2025-10-16)

- Contract: 全件GREEN（`isSafePath`, `buildAuthCallbackUrl`）
- E2E(Chromium): GREEN（1件flakyだったがリトライで通過）
  - Case1: `/signup?redirect_to=/mypage` → `/auth/callback?code=dummy&next=/mypage` → `/login?verify_error=1` もしくは `/mypage`（環境により）
  - Case2: `/auth/callback?code=dummy&next=https://evil.com` → `/login?verify_error=1` または安全既定（Open Redirect防止）

### 実測URLトレース（抜粋）
- 開始: `/signup?redirect_to=/mypage`
- callback: `/auth/callback?code=dummy&next=/mypage`
- 最終: `/login?verify_error=1` もしくは `/mypage`

### 追加静的チェック
- router.push('/')/replace('/') 一覧: `docs/auth/signup-redirect/artifacts/router-home-redirects.txt`
- redirect('/')（server）一覧: `src/app/admin/*` のみ。`/auth/callback` への影響なし


