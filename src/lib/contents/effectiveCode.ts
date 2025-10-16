import { isUS } from '@/lib/utils/isUS'

export interface AnyItem {
  hsCode?: string
  htsCode?: string
}

export function getEffectiveItemCode(countryCode: string | undefined, items: AnyItem[]): string | undefined {
  if (isUS(countryCode)) {
    const found = items.find(i => (i as any).htsCode && String((i as any).htsCode).trim() !== '')
    return found ? String((found as any).htsCode) : undefined
  } else {
    const found = items.find(i => (i as any).hsCode && String((i as any).hsCode).trim() !== '')
    return found ? String((found as any).hsCode) : undefined
  }
}


