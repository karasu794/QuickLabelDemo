'use client'

// パスワード再設定（リンク遷移後）。

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSubmit = useMemo(() => newPassword.length >= 8 && confirm === newPassword && !busy, [newPassword, confirm, busy])

  useEffect(() => {
    // リカバリリンクのURLにエラークエリが付与されている場合は即エラー表示
    if (typeof window !== 'undefined' && window.location.search) {
      const q = new URLSearchParams(window.location.search)
      const err = q.get('error')
      const errCode = q.get('error_code')
      if (err) {
        const msg = errCode === 'otp_expired'
          ? 'リンクの有効期限が切れています。再度パスワード再設定メールを送信してください。'
          : 'リンクが無効です。再度パスワード再設定メールを送信してください。'
        setErrorMsg(msg)
        setInitializing(false)
        return
      }
    }

    // リカバリリンクのURLハッシュ(#access_token, #refresh_token)からセッションを確立
    ;(async () => {
      try {
        let sessionEstablished = false
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.slice(1)
          const params = new URLSearchParams(hash)
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            try {
              const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
              if (!error && data?.session) {
                sessionEstablished = true
                // ハッシュを消してURLを綺麗にする
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
              }
            } catch {
              // noop
            }
          }
        }

        // PKCEスタイル（?code=...）にも対応
        if (!sessionEstablished && typeof window !== 'undefined' && window.location.search) {
          const q = new URLSearchParams(window.location.search)
          const code = q.get('code')
          if (code) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code)
              if (!error && data?.session) {
                sessionEstablished = true
                // クエリを消す
                window.history.replaceState(null, '', window.location.pathname)
              }
            } catch {
              // noop
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!sessionEstablished && !session) {
          // セッションが無い場合はエラー表示に切り替える
          setErrorMsg('リンクが無効か、既に使用済みです。再度パスワード再設定メールを送信してください。')
          return
        }
      } finally {
        setInitializing(false)
      }
    })()
  }, [router])

  const handleUpdate = async () => {
    try {
      setBusy(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('パスワードを更新しました。ログインしてください。')
      router.replace('/login?reset=1')
    } catch (e) {
      const raw = e as any
      const msg = String(raw?.message || raw || '').toLowerCase()
      let ui = '更新に失敗しました。時間を置いて再度お試しください。'
      if (msg.includes('same') || msg.includes('previous') || msg.includes('identical') || msg.includes('reuse')) {
        ui = '以前と同じパスワードは使用できません。別のパスワードを設定してください。'
      } else if (msg.includes('least') || msg.includes('too short')) {
        ui = 'パスワードは8文字以上で入力してください。'
      }
      toast.error(ui)
    } finally {
      setBusy(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-gray-600">セッションを準備しています...</div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">パスワードの再設定</h1>
              <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
            </div>
            <div className="space-y-3">
              <Link href="/forgot-password" className="block">
                <Button className="w-full h-11">再設定メールを再送</Button>
              </Link>
              <Link href="/login" className="block text-center text-sm text-gray-600 underline">ログインに戻る</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">パスワードの再設定</h1>
            <p className="text-sm text-gray-600 mt-1">新しいパスワードを設定してください（8文字以上）。</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">新しいパスワード</label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8文字以上" />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium text-gray-700">確認用パスワード</label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再入力" />
            </div>
          </div>
          <div>
            <Button className="w-full h-11" onClick={handleUpdate} disabled={!canSubmit}>
              {busy ? '更新中…' : '更新する'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


