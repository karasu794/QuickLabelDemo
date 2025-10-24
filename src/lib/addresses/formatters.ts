type Address = {
  contactName?: string
  companyName?: string
  address1?: string
  address2?: string
  cityName?: string
  stateCode?: string
  postalCode?: string
  countryCode?: string
}

export function validateFailFast(addr: Address, country: string) {
  const cc = (country || addr.countryCode || '').toUpperCase()
  if (!addr.contactName) throw new Error('CONTACT_NAME_REQUIRED')
  if (!addr.address1) throw new Error('ADDRESS1_REQUIRED')
  if (!addr.cityName) throw new Error('CITY_REQUIRED')
  if (!addr.postalCode) throw new Error('POSTAL_REQUIRED')
  if (['US', 'CA'].includes(cc) && !addr.stateCode) throw new Error('STATE_CODE_REQUIRED')
}

export function formatUS(addr: Address): string[] {
  validateFailFast(addr, 'US')
  const lines: string[] = []
  const nameLine = [addr.contactName, addr.companyName].filter(Boolean).join(' / ')
  if (nameLine) lines.push(nameLine)
  if (addr.address1) lines.push(addr.address1)
  if (addr.address2) lines.push(addr.address2)
  const cityStateZip = [addr.cityName, addr.stateCode, addr.postalCode].filter(Boolean).join(', ')
  if (cityStateZip) lines.push(cityStateZip)
  lines.push('UNITED STATES (US)')
  return lines.filter(Boolean)
}

export function formatCA(addr: Address): string[] {
  validateFailFast(addr, 'CA')
  const lines: string[] = []
  const nameLine = [addr.contactName, addr.companyName].filter(Boolean).join(' / ')
  if (nameLine) lines.push(nameLine)
  if (addr.address1) lines.push(addr.address1)
  if (addr.address2) lines.push(addr.address2)
  const cityStatePostal = [addr.cityName, addr.stateCode, addr.postalCode].filter(Boolean).join(', ')
  if (cityStatePostal) lines.push(cityStatePostal)
  lines.push('CANADA (CA)')
  return lines.filter(Boolean)
}


