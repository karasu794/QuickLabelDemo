import { parseISO, format } from 'date-fns'
import ja from 'date-fns/locale/ja'

export type RateRow = {
  serviceType: string
  amount: number
  currency: string
  transit: {
    deliveryDate: string | null
    deliveryDayOfWeek: string | null
    deliveryTime: string | null
    transitTime: string | null
  }
  breakdown?: any
}

export type ArrivalGroup = {
  label: string
  key: string
  items: RateRow[]
}

export function groupRatesByArrival(rates: RateRow[], shipDatestamp: string, quoteDateISO: string): ArrivalGroup[] {
  const ship = parseISO(shipDatestamp)
  const quote = parseISO(quoteDateISO)
  const isQuoteDayOrLater = (d: Date) => d >= quote // 仕様: 当日/翌日以降 → '--'
  const hyphenKey = '--'
  const groups: Record<string, ArrivalGroup> = {}
  const push = (key: string, label: string, row: RateRow) => {
    if (!groups[key]) groups[key] = { key, label, items: [] }
    groups[key].items.push(row)
  }

  for (const r of rates) {
    const hasDate = !!r.transit?.deliveryDate
    if (!hasDate) {
      push(hyphenKey, '到着日 --', r)
      continue
    }
    const d = parseISO(r.transit!.deliveryDate!)
    if (isQuoteDayOrLater(d)) {
      push(hyphenKey, '到着日 --', r)
      continue
    }
    const label = `到着日 ${format(d, 'M月d日(E)', { locale: ja })}`
    const key = r.transit!.deliveryDate!
    push(key, label, r)
  }

  // 並び替え: '--' を最上段、その後は日付昇順。各グループ内は time→price 昇順
  const sortGroups = Object.values(groups).sort((a, b) => {
    if (a.key === hyphenKey) return -1
    if (b.key === hyphenKey) return 1
    return a.key.localeCompare(b.key)
  })
  for (const g of sortGroups) {
    g.items.sort((x, y) => {
      const tx = x.transit?.deliveryTime || '99:99'
      const ty = y.transit?.deliveryTime || '99:99'
      if (tx !== ty) return tx.localeCompare(ty)
      return x.amount - y.amount
    })
  }
  return sortGroups
}

