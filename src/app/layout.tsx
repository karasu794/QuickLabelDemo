// src/app/layout.tsx

import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/app/components/layout/Header'
import { Toaster } from 'react-hot-toast'
import { getSession } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QuickLabel',
  description: 'FedEx国際配送ラベル発行システム',
}

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
        <AuthProvider initialSession={session}>
          <Header />
          <main className="container mx-auto p-6 min-h-screen">
            {children}
          </main>
        </AuthProvider>
        {/* トースト通知用コンポーネント */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
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
      </body>
    </html>
  )
}