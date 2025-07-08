import '@testing-library/jest-dom'

// Next.js Router のモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    entries: jest.fn(() => []),
    forEach: jest.fn(),
    keys: jest.fn(() => []),
    values: jest.fn(() => []),
    toString: jest.fn(() => ''),
  }),
  usePathname: () => '/',
}))

// Google Maps API のモック
global.google = {
  maps: {
    places: {
      Autocomplete: jest.fn(() => ({
        addListener: jest.fn(),
        getPlace: jest.fn(() => ({
          geometry: { location: { lat: () => 35.6762, lng: () => 139.6503 } },
          formatted_address: 'Test Address',
          address_components: [
            { types: ['country'], short_name: 'JP', long_name: 'Japan' },
            { types: ['postal_code'], long_name: '100-0001' }
          ]
        }))
      })),
      PlacesServiceStatus: {
        OK: 'OK'
      }
    }
  }
}

// useLoadScript のモック
jest.mock('@react-google-maps/api', () => ({
  useLoadScript: jest.fn(() => ({
    isLoaded: true,
    loadError: null
  })),
  Autocomplete: ({ children, onLoad, onPlaceChanged }) => {
    // onLoad コールバックを即座に実行
    if (onLoad) {
      const mockAutocomplete = {
        getPlace: jest.fn(() => ({
          geometry: { location: { lat: () => 35.6762, lng: () => 139.6503 } },
          formatted_address: 'Test Address',
          address_components: [
            { types: ['country'], short_name: 'JP', long_name: 'Japan' },
            { types: ['postal_code'], long_name: '100-0001' }
          ]
        }))
      }
      onLoad(mockAutocomplete)
    }
    return children
  }
}))

// Supabase のモック
jest.mock('@/lib/supabase/client', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({ user: null })),
  getUserProfile: jest.fn(() => Promise.resolve({ profile: null }))
}), { virtual: true })

// fetch のモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      rates: [
        {
          serviceId: 'test-service',
          serviceName: 'Test Service',
          baseRate: 1000,
          totalRate: 900,
          discountAmount: 100,
          discountPercentage: 10,
          transitTime: '1-2 days',
          deliveryTime: '12:00',
          arrivalDate: '2024-01-15',
          breakdown: {
            baseRate: 1000,
            fuelSurcharge: 50,
            volumeDiscount: -150
          }
        }
      ]
    })
  })
)

// console.error のモック (テスト中のエラーログを抑制)
const originalError = console.error
console.error = jest.fn((message) => {
  // 特定のエラーメッセージのみを抑制
  if (typeof message === 'string' && 
      (message.includes('Warning: ReactDOM.render') || 
       message.includes('Warning: componentWillMount') ||
       message.includes('Warning: componentWillReceiveProps'))) {
    return
  }
  originalError(message)
})

console.warn = jest.fn()
console.log = jest.fn() 