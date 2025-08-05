import { z } from 'zod'
import { 
  baseAddressSchema, 
  contactInfoSchema, 
  basePackageSchema, 
  positiveAmountSchema, 
  currencyCodeSchema, 
  hsCodeSchema, 
  emailSchema 
} from './shared'

/**
 * 🚢 Ship API (発送・送り状作成) バリデーションスキーマ
 */

/**
 * 📤 荷送人情報スキーマ
 */
const shipperInfoSchema = contactInfoSchema.merge(baseAddressSchema).extend({
  taxId: z.string()
    .max(50, { message: "税務ID番号は50文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
})

/**
 * 📥 荷受人情報スキーマ
 */
const recipientInfoSchema = contactInfoSchema.merge(baseAddressSchema).extend({
  email: emailSchema,
  taxNumber: z.string()
    .max(50, { message: "税務番号は50文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
  isResidential: z.boolean(),
})

/**
 * 📦 配送パッケージスキーマ
 */
const shipmentPackageSchema = basePackageSchema.extend({
  declaredValue: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const value = parseFloat(val)
      return !isNaN(value) && value >= 0 && value <= 1000000
    }, { message: "申告価額は0以上1,000,000円以下の数値である必要があります。" }),
})

/**
 * 📋 商品アイテムスキーマ（税関申告用）
 */
const itemSchema = z.object({
  description: z.string()
    .min(1, { message: "商品説明は必須です。" })
    .max(200, { message: "商品説明は200文字以内である必要があります。" }),
  countryOfManufacture: z.string()
    .length(2, { message: "製造国コードは2文字である必要があります。" })
    .toUpperCase(),
  quantity: z.number()
    .int()
    .positive({ message: "数量は正の整数である必要があります。" })
    .max(10000, { message: "数量は10,000個以下である必要があります。" }),
  weight: z.number()
    .positive({ message: "重量は正の数値である必要があります。" })
    .max(1000, { message: "重量は1000kg以下である必要があります。" }),
  unitPrice: positiveAmountSchema,
  currency: currencyCodeSchema,
  hsCode: hsCodeSchema,
})

/**
 * 📝 コンテンツ詳細スキーマ（詳細な税関申告用）
 */
const contentSchema = z.object({
  description: z.string()
    .min(1, { message: "内容物説明は必須です。" })
    .max(200, { message: "内容物説明は200文字以内である必要があります。" }),
  quantity: z.number()
    .int()
    .positive({ message: "数量は正の整数である必要があります。" })
    .max(10000, { message: "数量は10,000個以下である必要があります。" }),
  value: z.number()
    .nonnegative({ message: "価値は0以上の数値である必要があります。" })
    .max(1000000, { message: "価値は1,000,000円以下である必要があります。" }),
  weight: z.number()
    .positive({ message: "重量は正の数値である必要があります。" })
    .max(1000, { message: "重量は1000kg以下である必要があります。" }),
  countryOfOrigin: z.string()
    .length(2, { message: "原産国コードは2文字である必要があります。" })
    .toUpperCase(),
  hsCode: z.string()
    .min(1, { message: "HSコードは必須です。" })
    .regex(/^[\d\.]+$/, { message: "HSコードは数字とピリオドのみ使用可能です。" })
    .min(4, { message: "HSコードは最低4桁必要です。" })
    .max(10, { message: "HSコードは最大10桁です。" }),
})

/**
 * 🎯 発送リクエスト全体のバリデーションスキーマ
 */
export const shipmentRequestSchema = z.object({
  // 💳 決済情報
  sourceId: z.string()
    .min(1, { message: "決済トークンは必須です。" })
    .max(200, { message: "決済トークンが無効です。" }),
  finalCharge: positiveAmountSchema,

  // 📤 荷送人情報
  shipperInfo: shipperInfoSchema,

  // 📥 荷受人情報
  recipientInfo: recipientInfoSchema,

  // 📦 荷物情報
  packages: z.array(shipmentPackageSchema)
    .min(1, { message: "荷物は最低1つ必要です。" })
    .max(10, { message: "荷物は最大10個まで指定できます。" }),

  // 📋 商品詳細（税関申告用）
  items: z.array(itemSchema)
    .min(1, { message: "商品詳細は最低1つ必要です。" })
    .max(50, { message: "商品詳細は最大50件まで指定できます。" }),

  // 📝 コンテンツ詳細（任意、より詳細な税関申告用）
  contents: z.array(contentSchema)
    .max(50, { message: "コンテンツ詳細は最大50件まで指定できます。" })
    .optional(),

  // 🚚 配送目的
  shippingPurpose: z.string()
    .min(1, { message: "配送目的は必須です。" })
    .max(100, { message: "配送目的は100文字以内である必要があります。" })
    .refine((val) => {
      const validPurposes = [
        'SOLD', 'NOT_SOLD', 'GIFT', 'PERSONAL_EFFECTS', 
        'SAMPLE', 'RETURN_REPAIR', 'OTHER'
      ]
      return validPurposes.includes(val)
    }, { message: "有効な配送目的を指定してください。" }),
})

/**
 * 🔍 バリデーション済みデータの型定義
 */
export type ValidatedShipmentRequest = z.infer<typeof shipmentRequestSchema>
export type ValidatedShipperInfo = z.infer<typeof shipperInfoSchema>
export type ValidatedRecipientInfo = z.infer<typeof recipientInfoSchema>
export type ValidatedShipmentPackage = z.infer<typeof shipmentPackageSchema>
export type ValidatedItem = z.infer<typeof itemSchema>
export type ValidatedContent = z.infer<typeof contentSchema>

/**
 * 🛡️ バリデーションヘルパー関数
 */
export function validateShipmentRequest(data: unknown) {
  return shipmentRequestSchema.safeParse(data)
}

/**
 * 📋 バリデーションエラーの整形関数
 */
export function formatShipmentValidationErrors(errors: z.ZodFormattedError<any>) {
  const formattedErrors: Record<string, string[]> = {}
  
  const processErrors = (obj: any, path = '') => {
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key
      const value = obj[key]
      
      if (Array.isArray(value._errors) && value._errors.length > 0) {
        formattedErrors[fullPath] = value._errors
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value._errors)) {
        processErrors(value, fullPath)
      }
    })
  }
  
  processErrors(errors)
  return formattedErrors
}

/**
 * 🔍 発送リクエストの追加バリデーション
 */
export function validateShipmentBusinessRules(data: ValidatedShipmentRequest): string[] {
  const errors: string[] = []

  // 荷送人と荷受人が同じ国でないことを確認（国際配送前提）
  if (data.shipperInfo.countryCode === data.recipientInfo.countryCode) {
    errors.push("国際配送サービスのため、荷送人と荷受人は異なる国である必要があります。")
  }

  // 商品の総重量と荷物の総重量の整合性チェック
  const totalItemWeight = data.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0)
  const totalPackageWeight = data.packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight), 0)
  
  if (Math.abs(totalItemWeight - totalPackageWeight) > totalPackageWeight * 0.1) {
    errors.push("商品の総重量と荷物の総重量に大きな差があります。重量を確認してください。")
  }

  // 商品の総価値と決済金額の妥当性チェック
  const totalItemValue = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  
  if (data.finalCharge < totalItemValue * 0.5) {
    errors.push("決済金額が商品価値に対して低すぎます。")
  }

  return errors
}