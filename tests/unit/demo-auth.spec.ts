/**
 * Demo Auth Isolation Tests
 *
 * Proves that demo login/signup/session initialization does NOT access
 * Supabase or the database.
 */

// Mock environment for demo mode
process.env.NEXT_PUBLIC_APP_ENV = 'demo'
process.env.APP_ENV = 'demo'
process.env.NEXT_PUBLIC_DEMO_USER_EMAIL = 'demo-user@fql-demo.example.com'
process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD = 'DemoUser2026!'
process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL = 'demo-admin@fql-demo.example.com'
process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD = 'DemoAdmin2026!'

import {
  isDemoMode,
  isDemoUser,
  canUseSignup,
  resolveDemoUser,
  getDefaultDemoUser,
  createDemoSession,
  createDemoSupabaseUser,
  demoLogin,
  demoLogout,
  persistDemoSession,
  loadDemoSession,
  clearDemoSession,
} from '@/lib/demo/auth'

describe('Demo Auth Module', () => {
  describe('isDemoMode', () => {
    it('returns true when NEXT_PUBLIC_APP_ENV=demo', () => {
      expect(isDemoMode).toBe(true)
    })
  })

  describe('canUseSignup', () => {
    it('returns false in demo mode', () => {
      expect(canUseSignup()).toBe(false)
    })
  })

  describe('resolveDemoUser', () => {
    it('resolves demo user by email', () => {
      const user = resolveDemoUser('demo-user@fql-demo.example.com')
      expect(user).not.toBeNull()
      expect(user!.role).toBe('demo')
      expect(user!.email).toBe('demo-user@fql-demo.example.com')
    })

    it('resolves demo admin by email', () => {
      const admin = resolveDemoUser('demo-admin@fql-demo.example.com')
      expect(admin).not.toBeNull()
      expect(admin!.role).toBe('admin')
    })

    it('returns null for unknown email', () => {
      expect(resolveDemoUser('unknown@example.com')).toBeNull()
    })
  })

  describe('getDefaultDemoUser', () => {
    it('returns a user with demo role', () => {
      const user = getDefaultDemoUser()
      expect(user.role).toBe('demo')
      expect(user.id).toBeTruthy()
      expect(user.email).toBeTruthy()
    })
  })

  describe('isDemoUser', () => {
    it('returns true for demo user IDs', () => {
      const user = getDefaultDemoUser()
      expect(isDemoUser(user.id)).toBe(true)
    })

    it('returns false for arbitrary IDs', () => {
      expect(isDemoUser('random-uuid')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isDemoUser(null)).toBe(false)
      expect(isDemoUser(undefined)).toBe(false)
    })
  })

  describe('createDemoSupabaseUser', () => {
    it('creates a Supabase-compatible user object', () => {
      const demoUser = getDefaultDemoUser()
      const supabaseUser = createDemoSupabaseUser(demoUser)

      expect(supabaseUser.id).toBe(demoUser.id)
      expect(supabaseUser.email).toBe(demoUser.email)
      expect(supabaseUser.aud).toBe('authenticated')
      expect(supabaseUser.email_confirmed_at).toBeTruthy()
      expect(supabaseUser.app_metadata).toEqual(
        expect.objectContaining({ provider: 'demo', role: demoUser.role })
      )
    })
  })

  describe('createDemoSession', () => {
    it('creates a Supabase-compatible session', () => {
      const session = createDemoSession()

      expect(session.access_token).toContain('demo-access-token')
      expect(session.refresh_token).toContain('demo-refresh-token')
      expect(session.token_type).toBe('bearer')
      expect(session.expires_in).toBe(86400)
      expect(session.user).toBeTruthy()
      expect(session.user.id).toBeTruthy()
    })

    it('accepts a specific demo user', () => {
      const admin = resolveDemoUser('demo-admin@fql-demo.example.com')!
      const session = createDemoSession(admin)

      expect(session.user.email).toBe('demo-admin@fql-demo.example.com')
      expect(session.user.app_metadata).toEqual(
        expect.objectContaining({ role: 'admin' })
      )
    })
  })

  describe('demoLogin', () => {
    it('returns a successful login result without calling Supabase', () => {
      const result = demoLogin('demo-user@fql-demo.example.com')

      expect(result.ok).toBe(true)
      expect(result.session).toBeTruthy()
      expect(result.user).toBeTruthy()
      expect(result.user.email).toBe('demo-user@fql-demo.example.com')
    })

    it('uses default demo user when no email provided', () => {
      const result = demoLogin()

      expect(result.ok).toBe(true)
      expect(result.user.email).toBe('demo-user@fql-demo.example.com')
    })

    it('does NOT import or call any Supabase module at runtime', () => {
      // This test verifies that demoLogin is self-contained.
      // Type-only imports (import type {...}) are acceptable as they have no runtime effect.
      const demoAuthSource = require.resolve('@/lib/demo/auth')
      const fs = require('fs')
      const content = fs.readFileSync(demoAuthSource, 'utf-8')
      // Must not have runtime imports from @supabase (type-only is OK)
      expect(content).not.toMatch(/import\s+{[^}]*}\s+from\s+['"]@supabase/)
      expect(content).not.toMatch(/require\(['"]@supabase/)
      expect(content).not.toMatch(/createClient/)
      expect(content).not.toMatch(/signInWithPassword/)
    })
  })

  describe('demoLogout', () => {
    it('clears demo session without calling Supabase', () => {
      // Just verifies it doesn't throw
      expect(() => demoLogout()).not.toThrow()
    })
  })
})

describe('Demo Auth - Supabase Isolation', () => {
  it('demo/auth.ts does not have runtime imports from @supabase packages', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.resolve(__dirname, '../../src/lib/demo/auth.ts')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Type-only imports are acceptable (no runtime effect)
    // Must not have runtime (non-type) imports from @supabase
    expect(content).not.toMatch(/import\s+{[^}]*}\s+from\s+['"]@supabase/)
    expect(content).not.toMatch(/require\(['"]@supabase/)
    // Must not call Supabase methods
    expect(content).not.toMatch(/supabase\.auth/)
    expect(content).not.toMatch(/supabase\.from/)
  })

  it('demo/auth.ts does not import database client modules', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.resolve(__dirname, '../../src/lib/demo/auth.ts')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Must not import the project's supabase client
    expect(content).not.toMatch(/from\s+['"]@\/lib\/supabase/)
    expect(content).not.toMatch(/require\(['"]@\/lib\/supabase/)
  })
})

describe('Demo Auth - Signup Blocked', () => {
  it('canUseSignup returns false in demo mode', () => {
    expect(canUseSignup()).toBe(false)
  })

  it('resolveDemoUser rejects arbitrary emails (no fake user creation)', () => {
    expect(resolveDemoUser('attacker@evil.com')).toBeNull()
    expect(resolveDemoUser('new-user@example.com')).toBeNull()
  })
})
