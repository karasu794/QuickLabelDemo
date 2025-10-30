/**
 * FedEx API fee detail keyマッピング
 * 
 * FedEx APIレスポンスの surchargeType / type / code を
 * breakdown のカテゴリに直接マッピングする
 */

export type SurchargeCategory = 
  | 'FUEL'
  | 'PEAK'
  | 'RESIDENTIAL'
  | 'DELIVERY_AREA'
  | 'IMPORT_PROCESSING'
  | 'SATURDAY_DELIVERY'
  | 'INSURED_VALUE'
  | 'OVERSIZE'
  | 'AHS_DIMENSION'
  | 'AHS_WEIGHT'
  | 'AHS_PACKAGING'
  | 'AHS_NONSTACKABLE'

/**
 * FedEx fee detail key → カテゴリマッピング
 * 
 * FedEx APIの標準的な surchargeType / type / code を基に分類
 * 複数のキーが該当する場合は、より具体的なものを優先
 */
export const FEE_DETAIL_KEY_MAP: Record<string, SurchargeCategory> = {
  // Fuel Surcharge
  'FUEL': 'FUEL',
  'FUEL_SURCHARGE': 'FUEL',
  'FSC': 'FUEL',
  
  // Peak / Demand Surcharge
  'PEAK': 'PEAK',
  'PEAK_SEASON': 'PEAK',
  'DEMAND': 'PEAK',
  'SURGE': 'PEAK',
  'CONGESTION': 'PEAK',
  
  // Residential Delivery
  'RESIDENTIAL': 'RESIDENTIAL',
  'RESIDENTIAL_DELIVERY': 'RESIDENTIAL',
  'RESIDENTIAL_SURCHARGE': 'RESIDENTIAL',
  
  // Delivery Area / Remote Area
  'DELIVERY_AREA': 'DELIVERY_AREA',
  'EXTENDED_DELIVERY_AREA': 'DELIVERY_AREA',
  'REMOTE_AREA': 'DELIVERY_AREA',
  'ODA': 'DELIVERY_AREA',
  'OUT_OF_DELIVERY_AREA': 'DELIVERY_AREA',
  
  // Import Processing / Customs Clearance
  'IMPORT_PROCESSING': 'IMPORT_PROCESSING',
  'IMPORT_CLEARANCE': 'IMPORT_PROCESSING',
  'CUSTOMS_ENTRY': 'IMPORT_PROCESSING',
  'CLEARANCE': 'IMPORT_PROCESSING',
  'CUSTOMS_CLEARANCE': 'IMPORT_PROCESSING',
  
  // Saturday Delivery
  'SATURDAY_DELIVERY': 'SATURDAY_DELIVERY',
  'WEEKEND_DELIVERY': 'SATURDAY_DELIVERY',
  'SATURDAY_PICKUP': 'SATURDAY_DELIVERY',
  
  // Insured / Declared Value
  'DECLARED_VALUE': 'INSURED_VALUE',
  'INSURED_VALUE': 'INSURED_VALUE',
  'DECLARED': 'INSURED_VALUE',
  'INSURED': 'INSURED_VALUE',
  
  // Oversize
  'OVERSIZE': 'OVERSIZE',
  'DIMENSIONAL_OVERSIZE': 'OVERSIZE',
  'OVERSIZE_PACKAGE': 'OVERSIZE',
  
  // Additional Handling - Dimension
  'ADDITIONAL_HANDLING_DIMENSION': 'AHS_DIMENSION',
  'AHS_DIMENSION': 'AHS_DIMENSION',
  'ADDITIONAL_HANDLING_SIZE': 'AHS_DIMENSION',
  
  // Additional Handling - Weight
  'ADDITIONAL_HANDLING_WEIGHT': 'AHS_WEIGHT',
  'AHS_WEIGHT': 'AHS_WEIGHT',
  
  // Additional Handling - Packaging
  'ADDITIONAL_HANDLING_PACKAGING': 'AHS_PACKAGING',
  'AHS_PACKAGING': 'AHS_PACKAGING',
  'ADDITIONAL_HANDLING_TUBE': 'AHS_PACKAGING',
  'ADDITIONAL_HANDLING_CYLINDER': 'AHS_PACKAGING',
  
  // Additional Handling - Non-Stackable
  'NON_STACKABLE': 'AHS_NONSTACKABLE',
  'AHS_NONSTACKABLE': 'AHS_NONSTACKABLE',
}

/**
 * サーチャージオブジェクトからカテゴリを判定
 * 
 * @param s サーチャージオブジェクト
 * @returns カテゴリ、該当なしの場合は null
 */
export function classifySurchargeByFeeDetailKey(s: any): SurchargeCategory | null {
  if (!s) return null
  
  // 優先順位: surchargeType > type > code
  const keys = [
    s?.surchargeType,
    s?.type,
    s?.code,
  ]
    .filter(Boolean)
    .map((k) => String(k).toUpperCase().trim())
  
  for (const key of keys) {
    if (FEE_DETAIL_KEY_MAP[key]) {
      return FEE_DETAIL_KEY_MAP[key]
    }
  }
  
  return null
}

/**
 * カテゴリが最大値採用対象かどうか
 */
export function isMaxValueCategory(cat: SurchargeCategory): boolean {
  return [
    'OVERSIZE',
    'AHS_DIMENSION',
    'AHS_WEIGHT',
    'AHS_PACKAGING',
    'AHS_NONSTACKABLE',
  ].includes(cat)
}

