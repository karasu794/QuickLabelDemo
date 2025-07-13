"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getCurrentUser } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user } = await getCurrentUser()
        setUser(user)
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      setIsMenuOpen(false)
      // ページをリロードして状態をリセット
      window.location.href = '/'
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  if (loading) {
    return (
          <header className="bg-fedex-purple shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-white hover:text-gray-200 transition-colors duration-200">
              QuickLabel
            </Link>
          </div>
          <div className="text-white">読み込み中...</div>
        </div>
      </div>
    </header>
    )
  }

  return (
    <header className="bg-fedex-purple shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Site Title */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-white hover:text-gray-200 transition-colors duration-200">
              QuickLabel
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {user && (
            <Link
              href="/shipping/new/shipper"
              className="text-white hover:text-gray-200 hover:underline transition-all duration-200 font-medium"
            >
              送り状作成
            </Link>
            )}
            
            {user ? (
              // ログイン済みの場合: アカウント + ログアウト
              <>
                <Link
                  href="/account"
                  className="text-white hover:text-gray-200 hover:underline transition-all duration-200 font-medium"
                >
                  アカウント
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-medium"
                >
                  ログアウト
                </button>
              </>
            ) : (
              // 未ログインの場合: ログイン + 新規登録
              <>
                <Link
                  href="/login"
                  className="text-white hover:text-gray-200 hover:underline transition-all duration-200 font-medium"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="bg-white/10 text-white px-4 py-2 rounded-md border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-medium"
                >
                  新規登録
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white hover:text-gray-200 transition-colors duration-200 p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-white/20">
              {user && (
              <Link
                href="/shipping/new/shipper"
                className="block text-white hover:text-gray-200 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                送り状作成
              </Link>
              )}
              
              {user ? (
                // ログイン済みの場合: アカウント + ログアウト
                <>
                  <Link
                    href="/account"
                    className="block text-white hover:text-gray-200 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    アカウント
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left bg-white/10 text-white px-3 py-2 rounded-md border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-medium mt-2"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                // 未ログインの場合: ログイン + 新規登録
                <>
                  <Link
                    href="/login"
                    className="block text-white hover:text-gray-200 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/signup"
                    className="block bg-white/10 text-white px-3 py-2 rounded-md border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-medium mt-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    新規登録
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
