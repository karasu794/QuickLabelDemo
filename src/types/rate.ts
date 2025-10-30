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
    saturdayDelivery?: Money
    insuredValue?: Money
    other?: Money
  }
  specialHandling?: {
    oversize?: Money
    dimension?: Money
    weight?: Money
    packaging?: Money
    nonStackable?: Money
  }
  totalNetCharge: Money
}


