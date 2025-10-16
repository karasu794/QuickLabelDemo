import { z } from 'zod'

export type ContentsMode = 'hs' | 'hts'

const coerceThrough = (num: z.ZodNumber) =>
  z
    .preprocess((v) => {
      if (typeof v === 'string') return v.trim() === '' ? undefined : Number(v)
      return v
    }, z.any())
    .pipe(num)

export const buildContentsSchema = (mode: ContentsMode) => z.object({
  items: z.array(z.object({
    description: z.string().min(1, '必須'),
    hsCode: mode === 'hs'
      ? z.string().regex(/^\d+[\d.]*$/, '数字のみ').min(4, '4桁以上').max(12, '12桁以内')
      : z.string().optional(),
    htsCode: mode === 'hts'
      ? z.string().regex(/^\d+$/, '数字のみ').min(6, '6桁以上').max(10, '10桁以内')
      : z.string().optional(),
    quantity: coerceThrough(z.number({ invalid_type_error: '数値を入力してください' }).positive('1以上で入力してください')),
    weight: coerceThrough(z.number({ invalid_type_error: '数値を入力してください' }).positive('0より大きい値を入力してください')),
    unitPrice: coerceThrough(z.number({ invalid_type_error: '数値を入力してください' }).nonnegative('0以上で入力してください')),
    currency: z.string().min(1).default('JPY'),
    countryOfManufacture: z.string().min(1, '必須'),
  })).min(1, '少なくとも1商品')
})

export type ContentsFormValue = z.infer<ReturnType<typeof buildContentsSchema>>


