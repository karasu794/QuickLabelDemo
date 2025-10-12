'use client'

// パスワード再設定メール送信ページ（隠し導入）。

import { useCallback, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const COOLDOWN_SEC = 60

const getSiteUrl = () => {
	if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
	if (typeof window !== 'undefined') return window.location.origin
	return ''
}

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [cooldown, setCooldown] = useState(0)
	const [isSending, setIsSending] = useState(false)
	const timerRef = useRef<NodeJS.Timeout | null>(null)

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

	const handleSend = useCallback(async () => {
		try {
			setIsSending(true)
			const site = getSiteUrl().replace(/\/$/, '')
			const redirectTo = `${site}/auth/reset`
			const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
			if (error) throw error
			toast.success('メールを送信しました。届かない場合は時間を置いて再度お試しください。')
			startCooldown()
		} catch (e: any) {
			// アカウント有無を匂わせない包括表現
			toast.success('メールを送信しました。届かない場合は時間を置いて再度お試しください。')
			startCooldown()
		} finally {
			setIsSending(false)
		}
	}, [email, startCooldown])

	const disabled = useMemo(() => cooldown > 0 || isSending || !/.+@.+\..+/.test(email), [cooldown, isSending, email])

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="w-full max-w-md">
				<div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">パスワード再設定</h1>
						<p className="text-sm text-gray-600 mt-1">登録メールアドレス宛に再設定リンクを送信します。</p>
					</div>
					<div className="space-y-3">
						<label htmlFor="email" className="text-sm font-medium text-gray-700">メールアドレス</label>
						<Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
					</div>
					<div className="pt-2">
						<Button onClick={handleSend} disabled={disabled} className="w-full h-11">
							{cooldown > 0 ? `再送可能まで ${cooldown}s` : isSending ? '送信中…' : '再設定メールを送信'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
