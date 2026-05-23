/**
 * Demo Auth API Route Tests
 *
 * Verifies that the /api/auth/sign-in route handler in demo mode:
 * - Does NOT call Supabase auth
 * - Does NOT call database
 * - Accepts valid demo credentials
 * - Rejects invalid credentials
 * - Rejects non-demo emails
 */

// Set demo mode env BEFORE imports
process.env.NEXT_PUBLIC_APP_ENV = 'demo'
process.env.APP_ENV = 'demo'
process.env.NEXT_PUBLIC_DEMO_USER_EMAIL = 'demo-user@fql-demo.example.com'
process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD = 'DemoUser2026!'
process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL = 'demo-admin@fql-demo.example.com'
process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD = 'DemoAdmin2026!'

// Mock the Supabase routeClient to detect if it's called
const mockSignInWithPassword = jest.fn()
const mockFrom = jest.fn()
jest.mock('@/lib/supabase/routeClient', () => ({
  createRouteClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    from: mockFrom,
  }),
}))

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

import { POST } from '@/app/api/auth/sign-in/route'
import { NextRequest } from 'next/server'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/auth/sign-in (demo mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('accepts valid demo user credentials without calling Supabase', async () => {
    const req = createRequest({
      email: 'demo-user@fql-demo.example.com',
      password: 'DemoUser2026!',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.user).toBeTruthy()
    expect(json.user.email).toBe('demo-user@fql-demo.example.com')
    expect(json.access_token).toContain('demo-access-token')

    // Supabase was NOT called
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('accepts valid demo admin credentials without calling Supabase', async () => {
    const req = createRequest({
      email: 'demo-admin@fql-demo.example.com',
      password: 'DemoAdmin2026!',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.user.email).toBe('demo-admin@fql-demo.example.com')

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects non-demo email without calling Supabase', async () => {
    const req = createRequest({
      email: 'attacker@evil.com',
      password: 'anything',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toContain('デモ環境では登録済みデモアカウントのみ')

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects wrong password for demo user without calling Supabase', async () => {
    const req = createRequest({
      email: 'demo-user@fql-demo.example.com',
      password: 'wrong-password',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeTruthy()

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects request with missing email', async () => {
    const req = createRequest({ password: 'test' })

    const res = await POST(req)
    expect(res.status).toBe(400)

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('rejects request with missing password', async () => {
    const req = createRequest({ email: 'demo-user@fql-demo.example.com' })

    const res = await POST(req)
    expect(res.status).toBe(400)

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })
})
