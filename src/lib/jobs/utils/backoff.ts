export function computeBackoffMs(attempts: number, baseMs = 5000, factor = 3): number {
  if (attempts <= 1) return baseMs
  return baseMs * Math.pow(factor, attempts - 1)
}


