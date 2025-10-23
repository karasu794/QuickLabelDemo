export function getDeclaredValueCap(packagingType: string): number {
  // 暫定の上限値。トップページ実装に合わせて後で置換可能。
  switch (String(packagingType || '').toUpperCase()) {
    case 'FEDEX_ENVELOPE':
      return 0
    case 'FEDEX_PAK':
      return 30000
    case 'FEDEX_BOX':
      return 500000
    case 'FEDEX_SMALL_BOX':
      return 300000
    case 'FEDEX_MEDIUM_BOX':
      return 400000
    case 'FEDEX_LARGE_BOX':
      return 500000
    case 'FEDEX_TUBE':
      return 200000
    case 'YOUR_PACKAGING':
    case 'CUSTOMER':
      return 1000000
    default:
      return 1000000
  }
}

export function getInsuranceHelpUrl(): string {
  return '/help/insurance'
}


