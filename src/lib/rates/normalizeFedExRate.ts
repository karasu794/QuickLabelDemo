import type { RateBreakdown } from '@/types/rate'
import type { Money } from '@/types/money'
import { classifySurchargeLabel, type AhsCategory } from './fedex/surchargeMaps'
import { classifySurchargeByFeeDetailKey, isMaxValueCategory, type SurchargeCategory } from './fedex/feeDetailKeys'

const money = (amount: number, currency: string): Money => ({ amount, currency })
// 一元マッピング（ドキュメント準拠の代表例。観測・拡張で随時追加）
export const SURCHARGE_MAP: Record<string, { code: string; labelJa: string; group: 'surcharge'|'discount'|'declared'|'other' }> = {
  FUEL: { code: 'fuelSurcharge', labelJa: '燃料割増金', group: 'surcharge' },
  PEAK: { code: 'peakSurcharge', labelJa: '混雑時割増金', group: 'surcharge' },
  PEAK_SEASON: { code: 'peakSurcharge', labelJa: '混雑時割増金', group: 'surcharge' },
  RESIDENTIAL_DELIVERY: { code: 'residentialSurcharge', labelJa: '個人宅加算', group: 'surcharge' },
  RESIDENTIAL: { code: 'residentialSurcharge', labelJa: '個人宅加算', group: 'surcharge' },
  DELIVERY_AREA: { code: 'outOfDeliveryArea', labelJa: '配達地域外', group: 'surcharge' },
  EXTENDED_DELIVERY_AREA: { code: 'outOfDeliveryArea', labelJa: '配達地域外', group: 'surcharge' },
  REMOTE_AREA: { code: 'outOfDeliveryArea', labelJa: '配達地域外', group: 'surcharge' },
  ADDITIONAL_HANDLING: { code: 'additionalHandlingSurcharge', labelJa: '特別取扱い', group: 'surcharge' },
  SPECIAL_HANDLING: { code: 'additionalHandlingSurcharge', labelJa: '特別取扱い', group: 'surcharge' },
  IMPORT_CLEARANCE: { code: 'usImportProcessingFee', labelJa: '米国輸入処理手数料', group: 'surcharge' },
  ANCILLARY_SERVICE_FEE: { code: 'otherSurcharge', labelJa: 'その他特別手数料', group: 'surcharge' },
  DECLARED_VALUE: { code: 'declaredValue', labelJa: '保険料（申告価格）', group: 'declared' },
  DISCOUNT: { code: 'discount', labelJa: '割引', group: 'discount' },
}

function dumpSurchargeMap(observedTypes: string[]): void {
  try {
    const keys = Object.keys(SURCHARGE_MAP)
    const missingInMap = Array.from(new Set(observedTypes.map(s => String(s || '').toUpperCase()))).filter(k => !SURCHARGE_MAP[k])
    const header = ['FedEx Type','code','labelJa','group']
    const rows = keys.map(k => {
      const it = SURCHARGE_MAP[k]
      return `| ${k} | ${it.code} | ${it.labelJa} | ${it.group} |`
    })
    const table = ['| '+header.join(' | ')+' |', '| --- | --- | --- | --- |', ...rows].join('\n')
    // eslint-disable-next-line no-console
    console.debug('[rates][audit]', {
      mapKeys: keys,
      docEnumTypes: [],
      observedTypes: observedTypes,
      missingInMap,
      extraInMap: [],
      table,
    })
  } catch {}
}

function upper(val: unknown): string {
  return String(val || '').toUpperCase()
}

function toNumber(val: any): number {
  if (val == null) return 0
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) return Number(val)
  if (typeof val === 'object') {
    const inner = (val as any)?.amount ?? (val as any)?.value
    if (typeof inner === 'number' && Number.isFinite(inner)) return inner
    if (typeof inner === 'string' && inner.trim() !== '' && Number.isFinite(Number(inner))) return Number(inner)
  }
  return 0
}

