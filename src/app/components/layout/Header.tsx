'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function Header() {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  return (
    <header className="bg-purple-900">
      <div className="container mx-auto px-6 h-16">
        <nav className="flex justify-between items-center h-full">
          {/* ロゴ部分 */}
          <Link 
            href="/" 
            className="text-white text-xl font-normal hover:opacity-80 transition-opacity"
          >
            QuickLabel
          </Link>

          {/* ナビゲーションリンク */}
          {!loading && (
            <div className="flex items-center space-x-8">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/shipping/new/shipper" 
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    送り状作成
                  </Link>
                  <Link 
                    href="/mypage/profile" 
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    マイページ
                  </Link>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <ShieldCheckIcon className="w-5 h-5 text-white" />
                      <Link 
                        href="/admin" 
                        className="text-white hover:opacity-80 transition-opacity"
                      >
                        管理者ページ
                      </Link>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    ログイン
                  </Link>
                  <Link 
                    href="/signup" 
                    className="text-white bg-purple-700 px-4 py-2 rounded hover:bg-purple-600 transition-colors"
                  >
                    新規登録
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  )
} 