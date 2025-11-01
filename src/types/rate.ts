import type { Money } from './money'

export type TransitInfo = {
  deliveryDate: string | null
  deliveryDayOfWeek: string | null
  deliveryTime: string | null
  transitTime: string | null
}

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
  deliveryAreaLevel?: 'A' | 'B'
  totalNetCharge: Money
  transit?: TransitInfo
}


