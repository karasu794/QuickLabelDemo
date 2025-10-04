// SR-B: Upstash撤去。すべて常時PASSの最小実装に簡素化
// removed: Upstash client (Ratelimit/Redis)

type LimitConfig = { tokens: number; window: `${number} ${'s' | 'm' | 'h'}` }

export async function checkRate(
  key: string,
  limit: LimitConfig = { tokens: 20, window: '60 s' }
) {
  // 常に許可（呼び出し互換インタフェースを維持）
  return { success: true, remaining: Infinity, limit: limit.tokens, reset: 0 }
}