/**
 * FedEx応答を標準化
 * - base/discount はトップレベルまたは推定
 * - surcharges: fuel/peak/other。欠落は other に落とす（totalとの差分）
 */
export function normalizeFedExRate(resp: any, fallbackCurrency = 'JPY'): RateBreakdown {
  const DEBUG_RATE_NORMALIZE = String(process.env.DEBUG_RATE_NORMALIZE || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_NORMALIZE === '1'
  const DEBUG_RATE_RAW = String(process.env.DEBUG_RATE_RAW || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_RAW === '1'
  const DEBUG_RATE_BASE = String(process.env.DEBUG_RATE_BASE || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_BASE === '1'
  // 1回だけの観測ログ
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let loggedOnce = (normalizeFedExRate as any).__loggedOnce === true
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let rawLoggedOnce = (normalizeFedExRate as any).__rawLoggedOnce === true
  const rated = Array.isArray(resp?.ratedShipmentDetails) ? resp.ratedShipmentDetails : []
  const first = rated[0] || {}
  const totalObj = first?.totalNetCharge || resp?.totalNetCharge
  const currency = String(resp?.currency || totalObj?.currency || fallbackCurrency)
  const total = Math.round(toNumber(totalObj))

  // ==== Base計算の堅牢化: プローブ + フォールバック順 ====
  function probeBase(rsd: any) {
    try {
      const srd = (Array.isArray(rsd?.shipmentRateDetails) ? rsd?.shipmentRateDetails?.[0] : rsd?.shipmentRateDetail) || rsd
      const pkgArr: any[] = []
      if (Array.isArray(rsd?.ratedPackages)) pkgArr.push(...rsd.ratedPackages)
      if (Array.isArray(rsd?.ratedPackageDetails)) pkgArr.push(...rsd.ratedPackageDetails)
      const pkgBases: number[] = []
      for (const p of pkgArr) {
        const prd = p?.packageRateDetail || p?.packageRateDetails || p?.ratedPackageDetail
        const baseLike = (prd?.baseCharge?.amount ?? prd?.baseCharge ?? prd?.netFreight?.amount ?? prd?.netFreight)
        const b = Number(baseLike)
        if (Number.isFinite(b)) pkgBases.push(b)
      }
      const s_totalBase = Number((srd?.totalBaseCharge?.amount ?? srd?.totalBaseCharge ?? srd?.baseCharge?.amount ?? srd?.baseCharge) || 0)
      const s_totalNet = Number((srd?.totalNetCharge?.amount ?? srd?.totalNetCharge) || 0)
      const s_totalSurch = Number((srd?.totalSurcharges?.amount ?? srd?.totalSurcharges) || 0)
      const s_totalDisc = Number((srd?.totalDiscounts?.amount ?? srd?.totalDiscounts) || 0)
      const s_currency = srd?.totalBaseCharge?.currency || srd?.currency || rsd?.currency || currency
      if (DEBUG_RATE_BASE) {
        console.debug('[rate][base-probe]', {
          rsdKeys: Object.keys(rsd || {}),
          s_currency, s_totalBase, s_totalNet, s_totalSurch, s_totalDisc,
          pkgBaseCount: pkgBases.length, pkgBaseSum: pkgBases.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)
        })
      }
      return {
        s_totalBase,
        s_totalNet,
        s_totalSurch,
        s_totalDisc,
        pkgBaseSum: pkgBases.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)
      }
    } catch {
      return { s_totalBase: 0, s_totalNet: 0, s_totalSurch: 0, s_totalDisc: 0, pkgBaseSum: 0 }
    }
  }

  function computeBase(params: { s_totalBase?: number; s_totalNet?: number; s_totalSurch?: number; s_totalDisc?: number; pkgBaseSum?: number; rawLinesWithoutBaseSum?: number; }): number {
    const s_totalBase = Number(params.s_totalBase || 0)
    const s_totalNet = Number(params.s_totalNet || 0)
    const s_totalSurch = Number(params.s_totalSurch || 0) // 使わないが将来用
    const s_totalDisc = Number(params.s_totalDisc || 0) // 使わないが将来用
    const pkgBaseSum = Number(params.pkgBaseSum || 0)
    const rawLinesWithoutBaseSum = Number(params.rawLinesWithoutBaseSum || 0)
    if (Number.isFinite(s_totalBase) && s_totalBase > 0) return Math.round(s_totalBase)
    if (Number.isFinite(pkgBaseSum) && pkgBaseSum > 0) return Math.round(pkgBaseSum)
    if (Number.isFinite(s_totalNet) && Number.isFinite(rawLinesWithoutBaseSum)) {
      const guess = Math.round(s_totalNet - rawLinesWithoutBaseSum)
      if (guess > 0) return guess
    }
    return 0
  }
  const disc = Math.round(toNumber(resp?.discounts))

  const fromDetails: any[] = []
  const appendSurchargesFrom = (obj: any) => {
    if (!obj) return
    const sur = Array.isArray((obj as any)?.surcharges) ? (obj as any).surcharges : []
    const surAlt = Array.isArray((obj as any)?.surCharges) ? (obj as any).surCharges : []
    if (sur.length) fromDetails.push(...sur)
    if (surAlt.length) fromDetails.push(...surAlt)
  }
  for (const rsd of rated) {
    const shipmentRateDetails = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
    for (const srd of shipmentRateDetails) {
      appendSurchargesFrom(srd)
    }
    if (Array.isArray((rsd as any)?.surcharges)) fromDetails.push(...(rsd as any).surcharges)
    if (Array.isArray((rsd as any)?.surCharges)) fromDetails.push(...(rsd as any).surCharges)

    // パッケージレベル（ratedPackages / ratedPackageDetails）
    const ratedPkgs = [] as any[]
    if (Array.isArray((rsd as any)?.ratedPackages)) ratedPkgs.push(...(rsd as any).ratedPackages)
    if (Array.isArray((rsd as any)?.ratedPackageDetails)) ratedPkgs.push(...(rsd as any).ratedPackageDetails)
    for (const pkg of ratedPkgs) {
      const prd = (pkg as any)?.packageRateDetails || (pkg as any)?.packageRateDetail || (pkg as any)?.ratedPackageDetail
      if (prd) appendSurchargesFrom(prd)
      // 念のため直下にも surcharges がある形式をカバー
      appendSurchargesFrom(pkg)
    }
  }
  if (Array.isArray((resp as any)?.surcharges)) fromDetails.push(...(resp as any).surcharges)
  if (Array.isArray((resp as any)?.surCharges)) fromDetails.push(...(resp as any).surCharges)
  // トップレベルの ratedPackageDetails にも対応
  if (Array.isArray((resp as any)?.ratedPackageDetails)) {
    for (const pkg of (resp as any).ratedPackageDetails as any[]) {
      const prd = (pkg as any)?.packageRateDetails || (pkg as any)?.packageRateDetail
      if (prd) appendSurchargesFrom(prd)
      appendSurchargesFrom(pkg)
    }
  }

  // === Debug: 各line itemのraw情報を出力 ===
  const DEBUG_RATE_RECONCILE = String(process.env.DEBUG_RATE_RECONCILE || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_RECONCILE === '1'
  if (DEBUG_RATE_RECONCILE && !rawLoggedOnce) {
    try {
      const tableData = fromDetails.map((s: any) => ({
        type: s?.type || '',
        surchargeType: s?.surchargeType || '',
        code: s?.code || '',
        name: s?.name || '',
        description: s?.description || '',
        amount: toNumber(s?.amount),
        category: classifySurchargeByFeeDetailKey(s) || 'UNKNOWN',
      }))
      // eslint-disable-next-line no-console
      console.table(tableData)
      ;(normalizeFedExRate as any).__rawLoggedOnce = true
    } catch {}
  }

  // === Fee detail keyベースの分類と集計 ===
  // カテゴリごとに分類し、最大値採用対象はshipment単位で最大値のみ採用
  const surchargesByCategory: Record<SurchargeCategory | 'UNKNOWN', Array<{ s: any; amount: number }>> = {
    FUEL: [],
    PEAK: [],
    RESIDENTIAL: [],
    DELIVERY_AREA: [],
    IMPORT_PROCESSING: [],
    SATURDAY_DELIVERY: [],
    INSURED_VALUE: [],
    OVERSIZE: [],
    AHS_DIMENSION: [],
    AHS_WEIGHT: [],
    AHS_PACKAGING: [],
    AHS_NONSTACKABLE: [],
    UNKNOWN: [],
  }

  for (const s of fromDetails) {
    const cat = classifySurchargeByFeeDetailKey(s)
    const amount = toNumber(s?.amount)
    if (cat) {
      surchargesByCategory[cat].push({ s, amount })
    } else {
      // AHS/Oversize系を再チェック（既存のclassifySurchargeLabelで）
      const ahsCat = classifySurchargeLabel(s)
      if (ahsCat) {
        if (ahsCat === 'OVERSIZE') surchargesByCategory.OVERSIZE.push({ s, amount })
        else if (ahsCat === 'AHS_DIMENSION') surchargesByCategory.AHS_DIMENSION.push({ s, amount })
        else if (ahsCat === 'AHS_WEIGHT') surchargesByCategory.AHS_WEIGHT.push({ s, amount })
        else if (ahsCat === 'AHS_PACKAGING') surchargesByCategory.AHS_PACKAGING.push({ s, amount })
        else if (ahsCat === 'AHS_NONSTACKABLE') surchargesByCategory.AHS_NONSTACKABLE.push({ s, amount })
      } else {
        surchargesByCategory.UNKNOWN.push({ s, amount })
      }
    }
  }

  // 最大値採用対象カテゴリは最大値のみ採用、それ以外は合算
  const getCategorySum = (cat: SurchargeCategory): number => {
    const items = surchargesByCategory[cat]
    if (items.length === 0) return 0
    if (isMaxValueCategory(cat)) {
      // 最大値のみ採用
      return Math.max(...items.map((x) => x.amount))
    }
    // 合算
    return Math.max(0, Math.round(items.reduce((sum, x) => sum + x.amount, 0)))
  }

  // 監査: 観測した type 群をダンプ
  dumpSurchargeMap(fromDetails.map(x => String(x?.surchargeType || x?.type || x?.code || '').toUpperCase()))

  // === パッケージ単位の Additional Handling / Oversize サーチャージ選択 ===
  /**
   * パッケージ単位で AHS/Oversize サーチャージを抽出し、排他&選択ルールを適用
   * - Oversize があれば Oversize のみ採用、AHS は無効化
   * - Oversize が無ければ AHS 候補のうち金額が最大の1つだけ採用
   */
  function selectSpecialHandlingForPackage(pkg: any): { cat: AhsCategory; amount: number } | null {
    // packageRateDetail からサーチャージを取得
    const prd = (pkg as any)?.packageRateDetail || (pkg as any)?.packageRateDetails || (pkg as any)?.ratedPackageDetail
    const surArray: any[] = []
    if (prd) {
      if (Array.isArray(prd?.surcharges)) surArray.push(...prd.surcharges)
      if (Array.isArray(prd?.surCharges)) surArray.push(...prd.surCharges)
    }
    // パッケージ直下にもサーチャージがある場合をカバー
    if (Array.isArray((pkg as any)?.surcharges)) surArray.push(...(pkg as any).surcharges)
    if (Array.isArray((pkg as any)?.surCharges)) surArray.push(...(pkg as any).surCharges)

    if (surArray.length === 0) return null

    // Oversize を抽出
    const oversizeCandidates = surArray
      .map((s) => {
        const cat = classifySurchargeLabel(s)
        const amount = toNumber(s?.amount ?? s?.surchargeAmount ?? s?.totalAmount)
        return cat === 'OVERSIZE' ? { cat: cat as AhsCategory, amount } : null
      })
      .filter((x): x is { cat: AhsCategory; amount: number } => x !== null && x.cat === 'OVERSIZE')

    // Oversize があれば、最大額の1つを採用
    if (oversizeCandidates.length > 0) {
      const maxOversize = oversizeCandidates.reduce((max, x) => (x.amount > max.amount ? x : max), oversizeCandidates[0])
      return { cat: 'OVERSIZE', amount: Math.round(maxOversize.amount) }
    }

    // AHS 候補を抽出（Oversize 以外）
    const ahsCandidates = surArray
      .map((s) => {
        const cat = classifySurchargeLabel(s)
        const amount = toNumber(s?.amount ?? s?.surchargeAmount ?? s?.totalAmount)
        if (cat && cat !== 'OVERSIZE') {
          return { cat: cat as AhsCategory, amount }
        }
        return null
      })
      .filter((x): x is { cat: AhsCategory; amount: number } => x !== null && x.cat !== 'OVERSIZE')

    if (ahsCandidates.length === 0) return null

    // 金額が最大の1つだけを採用
    const maxAhs = ahsCandidates.reduce((max, x) => (x.amount > max.amount ? x : max), ahsCandidates[0])
    return { cat: maxAhs.cat, amount: Math.round(maxAhs.amount) }
  }

  // 全パッケージから採用分だけ集計
  let oversize = 0
  let ahsDimension = 0
  let ahsWeight = 0
  let ahsPackaging = 0
  let ahsNonStackable = 0

  // ratedShipmentDetails[0] の ratedPackages を対象
  const firstRsd = rated[0]
  if (firstRsd) {
    const ratedPkgs: any[] = []
    if (Array.isArray(firstRsd?.ratedPackages)) ratedPkgs.push(...firstRsd.ratedPackages)
    if (Array.isArray(firstRsd?.ratedPackageDetails)) ratedPkgs.push(...firstRsd.ratedPackageDetails)

    for (const pkg of ratedPkgs) {
      const pick = selectSpecialHandlingForPackage(pkg)
      if (!pick) continue

      switch (pick.cat) {
        case 'OVERSIZE':
          oversize += pick.amount
          break
        case 'AHS_DIMENSION':
          ahsDimension += pick.amount
          break
        case 'AHS_WEIGHT':
          ahsWeight += pick.amount
          break
        case 'AHS_PACKAGING':
          ahsPackaging += pick.amount
          break
        case 'AHS_NONSTACKABLE':
          ahsNonStackable += pick.amount
          break
      }
    }
  }


  // shipmentRateDetails 側に discounts がある場合の合算（取りこぼし防止）
  const discountsFromDetails = Math.max(
    0,
    Math.round(
      rated
        .flatMap((rsd: any) => (Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []))
        .flatMap((srd: any) => (Array.isArray(srd?.discounts) ? srd.discounts : []))
        .reduce((sum: number, d: any) => sum + toNumber(d?.amount), 0)
    )
  )

  // Fee detail keyベースで分類済みのサーチャージを集計
  // 注意: dimension/oversize/handling系はshipment単位で最大値のみ採用（パッケージ単位処理は後で上書き）
  const fuel = getCategorySum('FUEL')
  const peak = getCategorySum('PEAK')
  const residential = getCategorySum('RESIDENTIAL')
  const deliveryArea = getCategorySum('DELIVERY_AREA')
  const importProcessing = getCategorySum('IMPORT_PROCESSING')
  const saturdayDelivery = getCategorySum('SATURDAY_DELIVERY')
  const insuredValue = getCategorySum('INSURED_VALUE')
  
  // shipment単位での最大値採用（dimension/oversize/handling系）
  // 注意: パッケージ単位処理で上書きされるが、念のためshipment単位でも算出
  const oversizeShipment = getCategorySum('OVERSIZE')
  const ahsDimensionShipment = getCategorySum('AHS_DIMENSION')
  const ahsWeightShipment = getCategorySum('AHS_WEIGHT')
  const ahsPackagingShipment = getCategorySum('AHS_PACKAGING')
  const ahsNonStackableShipment = getCategorySum('AHS_NONSTACKABLE')

  // 割引（raw、base未依存）：clampしない生値（後で最小化）
  const discRaw = Math.max(0, disc + discountsFromDetails)

  // 既知サーチャージ合計（specialHandling はパッケージ単位で採用済み）
  // パッケージ単位のspecialHandling（oversize, ahsDimension等）が優先される
  const knownSurchargesSum = fuel + peak + residential + deliveryArea + importProcessing + saturdayDelivery + insuredValue
    + oversize + ahsDimension + ahsWeight + ahsPackaging + ahsNonStackable

  // === Base / Discount / NetFreight / Total の算出（FedEx API仕様準拠） ===
  // FedEx API仕様:
  // 1. totalBaseCharge = ベース料金（割引前）
  // 2. totalDiscounts = 割引額
  // 3. netFreight = totalBaseCharge - totalDiscounts
  // 4. totalNetCharge = netFreight + totalSurcharges
  
  // rsdごとのプローブ
  let s_totalBaseMax = 0
  let pkgBaseSumTotal = 0
  for (const rsd of rated) {
    const p = probeBase(rsd)
    if (p.s_totalBase > s_totalBaseMax) s_totalBaseMax = p.s_totalBase
    pkgBaseSumTotal += p.pkgBaseSum || 0
  }

  // Baseの決定: APIから直接取得 or 推定
  // 優先順位: totalBaseCharge > 推定（total - surcharges + discounts）
  let base = s_totalBaseMax
  if (base <= 0) {
    // 推定: base = total - surcharges + discounts
    const rawLinesWithoutBaseSum = knownSurchargesSum - discRaw
    base = computeBase({ s_totalBase: 0, s_totalNet: total, pkgBaseSum: pkgBaseSumTotal, rawLinesWithoutBaseSum })
  }
  if (base <= 0 && total > 0) base = total // 最後のセーフガード

  // Discount: APIから取得 or 推定（base を上限にクランプ）
  const discAll = Math.min(Math.max(0, discRaw), base)

  // NetFreight: base - discount（FedEx API仕様準拠）
  const netFreight = Math.max(0, base - discAll)
  
  // Total検証: netFreight + surcharges = totalNetCharge になるはず
  const calculatedTotal = netFreight + knownSurchargesSum
	const other = total - netFreight - fuel - peak - residential - deliveryArea - importProcessing - saturdayDelivery - insuredValue
    - oversize - ahsDimension - ahsWeight - ahsPackaging - ahsNonStackable

  const dto: RateBreakdown = {
    baseCharge: money(base, currency),
    discounts: money(discAll, currency),
    surcharges: {
      fuel: money(fuel, currency),
      peak: money(peak, currency),
      // 0円も行として表現するため、undefinedにせず0で保持
      residential: money(residential, currency),
      deliveryArea: money(deliveryArea, currency),
      importProcessing: money(importProcessing, currency),
      saturdayDelivery: money(saturdayDelivery, currency),
      insuredValue: money(insuredValue, currency),
      other: money(other, currency),
    },
    specialHandling: {
      oversize: oversize > 0 ? money(oversize, currency) : undefined,
      dimension: ahsDimension > 0 ? money(ahsDimension, currency) : undefined,
      weight: ahsWeight > 0 ? money(ahsWeight, currency) : undefined,
      packaging: ahsPackaging > 0 ? money(ahsPackaging, currency) : undefined,
      nonStackable: ahsNonStackable > 0 ? money(ahsNonStackable, currency) : undefined,
    },
    totalNetCharge: money(total, currency),
  }

  if (DEBUG_RATE_RAW && !rawLoggedOnce) {
    try {
      const rsdCount = Array.isArray(resp?.ratedShipmentDetails) ? resp.ratedShipmentDetails.length : 0
      const pkgTopCount = Array.isArray((resp as any)?.ratedPackageDetails) ? (resp as any).ratedPackageDetails.length : 0
      const sample = fromDetails.slice(0, 8).map((s: any) => ({
        type: s?.surchargeType ?? s?.type ?? s?.code,
        code: s?.code ?? s?.surchargeType ?? s?.type,
        name: s?.name,
        amount: toNumber(s?.amount),
        currency,
      }))
      // eslint-disable-next-line no-console
      console.debug('[normalizeFedExRate][raw]', {
        ratedShipmentDetails: rsdCount,
        ratedPackageDetails: pkgTopCount,
        totalNetCharge: total,
        currency,
        surchargesCount: fromDetails.length,
        surchargesSample: sample,
      })
      ;(normalizeFedExRate as any).__rawLoggedOnce = true
    } catch {}
  }

  // === Reconcileログ: raw vs normalized ===
  if (DEBUG_RATE_RECONCILE && !loggedOnce) {
    try {
      const rawVsNormalized = {
        raw: {
          totalNetCharge: total,
          totalBaseCharge: s_totalBaseMax,
          totalDiscounts: discRaw,
          totalSurcharges: knownSurchargesSum,
        },
        normalized: {
          baseCharge: base,
          discounts: discAll,
          netFreight,
          surcharges: {
            fuel,
            peak,
            residential,
            deliveryArea,
            importProcessing,
            saturdayDelivery,
            insuredValue,
            specialHandling: {
              oversize,
              dimension: ahsDimension,
              weight: ahsWeight,
              packaging: ahsPackaging,
              nonStackable: ahsNonStackable,
            },
            other,
          },
          totalNetCharge: calculatedTotal,
        },
        reconciliation: {
          totalMatch: Math.abs(calculatedTotal - total) <= 1,
          diff: calculatedTotal - total,
          baseSource: s_totalBaseMax > 0 ? 'API' : 'ESTIMATED',
        },
      }
      // eslint-disable-next-line no-console
      console.debug('[rate][reconcile][raw vs normalized]', rawVsNormalized)
      ;(normalizeFedExRate as any).__loggedOnce = true
    } catch {}
  }

  if (DEBUG_RATE_NORMALIZE && !loggedOnce) {
    try {
      const summary = {
        base,
        discounts: discAll,
        netFreight,
        fuel,
        peak,
        residential,
        deliveryArea,
        specialHandling: { oversize, dimension: ahsDimension, weight: ahsWeight, packaging: ahsPackaging, nonStackable: ahsNonStackable },
        importProcessing,
        saturdayDelivery,
        insuredValue,
        other,
        total,
        calculatedTotal,
        diff: calculatedTotal - total,
      }
      // eslint-disable-next-line no-console
      console.debug('[normalizeFedExRate][debug]', summary)
      ;(normalizeFedExRate as any).__loggedOnce = true
    } catch {}
  }

  // 不変条件の簡易アサート（開発時のみ）
  if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    try {
      const eps = 1
      const uiSum = Math.round((base - discAll) + (fuel + peak + residential + deliveryArea + importProcessing + insuredValue + other + oversize + ahsDimension + ahsWeight + ahsPackaging + ahsNonStackable))
      if (base <= 0) console.warn('[rate][base-assert] base<=0. Inspect [rate][base-probe] logs.')
      if (Math.abs(uiSum - total) > eps) {
        console.warn('[rate][sum-assert] UI sum != totalNet', { uiSum, totalNetJPY: total })
      }
    } catch {}
  }

  return dto
}


