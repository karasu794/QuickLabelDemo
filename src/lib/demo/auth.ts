/**
 * デモ認証モジュール
 *
 * デモモード時にSupabase/DBアクセスなしでローカル認証を提供する。
 * プロダクション認証には一切影響しない。
 */

import type { User, Session } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Demo mode detection
// ---------------------------------------------------------------------------

export const isDemoMode =
  process.env.NEXT_PUBLIC_APP_ENV === 'demo' || process.env.APP_ENV === 'demo'

// ---------------------------------------------------------------------------
// Demo user model
// ---------------------------------------------------------------------------

export interface DemoUser {
  id: string
  email: string
  name: string
  role: 'demo' | 'admin'
}

const DEMO_USERS: Record<string, DemoUser> = {
  user: {
    id: 'demo-user-00000000-0000-0000-0000-000000000001',
    email: process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@example.com',
    name: 'Demo User',
    role: 'demo',
  },
  admin: {
    id: 'demo-admin-00000000-0000-0000-0000-000000000002',
    email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'demo-admin@example.com',
    name: 'Demo Admin',
    role: 'admin',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** デモユーザーかどうかを判定 */
export function isDemoUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  return Object.values(DEMO_USERS).some((u) => u.id === userId)
}

/** デモモードでサインアップが許可されるか */
export function canUseSignup(): boolean {
  return !isDemoMode
}

/** メールアドレスからデモユーザーを解決 */
export function resolveDemoUser(email: string): DemoUser | null {
  return Object.values(DEMO_USERS).find((u) => u.email === email) ?? null
}

/** デフォルトのデモユーザーを取得 */
export function getDefaultDemoUser(): DemoUser {
  return DEMO_USERS.user
}

// ---------------------------------------------------------------------------
// Demo session creation (Supabase-compatible shape)
// ---------------------------------------------------------------------------

/** Supabase User 互換のデモユーザーオブジェクトを生成 */
export function createDemoSupabaseUser(demoUser: DemoUser): User {
  const now = new Date().toISOString()
  return {
    id: demoUser.id,
    email: demoUser.email,
    app_metadata: { provider: 'demo', role: demoUser.role },
    user_metadata: { name: demoUser.name, role: demoUser.role },
    aud: 'authenticated',
    created_at: now,
    updated_at: now,
    email_confirmed_at: now,
    confirmed_at: now,
    role: 'authenticated',
  } as unknown as User
}

/** Supabase Session 互換のデモセッションを生成 */
export function createDemoSession(demoUser?: DemoUser): Session {
  const user = demoUser ?? getDefaultDemoUser()
  const supabaseUser = createDemoSupabaseUser(user)
  return {
    access_token: `demo-access-token-${user.id}`,
    refresh_token: `demo-refresh-token-${user.id}`,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: supabaseUser,
  } as Session
}

// ---------------------------------------------------------------------------
// Local session persistence (browser only)
// ---------------------------------------------------------------------------

const DEMO_SESSION_KEY = 'fql_demo_session'

/** デモセッションをlocalStorageに保存 */
export function persistDemoSession(session: Session): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
  } catch {
    // localStorage unavailable — session will be in-memory only
  }
}

/** localStorageからデモセッションを復元 */
export function loadDemoSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

/** デモセッションをクリア */
export function clearDemoSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Demo login / logout (client-side entry points)
// ---------------------------------------------------------------------------

export interface DemoLoginResult {
  ok: true
  session: Session
  user: User
}

/**
 * デモログインを実行（Supabaseを一切呼ばない）
 * email が指定された場合、対応するデモユーザーを使用。
 * 未指定の場合はデフォルトデモユーザーを使用。
 */
export function demoLogin(email?: string): DemoLoginResult {
  const demoUser = email ? resolveDemoUser(email) ?? getDefaultDemoUser() : getDefaultDemoUser()
  const session = createDemoSession(demoUser)
  persistDemoSession(session)
  return { ok: true, session, user: session.user }
}

/** デモログアウト */
export function demoLogout(): void {
  clearDemoSession()
}
