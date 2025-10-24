import { ADDRESS_FORMAT_RULES } from './formatRules'

export function formatAddress(address: any, countryCode: string): string[] {
  const rules = ADDRESS_FORMAT_RULES[countryCode] || []
  const get = (key: string): string => {
    const optional = key.endsWith('?')
    const k = optional ? key.slice(0, -1) : key
    switch (k) {
      case 'name': return address?.contactName || ''
      case 'company': return address?.companyName || ''
      case 'line1': return address?.address1 || ''
      case 'line2': return address?.address2 || ''
      case 'city': return address?.cityName || ''
      case 'state': return address?.stateCode || ''
      case 'county': return address?.county || ''
      case 'postal': return address?.postalCode || ''
      default: return k.includes('(') ? k : ''
    }
  }
  return rules.map((r) => get(r)).filter((v) => !!v)
}


