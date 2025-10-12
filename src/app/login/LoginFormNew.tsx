'use client'

// 新ログインフォーム（UIキット + RHF + Zod）。
// フラグ NEXT_PUBLIC_ENABLE_NEW_LOGIN が true のときに使用される。

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'

function resolveNextUrl(raw: string | null): string {
  if (!raw) return '/'
  try {
    const decoded = decodeURIComponent(raw)
    // 相対パスを許可（"/" 始まり）
    if (decoded.startsWith('/')) return decoded
    // 同一オリジンのみ許可
    if (typeof window !== 'undefined') {
      const url = new URL(decoded)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash
      }
    }
  } catch {
    // noop -> fallback
  }
  return '/'
}

export default function LoginFormNew() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to')

  const { register, handleSubmit, formState: { errors, isValid, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  const [isPosting, setIsPosting] = useState(false)
  const canSubmit = useMemo(() => isValid && !isSubmitting && !isPosting, [isValid, isSubmitting, isPosting])

  const onSubmit = async (values: LoginInput) => {
    setIsPosting(true)
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(values),
      })

      const ok = res.ok
      const payload = await res.json().catch(() => ({}))
      if (!ok) {
        const message = String(payload?.error || 'メールアドレスまたはパスワードをご確認ください。')
        toast.error(message)
        return
      }

      try {
        const access_token = (payload as any)?.access_token
        const refresh_token = (payload as any)?.refresh_token
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      } catch {
        // SSR Cookie 同期にフォールバック
      }

      const nextUrl = resolveNextUrl(redirectTo)
      router.replace(nextUrl)
      router.refresh()
    } catch (e) {
      toast.error('ログインに失敗しました。時間を置いて再度お試しください。')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="you@example.com" {...register('email')} />
          {errors.email && <p id="email-error" className="text-sm text-red-600" aria-live="polite">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} placeholder="パスワード" {...register('password')} />
          {errors.password && <p id="password-error" className="text-sm text-red-600" aria-live="polite">{errors.password.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full h-11" disabled={!canSubmit}>
        {isSubmitting || isPosting ? 'ログイン中…' : 'ログイン'}
      </Button>
    </form>
  )
}


