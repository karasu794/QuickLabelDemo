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

  const canSubmit = useMemo(() => newPassword.length >= 8 && confirm === newPassword && !busy, [newPassword, confirm, busy])

  useEffect(() => {
    // セッションが無い状態での直アクセスはログインへ誘導
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
      }
    })()
  }, [router])

  const handleUpdate = async () => {
    try {
      setBusy(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('パスワードを更新しました。ログインしてください。')
      router.replace('/login')
    } catch (e) {
      toast.error('更新に失敗しました。時間を置いて再度お試しください。')
    } finally {
      setBusy(false)
    }
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


