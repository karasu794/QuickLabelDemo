import { groupRatesByArrival } from '@/lib/rates/groupByArrival'

test('hyphen section first', () => {
  const rates = [
    { 
      serviceType: 'P1', 
      amount: 100, 
      currency: 'JPY', 
      transit: { 
        deliveryDate: null, 
        deliveryDayOfWeek: null, 
        deliveryTime: null, 
        transitTime: null 
      } 
    },
    { 
      serviceType: 'P2', 
      amount: 200, 
      currency: 'JPY', 
      transit: { 
        deliveryDate: '2025-11-05', 
        deliveryDayOfWeek: 'WED', 
        deliveryTime: '20:00', 
        transitTime: 'TWO_DAYS' 
      } 
    }
  ]
  const out = groupRatesByArrival(rates as any, '2025-11-01', '2025-11-01T00:00:00.000Z')
  expect(out[0].key).toBe('--')
})

