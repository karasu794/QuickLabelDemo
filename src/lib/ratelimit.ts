import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimitConfig = { tokens: number; window: `${number} ${'s' | 'm' | 'h'}` }

export async function checkRate(
  key: string,
  limit: LimitConfig = { tokens: 20, window: '60 s' }
) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Fail-open: if Upstash is not configured, allow the request
    return { success: true, remaining: Infinity, limit: limit.tokens, reset: 0 }
  }

  const redis = new Redis({ url, token })
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit.tokens, limit.window),
    analytics: false,
  })

  return rl.limit(key)
}


