'use client'

// パスワード再設定（リンク遷移後）。

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const canSubmit = useMemo(() => newPassword.length >= 8 && confirm === newPassword && !busy, [newPassword, confirm, busy])

  useEffect(() => {
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
          // セッションが無い場合はログインへ誘導
          router.replace('/login')
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
      toast.error('更新に失敗しました。時間を置いて再度お試しください。')
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


