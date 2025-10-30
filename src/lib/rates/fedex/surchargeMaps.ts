/**
 * FedEx Additional Handling / Oversize サーチャージの分類定義
 * 
 * 排他ルール: Oversize が出たパッケージでは AHS を無効化
 * 選択ルール: AHS が複数出た場合は金額が最大の1つだけを採用
 */

export type AhsCategory = 'OVERSIZE' | 'AHS_DIMENSION' | 'AHS_WEIGHT' | 'AHS_PACKAGING' | 'AHS_NONSTACKABLE'

/**
 * サーチャージカテゴリの正規表現パターン
 * 英語/日本語/大文字小文字/ハイフン/スペース差異に対応
 */
export const SURCHARGE_PATTERNS: Record<AhsCategory, RegExp> = {
  OVERSIZE: /(OVERSIZE|長尺|超過|DIMENSIONAL[\s_-]*OVERSIZE|非?標準(サイズ|寸法)|LONGEST[\s_-]*DIMENSION)/i,
  AHS_DIMENSION: /(ADDITIONAL[\s_-]*HANDLING).*(DIM|SIZE|DIMENSION|寸法|長辺|最長辺|LONGEST)/i,
  AHS_WEIGHT: /(ADDITIONAL[\s_-]*HANDLING).*(WEIGHT|重量)/i,
  AHS_PACKAGING: /(ADDITIONAL[\s_-]*HANDLING).*(PACK|PACKAGING|TUBE|CYLINDER|梱包|筒|缶)/i,
  AHS_NONSTACKABLE: /(NON[\s_-]*STACKABLE|非積載|パレット.*非積載)/i,
}

/**
 * サーチャージオブジェクトを分類する
 * @param s サーチャージオブジェクト（type/surchargeType/code/name/description を含む）
 * @returns 分類カテゴリ、該当なしの場合は null
 */
export function classifySurchargeLabel(s: any): AhsCategory | null {
  if (!s) return null
  
  const text = [
    s?.type,
    s?.surchargeType,
    s?.code,
    s?.name,
    s?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  for (const [cat, rx] of Object.entries(SURCHARGE_PATTERNS)) {
    if (rx.test(text)) {
      return cat as AhsCategory
    }
  }
  
  return null
}

