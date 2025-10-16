import { z } from 'zod'

/**
 * 📦 パッケージのバリデーションスキーマ
 */
const packageSchema = z.object({
  // idは数値へ強制変換（呼び出し側で1始まりを付与）
  id: z.coerce.number(),
  packagingType: z.string().min(1, { message: "梱包タイプは必須です。" }),
  // 数値入力揺れ対策: z.coerce.number() で強制変換
  weight: z.coerce.number().nonnegative({ message: "重量は0以上の数値である必要があります。" }),
  length: z.coerce.number().nonnegative().optional().default(0),
  width: z.coerce.number().nonnegative().optional().default(0),
  height: z.coerce.number().nonnegative().optional().default(0),
  declaredValue: z.coerce.number().nonnegative().optional().default(0),
})

/**
 * 📍 見積もりパラメータのバリデーションスキーマ
 */
const quoteParamsSchema = z.object({
  // 発送元情報
  originCountry: z.string()
    .length(2, { message: "発送元の国コードは2文字である必要があります。" })
    .toUpperCase(),
  originPostalCode: z.string()
    .min(1, { message: "発送元の郵便番号は必須です。" })
    .max(20, { message: "発送元の郵便番号は20文字以内である必要があります。" }),
  originStateCode: z.string()
    .max(10, { message: "発送元の州・県コードは10文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
  originCityName: z.string()
    .min(1, { message: "発送元の都市名は必須です。" })
    .max(100, { message: "発送元の都市名は100文字以内である必要があります。" }),

  // 配送先情報
  destinationCountry: z.string()
    .length(2, { message: "配送先の国コードは2文字である必要があります。" })
    .toUpperCase(),
  destinationPostalCode: z.string()
    .min(1, { message: "配送先の郵便番号は必須です。" })
    .max(20, { message: "配送先の郵便番号は20文字以内である必要があります。" }),
  destinationStateCode: z.string()
    .max(10, { message: "配送先の州・県コードは10文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
  destinationCityName: z.string()
    .min(1, { message: "配送先の都市名は必須です。" })
    .max(100, { message: "配送先の都市名は100文字以内である必要があります。" }),

  // 発送オプション
  shipDate: z.string()
    .min(1, { message: "発送日は必須です。" })
    .refine((val) => {
      const date = new Date(val)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    }, { message: "発送日は今日以降の日付である必要があります。" }),
  // 画面側の選択状態フラグ（任意）
  originSelected: z.boolean().optional().default(false),
  destinationSelected: z.boolean().optional().default(false),
  // 住居判定は任意 + 既定false
  isResidential: z.boolean().optional().default(false),
  // 高額保険は任意 + 既定false（サーバ側でdeclaredValue>0なら自動ON）
  higherInsurance: z.boolean().optional().default(false),
})

/**
 * 🎯 見積もりリクエスト全体のバリデーションスキーマ
 */
export const quoteRequestSchema = z.object({
  quoteParams: quoteParamsSchema,
  packages: z.array(packageSchema)
    .min(1, { message: "荷物は最低1つ必要です。" })
    .max(10, { message: "荷物は最大10個まで指定できます。" }),
})

/**
 * 🔍 バリデーション済みデータの型定義
 */
export type ValidatedQuoteRequest = z.infer<typeof quoteRequestSchema>
export type ValidatedQuoteParams = z.infer<typeof quoteParamsSchema>
export type ValidatedPackage = z.infer<typeof packageSchema>

/**
 * 🛡️ バリデーションヘルパー関数
 */
export function validateQuoteRequest(data: unknown) {
  return quoteRequestSchema.safeParse(data)
}

/**
 * 📋 バリデーションエラーの整形関数
 */
export function formatValidationErrors(errors: z.ZodFormattedError<any>) {
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