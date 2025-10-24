/**
 * Quote breakdown helpers
 * - FedEx Rate API 応答の明細からサーチャージを抽出するユーティリティ
 */

function toNumber(value: any): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  if (typeof value === 'object') {
    const inner = (value as any)?.amount ?? (value as any)?.value ?? undefined
    if (typeof inner === 'number' && Number.isFinite(inner)) return inner
    if (typeof inner === 'string' && inner.trim() !== '' && Number.isFinite(Number(inner))) return Number(inner)
  }
  return undefined
}

/**
 * FedExの rateReplyDetails の要素(detail)から、Residential系サーチャージを合算して返す。
 * 該当がなければ undefined。
 */
export function extractResidentialSurchargeFromRateDetail(detail: any): number | undefined {
  try {
    let total = 0

    const ratedShipmentDetails = Array.isArray(detail?.ratedShipmentDetails) ? detail.ratedShipmentDetails : []
    for (const rsd of ratedShipmentDetails) {
      // パス1: shipmentRateDetails[].surcharges[]
      const shipmentRateDetails = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
      for (const srd of shipmentRateDetails) {
        const surcharges = Array.isArray(srd?.surcharges) ? srd.surcharges : []
        for (const s of surcharges) {
          const text = [s?.surchargeType, s?.type, s?.name, s?.description, s?.category]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (text.includes('residential')) {
            const amt = toNumber(s?.amount)
            if (typeof amt === 'number') total += amt
          }
        }
      }

      // パス2: rsd.surcharges 直下（保険的対応）
      const directSurcharges = Array.isArray(rsd?.surcharges) ? rsd.surcharges : []
      for (const s of directSurcharges) {
        const text = [s?.surchargeType, s?.type, s?.name, s?.description, s?.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (text.includes('residential')) {
          const amt = toNumber(s?.amount)
          if (typeof amt === 'number') total += amt
        }
      }
    }

    return total > 0 ? Math.round(total) : undefined
  } catch {
    return undefined
  }
}

/**
 * FedExの rateReplyDetails の要素(detail)から、Insured Value（Declared/Insured）の金額合算を推定して返す。
 * 正規の保険料キーが無い場合があるため、名称に insured/declared を含む要素の amount を合算。
 */
export function extractInsuredValueFromRateDetail(detail: any): number | undefined {
  try {
    let total = 0
    const ratedShipmentDetails = Array.isArray(detail?.ratedShipmentDetails) ? detail.ratedShipmentDetails : []
    for (const rsd of ratedShipmentDetails) {
      const shipmentRateDetails = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
      for (const srd of shipmentRateDetails) {
        const surcharges = Array.isArray(srd?.surcharges) ? srd.surcharges : []
        for (const s of surcharges) {
          const text = [s?.surchargeType, s?.type, s?.name, s?.description, s?.category]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (text.includes('insured') || text.includes('declared')) {
            const amt = toNumber(s?.amount)
            if (typeof amt === 'number') total += amt
          }
        }
      }
    }
    return total > 0 ? Math.round(total) : undefined
  } catch {
    return undefined
  }
}


