'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const COOLDOWN_SEC = 60

export default function UnverifiedPage() {
  const params = useSearchParams()
  const initialEmail = params.get('email') || ''
  const [email, setEmail] = useState(initialEmail)
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SEC)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [])

  const handleResend = useCallback(async () => {
    try {
      setIsSending(true)
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
      const redirect = `${siteUrl}/auth/callback?type=signup`
      // Supabaseの再送API（サインアップ確認）
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect } } as any)
      if (error) throw error
      toast.success('確認メールを再送しました')
      startCooldown()
    } catch (e: any) {
      // 代替: OTP送信にフォールバック
      try {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
        const redirect = `${siteUrl}/auth/callback?type=signup`
        const { error: otpErr } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
        if (otpErr) throw otpErr
        toast.success('確認メールを再送しました')
        startCooldown()
      } catch (ee: any) {
        // 包括メッセージに統一
        toast.error('再送に失敗しました。時間を置いて再度お試しください。')
      }
    } finally {
      setIsSending(false)
    }
  }, [email, startCooldown])

  const disabled = useMemo(() => cooldown > 0 || isSending || !/.+@.+\..+/.test(email), [cooldown, isSending, email])

  return (
    <div className="mx-auto max-w-lg py-12 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">メール確認が必要です</h1>
      <p className="text-gray-700">登録されたメールアドレス宛に確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。</p>
      <div className="space-y-3">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">メールアドレス</label>
        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="pt-2">
        <Button onClick={handleResend} disabled={disabled} className="h-11">
          {cooldown > 0 ? `再送可能まで ${cooldown}s` : isSending ? '送信中…' : '確認メールを再送'}
        </Button>
      </div>
      <div className="space-y-2 text-gray-700">
        <p>届かない場合:</p>
        <ul className="list-disc list-inside">
          <li>迷惑メールフォルダをご確認ください</li>
          <li>受信設定で no-reply アドレスを許可してください</li>
        </ul>
      </div>
    </div>
  )
}


