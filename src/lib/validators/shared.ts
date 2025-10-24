import { z } from 'zod'

/**
 * 🌍 共通で使用されるバリデーションスキーマ
 * quote.ts と ship.ts の両方で使用される基本的なスキーマを定義
 */

/**
 * 📍 住所情報の基本スキーマ
 */
export const baseAddressSchema = z.object({
  countryCode: z.string()
    .length(2, { message: "国コードは2文字である必要があります。" })
    .toUpperCase(),
  postalCode: z.string()
    .min(1, { message: "郵便番号は必須です。" })
    .max(20, { message: "郵便番号は20文字以内である必要があります。" }),
  stateCode: z.string()
    .max(10, { message: "州・県コードは10文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
  cityName: z.string()
    .min(1, { message: "都市名は必須です。" })
    .max(100, { message: "都市名は100文字以内である必要があります。" }),
  address1: z.string()
    .min(1, { message: "住所1は必須です。" })
    .max(200, { message: "住所1は200文字以内である必要があります。" }),
  address2: z.string()
    .max(200, { message: "住所2は200文字以内である必要があります。" })
    .optional()
    .or(z.literal("")),
})

/**
 * 📞 連絡先情報の基本スキーマ
 */
export const contactInfoSchema = z.object({
  companyName: z.string()
    .min(1, { message: "会社名は必須です。" })
    .max(100, { message: "会社名は100文字以内である必要があります。" }),
  contactName: z.string()
    .min(1, { message: "担当者名は必須です。" })
    .max(100, { message: "担当者名は100文字以内である必要があります。" }),
  phoneNumber: z.string()
    .min(1, { message: "電話番号は必須です。" })
    .max(20, { message: "電話番号は20文字以内である必要があります。" })
    .regex(/^[+\-\d\s\(\)]+$/, { message: "電話番号の形式が正しくありません。" }),
})

/**
 * 📦 基本パッケージスキーマ
 */
export const basePackageSchema = z.object({
  weight: z.string()
    .min(1, { message: "重量は必須です。" })
    .refine((val) => {
      const weight = parseFloat(val)
      return !isNaN(weight) && weight > 0 && weight <= 1000
    }, { message: "重量は0より大きく1000kg以下の数値である必要があります。" }),
  type: z.string()
    .min(1, { message: "梱包タイプは必須です。" }),
  length: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const length = parseFloat(val)
      return !isNaN(length) && length > 0 && length <= 300
    }, { message: "長さは0より大きく300cm以下の数値である必要があります。" }),
  width: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const width = parseFloat(val)
      return !isNaN(width) && width > 0 && width <= 300
    }, { message: "幅は0より大きく300cm以下の数値である必要があります。" }),
  height: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const height = parseFloat(val)
      return !isNaN(height) && height > 0 && height <= 300
    }, { message: "高さは0より大きく300cm以下の数値である必要があります。" }),
})

/**
 * 💰 金額バリデーション
 */
export const positiveAmountSchema = z.number()
  .positive({ message: "金額は正の数値である必要があります。" })
  .max(1000000, { message: "金額は1,000,000円以下である必要があります。" })

/**
 * 🗓️ 日付バリデーション
 */
export const futureDateSchema = z.string()
  .min(1, { message: "日付は必須です。" })
  .refine((val) => {
    const date = new Date(val)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today && date <= new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年以内
  }, { message: "日付は今日から1年以内である必要があります。" })

/**
 * 🎯 通貨コードバリデーション
 */
// ISO-4217 フル対応（簡易版）：英大文字3桁を許容し、将来的に一覧で厳格化
// ISO-4217（主要通貨の厳格化）。不足分は必要に応じて追加
const ISO_4217 = ['USD','JPY','EUR','GBP','CNY','AUD','CAD','CHF','HKD','SEK','NOK','DKK','NZD','SGD'] as const
export const currencyCodeSchema = z.enum(ISO_4217 as unknown as [string, ...string[]])

/**
 * 📄 HSコードバリデーション
 */
export const hsCodeSchema = z.string()
  .regex(/^[\d\.]+$/, { message: "HSコードは数字とピリオドのみ使用可能です。" })
  .min(4, { message: "HSコードは最低4桁必要です。" })
  .max(10, { message: "HSコードは最大10桁です。" })
  .optional()

/**
 * 📧 メールアドレスバリデーション
 */
export const emailSchema = z.string()
  .min(1, { message: "メールアドレスは必須です。" })
  .email({ message: "有効なメールアドレスを入力してください。" })
  .max(100, { message: "メールアドレスは100文字以内である必要があります。" })