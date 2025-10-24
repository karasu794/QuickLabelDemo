import type { RateBreakdown } from '@/types/rate'
import type { Money } from '@/types/money'

const money = (amount: number, currency: string): Money => ({ amount, currency })

function upper(val: unknown): string {
  return String(val || '').toUpperCase()
}

function toNumber(val: any): number {
  if (val == null) return 0
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) return Number(val)
  if (typeof val === 'object') {
    const inner = (val as any)?.amount ?? (val as any)?.value
    if (typeof inner === 'number' && Number.isFinite(inner)) return inner
    if (typeof inner === 'string' && inner.trim() !== '' && Number.isFinite(Number(inner))) return Number(inner)
  }
  return 0
}

/**
 * FedEx応答を標準化
 * - base/discount はトップレベルまたは推定
 * - surcharges: fuel/peak/other。欠落は other に落とす（totalとの差分）
 */
export function normalizeFedExRate(resp: any, fallbackCurrency = 'JPY'): RateBreakdown {
  const rated = Array.isArray(resp?.ratedShipmentDetails) ? resp.ratedShipmentDetails : []
  const first = rated[0] || {}
  const totalObj = first?.totalNetCharge || resp?.totalNetCharge
  const currency = String(resp?.currency || totalObj?.currency || fallbackCurrency)
  const total = Math.round(toNumber(totalObj))

  const base = Math.round(toNumber(resp?.baseCharge))
  const disc = Math.round(toNumber(resp?.discounts))

  const fromDetails: any[] = []
  for (const rsd of rated) {
    const shipmentRateDetails = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
    for (const srd of shipmentRateDetails) {
      const sur = Array.isArray(srd?.surcharges) ? srd.surcharges : []
      fromDetails.push(...sur)
    }
    if (Array.isArray(rsd?.surcharges)) fromDetails.push(...rsd.surcharges)
  }

  const pickSum = (pred: (x: any) => boolean) =>
    Math.max(0, Math.round(fromDetails.filter(pred).reduce((s, x) => s + toNumber(x?.amount), 0)))

  const fuel = pickSum((x) => /FUEL/.test([x?.type, x?.surchargeType, x?.name, x?.description].map(upper).join(' ')))
  const peak = pickSum((x) => /(PEAK|DEMAND)/.test([x?.type, x?.name, x?.description].map(upper).join(' ')))

  const netFreight = Math.max(0, base - disc)
  const other = Math.max(0, total - netFreight - fuel - peak)

  return {
    baseCharge: money(base, currency),
    discounts: money(disc, currency),
    surcharges: {
      fuel: money(fuel, currency),
      peak: money(peak, currency),
      other: money(other, currency),
    },
    totalNetCharge: money(total, currency),
  }
}


