import { formatAddress } from '@/lib/address/formatAddress'

describe('formatAddress', () => {
  const base = {
    contactName: 'Taro Yamada',
    companyName: 'ACME Inc.',
    address1: '1-2-3 ABC',
    address2: 'XYZ BLDG',
    cityName: 'Chiyoda',
    stateCode: 'Tokyo',
    postalCode: '100-0001'
  }

  test('JP順序', () => {
    const lines = formatAddress(base, 'JP')
    expect(lines[0]).toBe(base.postalCode)
    expect(lines.includes('JAPAN (JP)')).toBeTruthy()
  })

  test('GB順序', () => {
    const lines = formatAddress(base, 'GB')
    expect(lines.includes('UNITED KINGDOM (GB)')).toBeTruthy()
  })
})


