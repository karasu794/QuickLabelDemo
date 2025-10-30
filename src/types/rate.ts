import type { Money } from './money'

export type RateBreakdown = {
  baseCharge: Money
  discounts: Money
  surcharges: {
    fuel?: Money
    peak?: Money
    residential?: Money
    deliveryArea?: Money
    additionalHandling?: Money
    importProcessing?: Money
    insuredValue?: Money
    other?: Money
  }
  totalNetCharge: Money
}


