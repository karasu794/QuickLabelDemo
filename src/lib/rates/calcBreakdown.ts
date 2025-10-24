import { VAT_RATE, SYSTEM_FEE_RATE } from '@/config/tax'
import type { RateBreakdown } from '@/types/rate'
import type { Money } from '@/types/money'

const m = (a: number, c: string): Money => ({ amount: a, currency: c })

export function calcBreakdown(input: RateBreakdown) {
  const c = input.totalNetCharge.currency
  const base = input.baseCharge.amount
  const disc = input.discounts.amount
  const fuel = input.surcharges.fuel?.amount || 0
  const peak = input.surcharges.peak?.amount || 0
  const other = input.surcharges.other?.amount || 0

  const netFreight = Math.max(0, base - disc)
  const systemFee = Math.round(netFreight * SYSTEM_FEE_RATE)
  const vat = Math.round(systemFee * VAT_RATE)
  const grandTotal = netFreight + fuel + peak + other + systemFee + vat

  return {
    lines: {
      base: m(base, c),
      discount: m(disc, c),
      fuel: m(fuel, c),
      peak: m(peak, c),
      other: m(other, c),
      systemFee: m(systemFee, c),
      vat: m(vat, c),
    },
    totals: {
      netFreight: m(netFreight, c),
      grandTotal: m(grandTotal, c),
    },
  }
}


