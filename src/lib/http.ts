import { NextResponse } from 'next/server'
import type { ZodSchema, ZodTypeAny } from 'zod'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')
  return NextResponse.json<T>(data, { status: 200, ...init, headers })
}

export function jsonErr(status: number, payload: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')
  return NextResponse.json(payload as any, { status, ...init, headers })
}

export function toUserError(e: unknown): { code: string; message: string; issues?: unknown } {
  const msg = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : String(e)
  let issues: unknown
  try { issues = JSON.parse(msg) } catch { issues = undefined }
  return { code: 'validation_error', message: msg, ...(issues ? { issues } : {}) }
}

export async function parseJsonWithSchema<T>(res: Response, schema: ZodSchema<T> | ZodTypeAny): Promise<T> {
  const data = await res.json().catch(() => undefined)
  // throws with JSON-stringified issues
  const mod = await import('@/lib/validate')
  return mod.validateOrThrow(schema, data)
}


