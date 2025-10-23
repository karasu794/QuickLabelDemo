import { NormalizedQuote } from '@/types/quote'

function isMockEnabled(): boolean {
  try {
    return String(process.env.CORE_MODE || '').toLowerCase() === 'mock'
  } catch { return false }
}

function coerceNumber(v: unknown, def = 0): number {
  const n = typeof v === 'string' ? Number(v) : (typeof v === 'number' ? v : NaN)
  return Number.isFinite(n) ? Number(n) : def
}

export function normalizeToQuotes(input: any): NormalizedQuote[] {
  const arr: any[] = Array.isArray(input) ? input : Array.isArray(input?.rates) ? input.rates : []
  const mapped: NormalizedQuote[] = arr.map((r: any, i: number) => {
    const service = String(r?.serviceType || r?.service || r?.code || 'UNKNOWN')
    const total = coerceNumber(r?.totalNetFedExCharge ?? r?.total ?? r?.amount, NaN)
    const currency = String(r?.currency || 'JPY')
    const eta = r?.deliveryDate || r?.estimatedDeliveryTimestamp || r?.eta || null
    const id = String(r?.id || `${service}-${i + 1}`)
    if (!Number.isFinite(total)) {
      throw new Error('QUOTE_TOTAL_MISSING')
    }
    if (!currency) {
      throw new Error('QUOTE_CURRENCY_MISSING')
    }
    return { id, service, total: Math.round(total), currency, eta }
  })

  if (mapped.length === 0 && isMockEnabled()) {
    return [{ id: 'mock-PRIO', service: 'FEDEX_INTERNATIONAL_PRIORITY', total: 12345, currency: 'JPY', eta: '2099-12-31' }]
  }
  return mapped
}


