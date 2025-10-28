export type SurchargeLike = {
  type?: string
  code?: string
  name?: string
  description?: string
  amount?: number
}

const R = (s: string) => new RegExp(s, 'i')

type Rule = { re: RegExp; ja: string; group: 'additional' | 'other' }

const rules: Rule[] = [
  // Additional Handling bucket
  { re: R('\\bADDITIONAL[_\\s-]*HANDLING\\b.*(WEIGHT|WT)'), ja: '特別取扱（重量）', group: 'additional' },
  {
    re: R('\\bADDITIONAL[_\\s-]*HANDLING\\b.*(DIMENSION|SIZE|LENGTH|WIDTH|HEIGHT|LONGEST|GIRTH)'),
    ja: '特別取扱（寸法）',
    group: 'additional',
  },
  {
    re: R('\\bADDITIONAL[_\\s-]*HANDLING\\b.*(PACKAG(ING)?|TUBE|TUBULAR|DRUM|CRATE|WOODEN|CYLINDER|METAL|BUCKET|BARREL)'),
    ja: '特別取扱（梱包形状）',
    group: 'additional',
  },
  { re: R('NON[_\\s-]*MACHINABLE|NONMACHINABLE|NON[_\\s-]*CONVEYABLE|NONCONVEYABLE'), ja: '非機械仕分け手数料', group: 'additional' },
  { re: R('NON[_\\s-]*STACKABLE|NONSTACKABLE'), ja: '積み重ね不可手数料', group: 'additional' },
  {
    re: R('OVER(SIZE|SIZED|DIMENSION)|OUT[_\\s-]*OF[_\\s-]*DIMENSION|OVERLENGTH|LENGTH[_\\s-]*EXCEEDED|EXCESS[_\\s-]*LENGTH'),
    ja: '大型・長尺超過手数料',
    group: 'additional',
  },
  { re: R('EXTRA[_\\s-]*HANDLING|SPECIAL[_\\s-]*HANDLING'), ja: '特別取扱手数料', group: 'additional' },

  // Other bucket
  { re: R('ADDRESS[_\\s-]*CORRECTION|ADDR.*CORR'), ja: '住所訂正手数料', group: 'other' },
  { re: R('SIGNATURE'), ja: '署名必須手数料', group: 'other' },
  { re: R('SATURDAY.*DELIVERY'), ja: '土曜配達手数料', group: 'other' },
  { re: R('SATURDAY.*PICKUP'), ja: '土曜集荷手数料', group: 'other' },
  { re: R('DANGEROUS[_\\s-]*GOODS|HAZ(ARDOUS|MAT)'), ja: '危険物取扱手数料', group: 'other' },
  { re: R('DRY[_\\s-]*ICE'), ja: 'ドライアイス取扱手数料', group: 'other' },
  { re: R('LITHIUM.*BATTER(Y|IES)'), ja: 'リチウム電池取扱手数料', group: 'other' },
  { re: R('HOLD[_\\s-]*AT[_\\s-]*LOCATION|\\bHAL\\b'), ja: '営業所留め', group: 'other' },
  { re: R('REDELIVERY|REATTEMPT'), ja: '再配達手数料', group: 'other' },
  { re: R('REROUTE|CHANGE[_\\s-]*OF[_\\s-]*ADDRESS|DELIVERY[_\\s-]*CHANGE|INTERCEPT'), ja: '転送・住所変更手数料', group: 'other' },
  { re: R('\\bCOD\\b|COLLECT[_\\s-]*ON[_\\s-]*DELIVERY'), ja: '代金引換手数料', group: 'other' },
  { re: R('OUT[_\\s-]*OF[_\\s-]*PICKUP[_\\s-]*AREA|\\bOPA\\b'), ja: '集荷地域外手数料', group: 'other' },
  { re: R('ANCILLARY.*CLEARANCE|OTHER GOVERNMENT AGENCY|\\bOGA\\b'), ja: '通関付帯サービス料', group: 'other' },
  { re: R('BROKER[_\\s-]*SELECT|\\bBSO\\b'), ja: '通関業者指定オプション料', group: 'other' },
  { re: R('DISBURSEMENT|ADVANCEMENT|DUTY.*TAX.*ADVANCE'), ja: '関税立替手数料', group: 'other' },
  { re: R('STORAGE|WAREHOUSE[_\\s-]*HANDLING'), ja: '保管・留め置き手数料', group: 'other' },
  { re: R('APPOINTMENT|DELIVERY[_\\s-]*WINDOW|TIME[_\\s-]*DEF|EVENING[_\\s-]*DELIVERY'), ja: '配達時間指定/予約手数料', group: 'other' },
  { re: R('INSIDE[_\\s-]*(DELIVERY|PICKUP)'), ja: '屋内持込/持出し手数料', group: 'other' },
  { re: R('LIFTGATE'), ja: 'リフトゲート手数料', group: 'other' },
  { re: R('CALL[_\\s-]*TAG|RETURN[_\\s-]*LABEL|MERCHANT[_\\s-]*RETURN'), ja: '返品ラベル/回収手数料', group: 'other' },
  { re: R('DECLARED[_\\s-]*VALUE|INSURED[_\\s-]*VALUE'), ja: '保険料（申告価格）', group: 'other' },
]

export function mapSurchargeToJa(s: SurchargeLike): { labelJa: string; group: 'additional' | 'other' } {
  const hay = [s.type, s.code, s.name, s.description]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
  const rule = rules.find((r) => r.re.test(hay))
  const fallback = `その他手数料（${s.name || s.code || s.type || '不明'}）`
  return { labelJa: rule?.ja || fallback, group: (rule?.group || 'other') as 'additional' | 'other' }
}

export function groupAndSumByLabel(surcharges: SurchargeLike[]): Array<{ labelJa: string; amount: number; group: 'additional' | 'other' }>{
  const bucket = new Map<string, { labelJa: string; amount: number; group: 'additional' | 'other' }>()
  for (const s of surcharges) {
    const { labelJa, group } = mapSurchargeToJa(s)
    const amount = Number(s.amount || 0)
    if (!amount) continue
    const key = `${group}:${labelJa}`
    const cur = bucket.get(key)
    if (cur) cur.amount += amount
    else bucket.set(key, { labelJa, amount, group })
  }
  return Array.from(bucket.values())
}


