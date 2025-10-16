'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUp } from '@/lib/supabase/client'
import { signUpSchema, type SignUpInput } from '@/lib/validators/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

export default function SignUpForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = searchParams.get('redirect_to')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const requirePrivacy = true

  const { register, control, handleSubmit, formState: { errors, isValid, isSubmitting: isRHFSubmitting } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', termsAccepted: false, privacyAccepted: false },
  })

  const mapAuthError = (raw?: unknown): string => {
    const anyErr = raw as any
    const msg = String(anyErr?.message || raw || '').toLowerCase()
    const code = String(anyErr?.code || anyErr?.status || '')
    // 既存登録系
    if (
      /already\s*(registered|exists)/.test(msg) ||
      msg.includes('already in use') ||
      msg.includes('email already') ||
      msg.includes('duplicate') ||
      (code === '400' && (msg.includes('user') || msg.includes('email')))
    ) {
      return 'このメールアドレスは既に登録されています。ログインするか、確認メールの再送をお試しください。'
    }
    if (msg.includes('invalid email')) {
      return 'メールアドレスの形式が正しくありません。'
    }
    if (msg.includes('password') && msg.includes('least')) {
      return 'パスワードは8文字以上で入力してください。'
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return '一定時間に送信が集中しています。しばらく時間を置いてからお試しください。'
    }
    return '登録に失敗しました。時間を置いて再度お試しください。'
  }

  const onSubmit = async (values: SignUpInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // 認証完了後に遷移させたいパス（redirect_to が優先、なければ /mypage）
      const nextAfterVerify = redirectTo || '/mypage'
      // 復帰時に next を再送メールにも引き継げるよう一時保存
      try { if (typeof window !== 'undefined' && nextAfterVerify) sessionStorage.setItem('signup_next', nextAfterVerify) } catch {}
      const { error } = await signUp(values.email, values.password, nextAfterVerify)
      if (error) throw error
      // サインアップ直後は未認証ページへ（メールをクエリで引き渡す）
      router.push(`/unverified?email=${encodeURIComponent(values.email)}`)
    } catch (e: any) {
      setSubmitError(mapAuthError(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const termsChecked = useWatch({ control, name: 'termsAccepted' })
  const privacyChecked = useWatch({ control, name: 'privacyAccepted' })
  const emailVal = useWatch({ control, name: 'email' })
  const passwordVal = useWatch({ control, name: 'password' })

  const canSubmit = useMemo(() => {
    const emailOk = typeof emailVal === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
    const hasMinPassword = typeof passwordVal === 'string' && passwordVal.length >= 8
    const termsOk = !!termsChecked
    const privacyOk = !requirePrivacy || !!privacyChecked
    return emailOk && hasMinPassword && termsOk && privacyOk && !isSubmitting
  }, [emailVal, passwordVal, termsChecked, privacyChecked, requirePrivacy, isSubmitting])

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">メールアドレス</label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="you@example.com" {...register('email')} />
          {errors.email && <p id="email-error" className="text-sm text-red-600" aria-live="polite">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">パスワード</label>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} placeholder="8文字以上" {...register('password')} />
          {errors.password && <p id="password-error" className="text-sm text-red-600" aria-live="polite">{errors.password.message}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <Controller
          name="termsAccepted"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-3">
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} aria-invalid={!!errors.termsAccepted} />
              <span className="text-sm text-gray-700">利用規約に同意する（<Link href="/terms" className="underline" target="_blank" rel="noreferrer">/terms</Link>）</span>
            </label>
          )}
        />
        {errors.termsAccepted && <p className="text-sm text-red-600" aria-live="polite">{errors.termsAccepted.message as string}</p>}

        <Controller
          name="privacyAccepted"
          control={control}
          render={({ field }) => (
            <label className="flex items-start gap-3">
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} aria-invalid={!!errors.privacyAccepted} />
              <span className="text-sm text-gray-700">プライバシーポリシーに同意する（<Link href="/privacy" className="underline" target="_blank" rel="noreferrer">/privacy</Link>）（必須）</span>
            </label>
          )}
        />
        {errors.privacyAccepted && <p className="text-sm text-red-600" aria-live="polite">{errors.privacyAccepted.message as string}</p>}
      </div>

      {submitError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" aria-live="polite">
          <p>{submitError}</p>
          <div className="mt-2 space-x-3">
            <Link href="/login" className="underline">ログインへ</Link>
            {emailVal && (
              <Link href={`/unverified?email=${encodeURIComponent(String(emailVal))}`} className="underline">確認メールを再送</Link>
            )}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={!canSubmit}>
        {isSubmitting ? '作成中…' : 'アカウントを作成'}
      </Button>
    </form>
  )
}