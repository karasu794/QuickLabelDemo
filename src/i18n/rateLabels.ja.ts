/**
 * 見積もり内訳の日本語ラベル定義
 * 
 * FedEx Rate APIの内訳表示用ラベル
 */

export const rateLabelsJa = {
  // 基本項目
  baseCharge: '基本料金',
  discounts: '数量割引',
  
  // サーチャージ
  fuelSurcharge: '燃料割増金',
  peakSurcharge: '混雑時割増金',
  residentialSurcharge: '個人宅加算',
  outOfDeliveryArea: '配達地域外',
  outOfDeliveryAreaLevelA: '配達地域外（レベルA）',
  outOfDeliveryAreaLevelB: '配達地域外（レベルB）',
  usImportProcessingFee: '米国輸入処理手数料',
  saturdayDelivery: '土曜配達',
  declaredValue: '保険料（申告価格）',
  additionalHandlingSurcharge: '特別取扱い',
  otherSurcharge: 'その他特別手数料',
  
  // Special Handling（AHS/Oversize）
  oversize: '長尺',
  dimension: '寸法超過',
  weight: '重量超過',
  packaging: '梱包',
  nonStackable: '非積載',
  
  // その他
  total: '見積り合計',
} as const

/**
 * 配達地域外ラベルの取得（レベルA/B対応）
 */
export function getDeliveryAreaLabel(level?: string | number | null): string {
  if (level === 'A' || level === 'a' || level === 1) {
    return rateLabelsJa.outOfDeliveryAreaLevelA
  }
  if (level === 'B' || level === 'b' || level === 2) {
    return rateLabelsJa.outOfDeliveryAreaLevelB
  }
  return rateLabelsJa.outOfDeliveryArea
}

