"use client"

import { Menu, X, Shield } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth()

  // クライアントサイドマウント検知
  useEffect(() => {
    setIsMounted(true)
    console.log('🎭 Header: マウント完了')
  }, [])

  // デバッグログ: 認証状態の変化を追跡（詳細な値を表示）
  useEffect(() => {
    console.log('🎭 Header認証状態更新:', {
      isMounted,
      loading,
      isAuthenticated,
      isAdmin,
      userEmail: user?.email || '未ログイン',
      profileRole: profile?.role || '未設定',
      profileId: profile?.id || 'なし',
      userId: user?.id || 'なし',
      hasUser: !!user,
      hasProfile: !!profile
    })
  }, [isMounted, loading, isAuthenticated, isAdmin, user, profile])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 ログアウト開始')
      await supabase.auth.signOut()
      setIsMenuOpen(false)
      console.log('✅ ログアウト完了')
      // 認証状態の変更は onAuthStateChange で自動的に処理される
      window.location.href = '/'
    } catch (error) {
      console.error('❌ ログアウトエラー:', error)
    }
  }

  // レンダリング状態をログ出力
  console.log('🎭 Header レンダリング状態:', {
    isMounted,
    loading,
    isAuthenticated,
    isAdmin,
    userEmail: user?.email || '未ログイン',
    willShowAuth: isMounted && !loading && isAuthenticated,
    willShowLogin: isMounted && !loading && !isAuthenticated
  })

  // ハイドレーション完了前は何も表示しない（フラッシュ防止）
  if (!isMounted) {
    console.log('⏳ Header: ハイドレーション待機中')
    return (
      <header className="bg-fedex-purple shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-white text-xl font-bold">
              QuickLabel
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // ローディング中の表示（短時間のみ）
  if (loading) {
    console.log('⏳ Header: 認証状態ローディング中')
    return (
      <header className="bg-fedex-purple shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-white text-xl font-bold hover:text-gray-200 transition-colors duration-200">
              QuickLabel
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-8 bg-white/20 rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // 最終的な表示ログ
  if (isAuthenticated) {
    console.log('✅ Header: 認証済みユーザー表示:', {
      userEmail: user?.email,
      isAdmin,
      showAdminMenu: isAdmin
    })
  } else {
    console.log('🔓 Header: 未ログインユーザー表示 - ログイン/新規登録ボタンを表示')
  }

  return (
    <header className="bg-fedex-purple shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* ロゴ */}
          <Link href="/" className="text-white text-xl font-bold hover:text-gray-200 transition-colors duration-200">
            QuickLabel
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            {isAuthenticated && (
              <>
                <Link
                  href="/shipping/new/shipper"
                  className="text-white hover:text-gray-200 hover:underline transition-all duration-200 font-medium"
                >
                  送り状作成
                </Link>
                <Link
                  href="/mypage/history"
                  className="text-white hover:text-gray-200 hover:underline transition-all duration-200 font-medium"
                >
                  マイページ
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <>
                {/* 管理者ページリンク（管理者のみ表示） */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 text-yellow-200 hover:text-yellow-100 hover:underline transition-all duration-200 font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    管理者ページ
                  </Link>
                )}

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
              {isAuthenticated && (
                <>
                  <Link
                    href="/shipping/new/shipper"
                    className="block text-white hover:text-gray-200 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    送り状作成
                  </Link>
                  <Link
                    href="/mypage/history"
                    className="block text-white hover:text-gray-200 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    マイページ
                  </Link>
                </>
              )}
              
              {isAuthenticated ? (
                <>
                  {/* 管理者ページリンク（管理者のみ表示） */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 text-yellow-200 hover:text-yellow-100 hover:bg-white/10 px-3 py-2 rounded-md transition-all duration-200 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      管理者ページ
                    </Link>
                  )}

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
