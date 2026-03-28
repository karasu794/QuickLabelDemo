// server-only ensures this isn't bundled client-side but does not enforce server actions
import 'server-only'

import { logError, logInfo, logWarn } from '../logging'

export type AccountKind = 'export' | 'import'

export function determineAccountKind(originCountry: string, destinationCountry: string): AccountKind {
	const o = (originCountry || '').trim().toUpperCase()
	const d = (destinationCountry || '').trim().toUpperCase()
	if (o !== d && o === 'JP') return 'export'
	return 'import'
}

function readEnv(kind: AccountKind) {
	const env = process.env
	if (kind === 'export') {
		const apiKey = env.FEDEX_EXPORT_API_KEY || ''
		const secret = env.FEDEX_EXPORT_SECRET_KEY || ''
		const accountNumber = env.FEDEX_EXPORT_ACCOUNT_NUMBER || ''
		if (!apiKey || !secret || !accountNumber) {
			throw new Error('Missing FedEx export credentials: FEDEX_EXPORT_API_KEY/SECRET_KEY/ACCOUNT_NUMBER')
		}
		return { apiKey, secret, accountNumber }
	}
	const apiKey = env.FEDEX_IMPORT_API_KEY || ''
	const secret = env.FEDEX_IMPORT_SECRET_KEY || ''
	const accountNumber = env.FEDEX_IMPORT_ACCOUNT_NUMBER || ''
	if (!apiKey || !secret || !accountNumber) {
		throw new Error('Missing FedEx import credentials: FEDEX_IMPORT_API_KEY/SECRET_KEY/ACCOUNT_NUMBER')
	}
	return { apiKey, secret, accountNumber }
}

export function selectCredentials(params: { originCountry: string; destinationCountry: string }): { kind: AccountKind; apiKey: string; secret: string; accountNumber: string } {
	const kind = determineAccountKind(params.originCountry, params.destinationCountry)
	const { apiKey, secret, accountNumber } = readEnv(kind)
	return { kind, apiKey, secret, accountNumber }
}
// Back-compat alias for tests
export const selectFedExCredentials = selectCredentials

// In-memory token cache as a fallback when Redis is not configured
const memoryTokenCache: Map<AccountKind, { token: string; expiresAt: number }> = new Map()

async function getRedisClient() {
	const url = process.env.UPSTASH_REDIS_REST_URL
	const token = process.env.UPSTASH_REDIS_REST_TOKEN
	if (!url || !token) return null
	const { Redis } = await import('@upstash/redis')
	return new Redis({ url, token }) as InstanceType<typeof Redis>
}

export async function getAccessToken(kind: AccountKind): Promise<string> {
	// Prefer Redis cache
	try {
		const redis = await getRedisClient()
		const key = `ql:fedex:token:${kind}`
		if (redis) {
			const cached = await redis.get<string>(key)
			if (cached) return cached
		}
		// Check memory cache
		const now = Date.now()
		const mem = memoryTokenCache.get(kind)
		if (mem && mem.expiresAt > now + 5_000) {
			return mem.token
		}

		const { apiKey, secret } = readEnv(kind)
		const body = new URLSearchParams()
		body.set('grant_type', 'client_credentials')

		// 安全ガード: OAuth URLは許可されている
		const { fedexFetch } = await import('./safety')
		const res = await fedexFetch('https://apis.fedex.com/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: 'Basic ' + Buffer.from(`${apiKey}:${secret}`).toString('base64'),
			},
			body: body.toString(),
			cache: 'no-store',
		})
		if (!res.ok) {
			const text = await res.text().catch(() => '')
			logError('fedex.oauth.error', { kind, status: res.status, body: text })
			throw new FedExError(res.status, 'Failed to obtain access token', safeJson(text))
		}
		const data = (await res.json()) as { access_token: string; expires_in: number }
		const token = data.access_token
		// FedEx expires_in is seconds; store slightly under real TTL (3000s per spec)
		const ttlSeconds = Math.min(3000, Math.max(60, Number(data.expires_in || 3000)))
		const expiresAt = Date.now() + ttlSeconds * 1000
		memoryTokenCache.set(kind, { token, expiresAt })
		const redis2 = await getRedisClient()
		if (redis2) {
			await redis2.set(`ql:fedex:token:${kind}`, token, { ex: 3000 })
		}
		logInfo('fedex.oauth.ok', { kind, ttl: ttlSeconds })
		return token
	} catch (e: unknown) {
		if (e instanceof FedExError) throw e
		logError('fedex.oauth.exception', { kind, error: String(e) })
		throw e
	}
}

export class FedExError extends Error {
	code: number
	details?: unknown
	constructor(code: number, message: string, details?: unknown) {
		super(message)
		this.name = 'FedExError'
		this.code = code
		this.details = details
	}
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return { raw: text }
	}
}

export async function request<T>(options: { endpoint: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; kind: AccountKind; correlationId?: string }): Promise<T> {
	const { endpoint, method = 'POST', body, kind, correlationId } = options
	const token = await getAccessToken(kind)
	const url = new URL(endpoint, 'https://apis.fedex.com')
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	}
	if (correlationId) headers['X-Correlation-Id'] = correlationId

  // 安全ガード: URL検証
  const { assertSafeUrl } = await import('./safety')
  const { throttle } = await import('./httpLimiter')
  assertSafeUrl(url.toString())

  // 観測性: body はログしない（PII/巨大オブジェクト防止）。corrId は記録。
  logInfo('fedex.request', { endpoint: url.pathname, method, kind, corrId: correlationId })
	const res = await throttle(() =>
		fetch(url.toString(), {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			cache: 'no-store',
		})
	)
	const text = await res.text().catch(() => '')
	const parsed = text ? safeJson(text) : undefined
	if (!res.ok) {
		logWarn('fedex.response.error', { endpoint: url.pathname, status: res.status, corrId: res.headers.get('x-correlation-id') || correlationId })
		throw new FedExError(res.status, 'FedEx request failed', parsed)
	}
	logInfo('fedex.response.ok', { endpoint: url.pathname, status: res.status, corrId: res.headers.get('x-correlation-id') || correlationId })
	return (parsed as T) as T
}

export async function postShipment<T>(payload: unknown, kind: AccountKind, correlationId?: string): Promise<T> {
	return request<T>({ endpoint: '/ship/v1/shipments', method: 'POST', body: payload, kind, correlationId })
}

// Re-exports of seams for testing
export const __internal = {
	memoryTokenCache,
	readEnv,
}
