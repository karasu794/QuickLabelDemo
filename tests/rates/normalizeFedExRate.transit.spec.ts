import { pickTransit } from '@/lib/rates/normalizeFedExRate'

test('extracts delivery date & time', () => {
  const t = pickTransit({ 
    operationalDetail: { 
      deliveryDate: '2025-11-04', 
      deliveryDayOfWeek: 'TUE', 
      deliveryTime: '08:00' 
    } 
  })
  expect(t.deliveryDate).toBe('2025-11-04')
  expect(t.deliveryTime).toBe('08:00')
})

