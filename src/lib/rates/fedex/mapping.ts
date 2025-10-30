/**
 * FedEx Rate API 列挙値ベースの厳密マッピング定義
 * 
 * 出典:
 * - docs/fedex_api_specs/samples/docs-examples/rate-v1-docs-res-00.json
 * - docs/fedex_api_specs/md/rate-v1-docs.md
 * - src/lib/rates/fedex/feeDetailKeys.ts (既存実装の参照)
 * 
 * 正規表現依存を排除し、surchargeType/code の列挙値で厳密に分類
 */

/**
 * serviceType → 表示名マッピング（FedEx公式表記準拠）
 */
export const SERVICE_TYPE_DISPLAY_MAP: Record<string, string> = {
  'INTERNATIONAL_PRIORITY': 'FedEx International Priority®',
  'INTERNATIONAL_PRIORITY_EXPRESS': 'FedEx International Priority® Express',
  'INTERNATIONAL_ECONOMY': 'FedEx International Economy®',
  'INTERNATIONAL_FIRST': 'FedEx International First®', // 除外対象だが定義は残す
  'FEDEX_INTERNATIONAL_PRIORITY': 'FedEx International Priority®',
  'FEDEX_INTERNATIONAL_ECONOMY': 'FedEx International Economy®',
  'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight®',
  'STANDARD_OVERNIGHT': 'FedEx Standard Overnight®',
  'FIRST_OVERNIGHT': 'FedEx First Overnight®',
  'FEDEX_2_DAY': 'FedEx 2Day®',
  'FEDEX_EXPRESS_SAVER': 'FedEx Express Saver®',
  'FEDEX_GROUND': 'FedEx Ground®',
}

/**
 * サーチャージカテゴリ型定義
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
 * surchargeType列挙値 → カテゴリマッピング（優先的に使用）
 * 
 * 優先順位: surchargeType > type > code
 */
export const SURCHARGE_TYPE_MAP: Record<string, SurchargeCategory> = {
  // Fuel Surcharge
  'FUEL': 'FUEL',
  'FUEL_SURCHARGE': 'FUEL',
  'FSC': 'FUEL',
  
  // Peak / Demand / Seasonal Surcharge
  'PEAK': 'PEAK',
  'PEAK_SEASON': 'PEAK',
  'DEMAND': 'PEAK',
  'SURGE': 'PEAK',
  'CONGESTION': 'PEAK',
  
  // Residential Delivery
  'RESIDENTIAL': 'RESIDENTIAL',
  'RESIDENTIAL_DELIVERY': 'RESIDENTIAL',
  'RESIDENTIAL_SURCHARGE': 'RESIDENTIAL',
  
  // Delivery Area / Remote Area (レベルA/Bは deriveDeliveryAreaLevel で判定)
  'DELIVERY_AREA': 'DELIVERY_AREA',
  'EXTENDED_DELIVERY_AREA': 'DELIVERY_AREA',
  'REMOTE_AREA': 'DELIVERY_AREA',
  'ODA': 'DELIVERY_AREA',
  'OUT_OF_DELIVERY_AREA': 'DELIVERY_AREA',
  
  // Import Processing / Customs Clearance (米国輸入処理手数料)
  'IMPORT_PROCESSING': 'IMPORT_PROCESSING',
  'IMPORT_CLEARANCE': 'IMPORT_PROCESSING',
  'CUSTOMS_ENTRY': 'IMPORT_PROCESSING',
  'CLEARANCE': 'IMPORT_PROCESSING',
  'CUSTOMS_CLEARANCE': 'IMPORT_PROCESSING',
  
  // Saturday Delivery / Weekend Delivery
  'SATURDAY_DELIVERY': 'SATURDAY_DELIVERY',
  'WEEKEND_DELIVERY': 'SATURDAY_DELIVERY',
  'SATURDAY_PICKUP': 'SATURDAY_DELIVERY',
  
  // Insured / Declared Value
  'DECLARED_VALUE': 'INSURED_VALUE',
  'INSURED_VALUE': 'INSURED_VALUE',
  'DECLARED': 'INSURED_VALUE',
  'INSURED': 'INSURED_VALUE',
  
  // Oversize (AHSと排他)
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
 * code列挙値 → カテゴリマッピング（surchargeTypeが無い場合の補助）
 * 
 * 今は空でOK。未知コード対応用として拡張可能
 */
export const SURCHARGE_CODE_MAP: Record<string, SurchargeCategory> = {
  // 必要に応じて追加
}

/**
 * Delivery Area のレベルA/Bを判定
 * 
 * description/code/name から "LEVEL A" / "LEVEL B" / "LEV_A" / "LEV_B" などを検出
 * 正規表現ベースで柔軟にマッチング
 * 
 * @param s サーチャージオブジェクト（code, description, name を含む）
 * @returns 'A' | 'B' | null
 */
export function deriveDeliveryAreaLevel(s: { code?: string; description?: string; name?: string }): 'A' | 'B' | null {
  const text = [
    s.code,
    s.description,
    s.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
  
  // レベルAのパターン: LEVEL A, LEV_A, LEV A など
  if (/\bLEVEL\s*A\b|\bLEV_?A\b/i.test(text)) {
    return 'A'
  }
  
  // レベルBのパターン: LEVEL B, LEV_B, LEV B など
  if (/\bLEVEL\s*B\b|\bLEV_?B\b/i.test(text)) {
    return 'B'
  }
  
  return null
}

/**
 * surchargeType/code からカテゴリを判定（列挙値優先、正規表現禁止）
 * 
 * 優先順位: surchargeType > type > code
 * 
 * @param s サーチャージオブジェクト（surchargeType, type, code を含む）
 * @returns カテゴリ、該当なしの場合は null
 */
export function classifySurcharge(s: { surchargeType?: string; type?: string; code?: string }): SurchargeCategory | null {
  if (!s) return null
  
  const keys = [
    s.surchargeType,
    s.type,
    s.code,
  ]
    .filter(Boolean)
    .map(k => String(k).toUpperCase().trim())
  
  // surchargeType を優先的にチェック
  for (const key of keys) {
    if (SURCHARGE_TYPE_MAP[key]) {
      return SURCHARGE_TYPE_MAP[key]
    }
  }
  
  // code もチェック（補助的）
  for (const key of keys) {
    if (SURCHARGE_CODE_MAP[key]) {
      return SURCHARGE_CODE_MAP[key]
    }
  }
  
  return null
}

/**
 * RateType 列挙値
 */
export type RateType = 'ACCOUNT' | 'LIST' | 'PREFERRED_INCENTIVE' | 'PREFERRED_CURRENCY'

