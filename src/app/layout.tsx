// src/app/layout.tsx

import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import HeaderServer from '@/components/header/HeaderServer'
import ToastOnQuery from '@/components/ToastOnQuery'
import { Toaster } from 'react-hot-toast'
import { getSession } from '@/lib/supabase/server'

import DemoBanner from '@/components/DemoBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QuickLabel',
  description: 'FedEx国際配送ラベル発行システム',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // サーバーサイドで初期セッション情報を取得
  const session = await getSession()

  return (
    <html lang="ja">
      <body className={inter.className}>
        <DemoBanner />
        <AuthProvider initialSession={session}>
          <HeaderServer />
          <main className="container mx-auto px-3 md:p-6 min-h-screen">
            {children}
          </main>
        </AuthProvider>
        {/* トースト通知用コンポーネント（クリック透過のため pointer-events: none を適用）*/}
        <div style={{ pointerEvents: 'none' }}>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
                pointerEvents: 'auto', // トースト自体の操作（閉じる等）は可能にする
              },
              success: {
                style: {
                  background: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </div>
        {/* URLクエリに応じた自動トースト */}
        <ToastOnQuery />
      </body>
    </html>
  )
}