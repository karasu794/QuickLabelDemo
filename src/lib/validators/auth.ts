// サインアップ入力のZodバリデーション（同意チェック含む）
import { z } from 'zod'

// プライバシーポリシー同意は常に必須
const REQUIRE_PRIVACY = true

export const signUpSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  termsAccepted: z.coerce.boolean().refine((v) => v === true, {
    message: '利用規約への同意が必須です',
  }),
  privacyAccepted: z.coerce.boolean().refine((v) => v === true, {
    message: 'プライバシーポリシーへの同意が必須です',
  }),
})

export type SignUpInput = z.infer<typeof signUpSchema>
