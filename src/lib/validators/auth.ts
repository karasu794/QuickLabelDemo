// 認証フォームのZodバリデーション（サインアップ/ログイン/パスワード再設定）
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

// ログイン
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'メールアドレスまたはパスワードをご確認ください。'),
})
export type LoginInput = z.infer<typeof loginSchema>

// パスワード再設定（メール送信）
export const forgotPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// パスワード再設定（新しいパスワードの設定）
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  confirm: z.string(),
}).refine((val) => val.confirm === val.newPassword, {
  path: ['confirm'],
  message: '確認用パスワードが一致しません',
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
