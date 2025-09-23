import 'server-only'
import { Redis } from '@upstash/redis'

export type FedExAccountKind = 'export' | 'import'

export type FedExCredentials = {
  kind: FedExAccountKind
  accountNumber: string
  clientId: string
  clientSecret: string
}

function getBaseUrl(): string {
  const base = process.env.FEDEX_API_BASE_URL?.trim()
  return base || 'https://apis.fedex.com'
}

export function selectFedExCredentials(params: { originCountry: string; destinationCountry: string }): FedExCredentials {
  const { originCountry, destinationCountry } = params
  const isExport = originCountry?.toUpperCase() === 'JP' && destinationCountry?.toUpperCase() !== 'JP'
  const kind: FedExAccountKind = isExport ? 'export' : 'import'
  if (kind === 'export') {
    return {
      kind,
      accountNumber: process.env.FEDEX_EXPORT_ACCOUNT_NUMBER!,
      clientId: process.env.FEDEX_EXPORT_API_KEY!,
      clientSecret: process.env.FEDEX_EXPORT_SECRET_KEY!,
    }
  }
  return {
    kind,
    accountNumber: process.env.FEDEX_IMPORT_ACCOUNT_NUMBER!,
    clientId: process.env.FEDEX_IMPORT_API_KEY!,
    clientSecret: process.env.FEDEX_IMPORT_SECRET_KEY!,
  }
}

const memCache = new Map<string, { token: string; exp: number }>()

async function getRedis(): Promise<Redis | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export class FedExError extends Error {
  code: string
  status: number
  details?: unknown
  constructor(init: { code: string; message: string; status: number; details?: unknown }) {
    super(init.message)
    this.code = init.code
    this.status = init.status
    this.details = init.details
  }
}

export async function getAccessToken(kind: FedExAccountKind): Promise<string> {
  const key = `fedex:token:${kind}`
  const now = Date.now()
  const cached = memCache.get(key)
  if (cached && cached.exp > now + 5_000) {
    return cached.token
  }
  const redis = await getRedis()
  if (redis) {
    const v = await redis.get<string>(key)
    if (v) return v
  }
  const creds = kind === 'export'
    ? { id: process.env.FEDEX_EXPORT_API_KEY!, secret: process.env.FEDEX_EXPORT_SECRET_KEY! }
    : { id: process.env.FEDEX_IMPORT_API_KEY!, secret: process.env.FEDEX_IMPORT_SECRET_KEY! }
  const resp = await fetch(`${getBaseUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.id,
      client_secret: creds.secret,
    }) as any,
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new FedExError({ code: 'AUTH', status: resp.status, message: 'FedEx OAuth failed', details: text })
  }
  const json = await resp.json()
  const token: string = json.access_token
  const ttlSec: number = Math.max(60, Math.min(3000, Number(json.expires_in ?? 3000)))
  memCache.set(key, { token, exp: now + (ttlSec * 1000) })
  if (redis) await redis.set(key, token, { ex: Math.floor(ttlSec * 0.95) })
  return token
}

export async function fedexRequest<T>(args: {
  endpoint: string
  method: 'GET'|'POST'|'PUT'|'DELETE'
  body?: unknown
  kind: FedExAccountKind
  accessToken?: string
  locale?: string
}): Promise<{ status: number; data: T }> {
  const token = args.accessToken ?? await getAccessToken(args.kind)
  const url = `${getBaseUrl()}${args.endpoint}`
  const resp = await fetch(url, {
    method: args.method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(args.locale ? { 'X-locale': args.locale } : {}),
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
  })
  const text = await resp.text().catch(() => '')
  let data: any = undefined
  try { data = text ? JSON.parse(text) : undefined } catch { data = undefined }
  if (!resp.ok) {
    const code = data?.errors?.[0]?.code || 'FEDEX_API_ERROR'
    const message = data?.errors?.[0]?.message || 'FedEx API error'
    throw new FedExError({ code, status: resp.status, message, details: data })
  }
  return { status: resp.status, data }
}
