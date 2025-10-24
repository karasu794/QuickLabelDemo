import type { Money } from './money'

export type RateBreakdown = {
  baseCharge: Money
  discounts: Money
  surcharges: { fuel?: Money; peak?: Money; other?: Money }
  totalNetCharge: Money
}


