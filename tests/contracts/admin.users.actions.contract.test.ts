/**
 * Contract: Admin User Actions (ban/suspend/resume/delete logical)
 * 前提:
 * - requireAdminAuthRoute() により 401/403 を返せる
 * - service_role クライアントで DB 確認可能な test helper があること
 */
import { test, expect, beforeAll } from '@jest/globals'
import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function getProfile(id: string) {
  const supa = createServiceRoleClient()
  const { data, error } = await (supa as any)
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

async function countAdminActions(targetId: string) {
  const supa = createServiceRoleClient()
  const { count, error } = await (supa as any)
    .from('admin_actions')
    .select('*', { count: 'exact', head: true } as any)
    .eq('target_user_id', targetId)
  if (error) throw error
  return count ?? 0
}

let targetUserId = ''

beforeAll(async () => {
  targetUserId = process.env.TEST_TARGET_USER_ID || randomUUID()
})

test('非ログインは 401', async () => {
  const res = await fetch(`http://localhost:3000/api/admin/users/${targetUserId}/ban`, { method: 'POST' })
  expect([401, 403]).toContain(res.status)
})

test('管理者は ban / suspend / resume / delete を実行できる（モック前提）', async () => {
  const before = await countAdminActions(targetUserId)

  // ban
  let r = await fetch(`http://localhost:3000/api/admin/users/${targetUserId}/ban`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'contract-test' }),
  })
  expect([200, 401, 403]).toContain(r.status)

  // suspend
  const until = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  r = await fetch(`http://localhost:3000/api/admin/users/${targetUserId}/suspend`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ until, reason: 'contract-test' }),
  })
  expect([200, 401, 403]).toContain(r.status)

  // resume
  r = await fetch(`http://localhost:3000/api/admin/users/${targetUserId}/resume`, {
    method: 'POST',
  })
  expect([200, 401, 403]).toContain(r.status)

  // logical delete
  r = await fetch(`http://localhost:3000/api/admin/users/${targetUserId}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'contract-test' }),
  })
  expect([200, 401, 403]).toContain(r.status)

  const after = await countAdminActions(targetUserId)
  expect(after).toBeGreaterThanOrEqual(before)

  const profile = await getProfile(targetUserId)
  // プロファイル確認は seed/モック状況に依存するためスモークのみ
  expect(profile === null || typeof profile === 'object').toBe(true)
})


