/**
 * FedEx Rate API レスポンスの正規化
 * 
 * 列挙値ベースのマッピングに完全寄せ、正規表現依存を排除
 * 
 * 計算順（FedEx正準）:
 * 1. base = totalBaseCharge
 * 2. discounts = totalDiscounts（負値として扱う）
 * 3. netFreight = base - discounts
 * 4. totalNetCharge = netFreight + Σsurcharges
 * 
 * 重複集計防止:
 * - shipmentRateDetail.totalSurcharges が明示内訳（surcharges[]）を持つ場合 → shipment側のみ採用
 * - そうでない場合 → packageRateDetail.surcharges[] を総和
 * 
 * AHS/Oversize 排他ルール:
 * - パッケージ単位で Oversize があれば Oversize のみ、無ければ AHS 最大1つ
 */

import type { RateBreakdown, TransitInfo } from '@/types/rate'
import type { Money } from '@/types/money'
import { classifySurcharge, deriveDeliveryAreaLevel, type SurchargeCategory } from './fedex/mapping'
import { classifySurchargeLabel, type AhsCategory } from './fedex/surchargeMaps'

const money = (amount: number, currency: string): Money => ({ amount, currency })

export function pickTransit(x: any): TransitInfo {
  const od = x?.operationalDetail || x?.commit || x?.transitDetail || {}
  const date = od.deliveryDate || od.estimatedDeliveryDate || od.commitDate || null
  const weekday = od.deliveryDayOfWeek || od.commitDayOfWeek || null
  const rawTime = od.deliveryTime || od.commitTime || od.estimatedDeliveryTime || null
  // HH:MM に正規化（なければ null）
  const time = typeof rawTime === 'string' ? (rawTime.match(/\d{1,2}:\d{2}/)?.[0] || null) : null
  const transit = od.transitTime || (typeof od.transitDays === 'number' ? String(od.transitDays) : null)
  return { deliveryDate: date, deliveryDayOfWeek: weekday, deliveryTime: time, transitTime: transit }
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
 */
export function normalizeFedExRate(resp: any, fallbackCurrency = 'JPY'): RateBreakdown {
  const DEBUG_RATE_RECONCILE = String(process.env.DEBUG_RATE_RECONCILE || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_RECONCILE === '1'
  const DEBUG_RATE_RAW = String(process.env.DEBUG_RATE_RAW || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_RAW === '1'
  
  // 1回だけのログ出力ガード
  const loggedOnce = (normalizeFedExRate as any).__loggedOnce === true
  const rawLoggedOnce = (normalizeFedExRate as any).__rawLoggedOnce === true
  
  const rated = Array.isArray(resp?.ratedShipmentDetails) ? resp.ratedShipmentDetails : []
  const first = rated[0] || {}
  const totalObj = first?.totalNetCharge || resp?.totalNetCharge
  const currency = String(resp?.currency || totalObj?.currency || fallbackCurrency)
  const total = Math.round(toNumber(totalObj))

  // === 1. Base計算（FedEx正準: totalBaseCharge を優先） ===
  function probeBase(rsd: any): { totalBase: number; totalDiscounts: number; pkgBaseSum: number } {
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
        if (Number.isFinite(b) && b > 0) pkgBases.push(b)
      }
      
      const s_totalBase = Number((srd?.totalBaseCharge?.amount ?? srd?.totalBaseCharge ?? srd?.baseCharge?.amount ?? srd?.baseCharge) || 0)
      const s_totalDisc = Number((srd?.totalDiscounts?.amount ?? srd?.totalDiscounts) || 0)
      
      return {
        totalBase: s_totalBase,
        totalDiscounts: s_totalDisc,
        pkgBaseSum: pkgBases.reduce((a, b) => a + b, 0)
      }
    } catch {
      return { totalBase: 0, totalDiscounts: 0, pkgBaseSum: 0 }
    }
  }

  // ratedShipmentDetails から Base/Discount を取得（shipment優先）
  let base = 0
  let discounts = 0
  let pkgBaseSumTotal = 0
  let baseSource: 'shipment' | 'package' = 'shipment'
  let discountsSource: 'shipment' | 'package' = 'shipment'
  
  for (const rsd of rated) {
    const p = probeBase(rsd)
    if (p.totalBase > base) base = p.totalBase
    if (p.totalDiscounts > discounts) discounts = p.totalDiscounts
    pkgBaseSumTotal += p.pkgBaseSum
  }
  
  // Base フォールバック: packageRateDetail.baseCharge の合計（shipmentが無い場合のみ）
  if (base <= 0 && pkgBaseSumTotal > 0) {
    base = Math.round(pkgBaseSumTotal)
    baseSource = 'package'
  }
  
  // Discounts フォールバック（shipmentが無い場合のみ）
  if (discounts <= 0) {
    // package側のdiscountsは通常無いが、念のため
    discountsSource = 'package'
  }
  
  // Base 最終フォールバック: 推定（total - surcharges + discounts）
  // ただし、surcharges がまだ未計算なので後で調整

  // === 2. サーチャージ収集（重複集計防止） ===
  /**
   * 重複集計防止ルール:
   * - shipmentRateDetail.totalSurcharges が明示内訳（surcharges[]）を持つ場合 → shipment側のみ採用
   * - そうでない場合 → packageRateDetail.surcharges[] を総和
   */
  
  // shipment側のサーチャージ
  const shipmentSurcharges: any[] = []
  // package側のサーチャージ（shipment側が明示内訳を持たない場合のみ使用）
  const packageSurcharges: any[] = []
  
  const firstRsd = rated[0]
  if (firstRsd) {
    const srd = (Array.isArray(firstRsd?.shipmentRateDetails) ? firstRsd?.shipmentRateDetails?.[0] : firstRsd?.shipmentRateDetail) || firstRsd
    
    // shipment側のサーチャージ配列を取得
    const shipmentSurchargesArray = Array.isArray(srd?.surcharges) ? srd.surcharges : Array.isArray(srd?.surCharges) ? srd.surCharges : []
    
    if (shipmentSurchargesArray.length > 0) {
      // shipment側に明示内訳がある場合 → shipment側のみ採用
      shipmentSurcharges.push(...shipmentSurchargesArray)
    } else {
      // shipment側に明示内訳がない場合 → package側を収集
      const ratedPkgs: any[] = []
      if (Array.isArray(firstRsd?.ratedPackages)) ratedPkgs.push(...firstRsd.ratedPackages)
      if (Array.isArray(firstRsd?.ratedPackageDetails)) ratedPkgs.push(...firstRsd.ratedPackageDetails)
      
      for (const pkg of ratedPkgs) {
        const prd = (pkg as any)?.packageRateDetail || (pkg as any)?.packageRateDetails || (pkg as any)?.ratedPackageDetail
        if (prd) {
          if (Array.isArray(prd?.surcharges)) packageSurcharges.push(...prd.surcharges)
          if (Array.isArray(prd?.surCharges)) packageSurcharges.push(...prd.surCharges)
        }
        // パッケージ直下にもサーチャージがある場合をカバー
        if (Array.isArray((pkg as any)?.surcharges)) packageSurcharges.push(...(pkg as any).surcharges)
        if (Array.isArray((pkg as any)?.surCharges)) packageSurcharges.push(...(pkg as any).surCharges)
      }
    }
  }

  // 使用するサーチャージリスト（shipment優先、なければpackage）
  const surchargesToUse = shipmentSurcharges.length > 0 ? shipmentSurcharges : packageSurcharges

  // === デバッグログ（devのみ、1回だけ） ===
  if (DEBUG_RATE_RAW && !rawLoggedOnce && process.env.NODE_ENV !== 'production') {
    try {
      const shipmentTable = shipmentSurcharges.map((s: any) => ({
        level: 'SHIPMENT',
        surchargeType: s?.surchargeType || s?.type || '',
        code: s?.code || '',
        amount: toNumber(s?.amount),
        description: s?.description || s?.name || '',
      }))
      
      const packageTable = packageSurcharges.map((s: any) => ({
        level: 'PACKAGE',
        surchargeType: s?.surchargeType || s?.type || '',
        code: s?.code || '',
        amount: toNumber(s?.amount),
        description: s?.description || s?.name || '',
      }))
      
      if (shipmentTable.length > 0) {
        // eslint-disable-next-line no-console
        console.table(shipmentTable)
      }
      if (packageTable.length > 0) {
        // eslint-disable-next-line no-console
        console.table(packageTable)
      }
      
      ;(normalizeFedExRate as any).__rawLoggedOnce = true
    } catch {}
  }

  // === 3. サーチャージ分類（列挙値ベース） ===
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

  for (const s of surchargesToUse) {
    const cat = classifySurcharge(s)
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

  // === 4. パッケージ単位の AHS/Oversize 選択（排他ルール） ===
  /**
   * パッケージ単位で AHS/Oversize サーチャージを抽出し、排他&選択ルールを適用
   * - Oversize があれば Oversize のみ採用、AHS は無効化
   * - Oversize が無ければ AHS 候補のうち金額が最大の1つだけ採用
   */
  function selectSpecialHandlingForPackage(pkg: any): { cat: AhsCategory; amount: number } | null {
    const prd = (pkg as any)?.packageRateDetail || (pkg as any)?.packageRateDetails || (pkg as any)?.ratedPackageDetail
    const surArray: any[] = []
    if (prd) {
      if (Array.isArray(prd?.surcharges)) surArray.push(...prd.surcharges)
      if (Array.isArray(prd?.surCharges)) surArray.push(...prd.surCharges)
    }
    if (Array.isArray((pkg as any)?.surcharges)) surArray.push(...(pkg as any).surcharges)
    if (Array.isArray((pkg as any)?.surCharges)) surArray.push(...(pkg as any).surCharges)

    if (surArray.length === 0) return null

    // Oversize を抽出（列挙値ベース）
    const oversizeCandidates = surArray
      .map((s) => {
        const cat = classifySurcharge(s) === 'OVERSIZE' ? 'OVERSIZE' : classifySurchargeLabel(s) === 'OVERSIZE' ? 'OVERSIZE' : null
        const amount = toNumber(s?.amount ?? s?.surchargeAmount ?? s?.totalAmount)
        return cat === 'OVERSIZE' ? { cat: 'OVERSIZE' as AhsCategory, amount } : null
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
        const catEnum = classifySurcharge(s)
        const catLabel = classifySurchargeLabel(s)
        const amount = toNumber(s?.amount ?? s?.surchargeAmount ?? s?.totalAmount)
        
        let cat: AhsCategory | null = null
        if (catEnum === 'AHS_DIMENSION' || catLabel === 'AHS_DIMENSION') cat = 'AHS_DIMENSION'
        else if (catEnum === 'AHS_WEIGHT' || catLabel === 'AHS_WEIGHT') cat = 'AHS_WEIGHT'
        else if (catEnum === 'AHS_PACKAGING' || catLabel === 'AHS_PACKAGING') cat = 'AHS_PACKAGING'
        else if (catEnum === 'AHS_NONSTACKABLE' || catLabel === 'AHS_NONSTACKABLE') cat = 'AHS_NONSTACKABLE'
        
        return cat ? { cat, amount } : null
      })
      .filter((x): x is { cat: AhsCategory; amount: number } => x !== null)

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

  // === 5. サーチャージ集計（specialHandling はパッケージ単位で採用済み） ===
  // 通常サーチャージ（specialHandling以外）を集計
  // Delivery Area, Import Processing は shipment/package どちらか一方から（重複防止済み）
  
  // 燃料割増金の唯一ソース化: shipment側があればそれだけ採用、package側は無視
  let fuel = 0
  let fuelSource: 'shipment' | 'package' = 'package'
  if (shipmentSurcharges.length > 0) {
    // shipment側のFUELのみ採用
    const shipmentFuel = shipmentSurcharges
      .filter(s => classifySurcharge(s) === 'FUEL')
      .reduce((sum, s) => sum + toNumber(s?.amount), 0)
    fuel = Math.round(shipmentFuel)
    fuelSource = 'shipment'
  } else {
    // package側を集計
    fuel = Math.round(surchargesByCategory.FUEL.reduce((sum, x) => sum + x.amount, 0))
    fuelSource = 'package'
  }
  const peak = Math.round(surchargesByCategory.PEAK.reduce((sum, x) => sum + x.amount, 0))
  const residential = Math.round(surchargesByCategory.RESIDENTIAL.reduce((sum, x) => sum + x.amount, 0))
  const deliveryArea = Math.round(surchargesByCategory.DELIVERY_AREA.reduce((sum, x) => sum + x.amount, 0))
  
  // Delivery Area レベル判定（amount フォールバック対応）
  let deliveryAreaLevel: 'A' | 'B' | undefined = undefined
  if (deliveryArea > 0) {
    // shipment側またはpackage側のDelivery Areaサーチャージからレベルを抽出
    const deliveryAreaSurcharges = surchargesByCategory.DELIVERY_AREA
    for (const { s } of deliveryAreaSurcharges) {
      const level = deriveDeliveryAreaLevel({
        code: s?.code,
        description: s?.description,
        name: s?.name,
        amount: toNumber(s?.amount),
      })
      if (level) {
        deliveryAreaLevel = level
        break
      }
    }
  }
  
  const importProcessing = Math.round(surchargesByCategory.IMPORT_PROCESSING.reduce((sum, x) => sum + x.amount, 0))
  const saturdayDelivery = Math.round(surchargesByCategory.SATURDAY_DELIVERY.reduce((sum, x) => sum + x.amount, 0))
  const insuredValue = Math.round(surchargesByCategory.INSURED_VALUE.reduce((sum, x) => sum + x.amount, 0))

  // Base 最終フォールバック: 推定（total - surcharges + discounts）
  if (base <= 0) {
    const knownSurchargesSum = fuel + peak + residential + deliveryArea + importProcessing + saturdayDelivery + insuredValue
      + oversize + ahsDimension + ahsWeight + ahsPackaging + ahsNonStackable
    base = Math.max(0, Math.round(total - knownSurchargesSum + discounts))
  }
  if (base <= 0 && total > 0) base = total // 最後のセーフガード

  // Discount: base を上限にクランプ
  discounts = Math.min(Math.max(0, discounts), base)

  // NetFreight: base - discounts（FedEx API仕様準拠）
  const netFreight = Math.max(0, base - discounts)

  // === 6. Other サーチャージ計算 ===
  const knownSurchargesSum = fuel + peak + residential + deliveryArea + importProcessing + saturdayDelivery + insuredValue
    + oversize + ahsDimension + ahsWeight + ahsPackaging + ahsNonStackable
  
  const other = Math.max(0, total - netFreight - knownSurchargesSum)

  // === 7. 検証: base - discounts + Σsurcharges == totalNetCharge (±1円以内) ===
  const calculatedTotal = netFreight + knownSurchargesSum + other
  const diff = Math.abs(calculatedTotal - total)

  // Reconcileログ（devのみ、1回だけ）
  if (DEBUG_RATE_RECONCILE && !loggedOnce && process.env.NODE_ENV !== 'production') {
    try {
      const reconcile = {
        base,
        discounts,
        fuelSource,
        baseSource,
        discountsSource,
        surchargesByCat: {
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
        uiSum: calculatedTotal,
        totalNet: total,
        diff,
      }
      // eslint-disable-next-line no-console
      console.warn('[rate][reconcile]', reconcile)
      ;(normalizeFedExRate as any).__loggedOnce = true
    } catch {}
  }

  // 恒等式アサート（devのみ）
  if (process.env.NODE_ENV !== 'production') {
    if (base <= 0) {
      // eslint-disable-next-line no-console
      console.warn('[rate][base-assert] base<=0. Inspect base calculation.')
    }
    // 恒等式: abs((base - discounts + Σsurcharges) - totalNetCharge) <= 1
    if (diff > 1) {
      // eslint-disable-next-line no-console
      console.warn('[rate][sum-assert] mismatch', { 
        uiSum: calculatedTotal, 
        totalNet: total,
        diff,
        base,
        discounts,
        surchargesByCat: {
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
        }
      })
    }
  }

  const t = pickTransit(resp)
  const dto: RateBreakdown = {
    baseCharge: money(base, currency),
    discounts: money(discounts, currency),
    surcharges: {
      fuel: fuel > 0 ? money(fuel, currency) : undefined,
      peak: peak > 0 ? money(peak, currency) : undefined,
      residential: residential > 0 ? money(residential, currency) : undefined,
      deliveryArea: deliveryArea > 0 ? money(deliveryArea, currency) : undefined,
      importProcessing: importProcessing > 0 ? money(importProcessing, currency) : undefined,
      saturdayDelivery: saturdayDelivery > 0 ? money(saturdayDelivery, currency) : undefined,
      insuredValue: insuredValue > 0 ? money(insuredValue, currency) : undefined,
      other: other > 0 ? money(other, currency) : undefined,
    },
    specialHandling: {
      oversize: oversize > 0 ? money(oversize, currency) : undefined,
      dimension: ahsDimension > 0 ? money(ahsDimension, currency) : undefined,
      weight: ahsWeight > 0 ? money(ahsWeight, currency) : undefined,
      packaging: ahsPackaging > 0 ? money(ahsPackaging, currency) : undefined,
      nonStackable: ahsNonStackable > 0 ? money(ahsNonStackable, currency) : undefined,
    },
    deliveryAreaLevel,
    transit: t,
    totalNetCharge: money(total, currency),
  }

  return dto
}
