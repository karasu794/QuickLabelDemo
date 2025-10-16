'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useShippingFormStore } from '@/store/shippingFormStore'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

type InitialAuth = { user: { id: string; email: string | null } | null; isAdmin: boolean }
// CORE_MODE: 管理ナビ表示可否を親から受け取る（環境値は露出しない）
type Props = { initialAuth: InitialAuth; showAdminNav?: boolean }

export default function HeaderClient({ initialAuth, showAdminNav = true }: Props) {
  const router = useRouter()
  const [user, setUser] = useState<InitialAuth['user']>(initialAuth.user)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // 最小修正A: 初回CSRで session が未復元(null)の場合は SSR の initialAuth.user を維持し、上書きしない
      if (session) {
        setUser({ id: session.user.id, email: session.user.email })
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_IN') {
        if (session) {
          setUser({ id: session.user.id, email: session.user.email })
          router.refresh()
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // 配送フォームの状態と永続ストレージをクリア
    try {
      const store = useShippingFormStore.getState()
      store?.resetForm()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('shipping-form-storage')
      }
    } catch {}
    // ログアウト後はトップへ遷移（戻るで保護ページに戻れないよう replace）
    router.replace('/')
    // 念のためのフォールバック
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }, 100)
  }

  // SSRの初期ユーザーを短時間維持してフリッカーを防ぐ
  const effectiveUser = user ?? initialAuth.user

  return (
    <header className="bg-purple-900">
      <div className="container mx-auto px-6 h-16">
        <nav className="flex justify-between items-center h-full">
          <Link href="/" className="text-white text-xl font-normal hover:opacity-80 transition-opacity">QuickLabel</Link>
          <div className="flex items-center space-x-8">
            {effectiveUser ? (
              <>
                <Link href="/shipping/new/shipper" className="text-white hover:opacity-80 transition-opacity">送り状作成</Link>
                <Link href="/mypage/profile" className="text-white hover:opacity-80 transition-opacity">マイページ</Link>
                {showAdminNav && (
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="w-5 h-5 text-white" />
                    <Link href="/admin" className="text-white hover:opacity-80 transition-opacity" data-test="nav-admin-link">管理者ページ</Link>
                  </div>
                )}
                <button onClick={handleLogout} className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors">ログアウト</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-white hover:opacity-80 transition-opacity">ログイン</Link>
                <Link href="/signup" className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors">新規登録</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}


