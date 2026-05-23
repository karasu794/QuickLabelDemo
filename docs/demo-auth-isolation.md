# Demo Auth Isolation

## Overview

When demo mode is enabled (`NEXT_PUBLIC_APP_ENV=demo`), the authentication flow is handled entirely locally. **No Supabase Auth or database access is performed during demo login, signup attempts, or session initialization.**

Production mode continues to use Supabase authentication without any changes.

## Enabling Demo Mode

Set the following environment variables:

```env
APP_ENV=demo
NEXT_PUBLIC_APP_ENV=demo
```

These are already configured in `.env.vercel-demo.template` and `.env.local` (when using the demo configuration).

## Demo Login Behavior

### One-Click Demo Login

In demo mode, the login page displays dedicated "デモとしてログイン" buttons:

- **👤 デモユーザーとしてログイン** — Logs in as a standard demo user
- **🔧 デモ管理者としてログイン** — Logs in as a demo admin

These buttons perform a fully local login without any network requests to Supabase.

### Credential-Based Demo Login

The standard email/password form also works in demo mode, but only accepts the pre-configured demo credentials:

- Demo User: `NEXT_PUBLIC_DEMO_USER_EMAIL` / `NEXT_PUBLIC_DEMO_USER_PASSWORD`
- Demo Admin: `NEXT_PUBLIC_DEMO_ADMIN_EMAIL` / `NEXT_PUBLIC_DEMO_ADMIN_PASSWORD`

The server-side `/api/auth/sign-in` route validates credentials locally without calling Supabase.

## Signup Disabled

In demo mode:

- The signup link is hidden from the login page
- Navigating directly to `/signup` shows a clear message: "デモ版では新規登録はできません"
- The signup form's submit handler rejects submissions with a local error
- No Supabase `signUp` call is made

## Session Management

### Client-Side

- Demo sessions are stored in `localStorage` under the key `fql_demo_session`
- The `AuthProvider` initializes from localStorage in demo mode (no `supabase.auth.getUser()` call)
- Sign-out clears localStorage (no `supabase.auth.signOut()` call)

### Server-Side

- The root layout skips `getSession()` in demo mode (returns `null`)
- Middleware skips `supabase.auth.getSession()` refresh in demo mode
- The `VerifiedGuard` already skips email verification checks in demo mode

## Demo User Model

```typescript
const demoUser = {
  id: "demo-user-00000000-0000-0000-0000-000000000001",
  email: "demo-user@fql-demo.example.com",
  name: "Demo User",
  role: "demo",
}
```

Demo users:
- Do not depend on Supabase user IDs
- Do not require a profile row
- Do not trigger profile creation or lookup
- Have Supabase-compatible shapes for seamless integration with existing components

## Architecture

```
src/lib/demo/auth.ts          — Core demo auth module (no Supabase imports)
src/app/api/auth/sign-in/     — Route handler with demo mode interception
src/contexts/AuthContext.tsx   — AuthProvider with demo mode branch
src/app/login/LoginForm.tsx   — Login form with demo login buttons
src/app/login/page.tsx        — Login page (hides signup link in demo)
src/app/signup/page.tsx       — Signup page (blocked in demo mode)
src/app/signup/SignUpForm.tsx  — Signup form (rejects submission in demo)
src/middleware.ts             — Middleware (skips Supabase in demo)
src/app/layout.tsx            — Root layout (skips getSession in demo)
```

## Supabase Access Paths Isolated

The following Supabase/database access paths are guarded in demo mode:

| Path | Location | Demo Behavior |
|------|----------|---------------|
| `signInWithPassword` | `/api/auth/sign-in` | Local validation only |
| `getUser` | `AuthContext` init | Skipped, uses localStorage |
| `onAuthStateChange` | `AuthContext` | Not subscribed |
| `profiles` query | `AuthContext` admin check | Skipped |
| `signOut` | `AuthContext.signOut` | localStorage clear only |
| `getSession` | `layout.tsx` (server) | Returns null |
| `getSession` | `middleware.ts` | Skipped |
| `signUp` | `SignUpForm` | Blocked before call |

## Tests

Tests are located in `tests/unit/demo-auth.spec.ts` and `tests/unit/demo-auth-api.spec.ts`.

Run with:

```bash
pnpm test -- --testPathPattern="tests/unit/demo-auth"
```

Tests verify:
- Demo login succeeds without calling Supabase auth
- Demo login does not call profile/database lookup
- Signup is blocked in demo mode
- Non-demo emails are rejected
- Wrong passwords are rejected
- The `demo/auth.ts` module has no runtime Supabase imports
- Production auth behavior is preserved (Supabase mock not called in demo path)
