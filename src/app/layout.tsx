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
  // ========== VERCEL DEBUG: Layout 初期化情報 ==========
  console.log('[SERVER] 🔍 VERCEL DEBUG - RootLayout Starting:', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    platform: process.platform,
    timestamp: new Date().toISOString()
  })

  // サーバーサイドで初期セッション情報を取得
  const session = await getSession()
  
  // ========== VERCEL DEBUG: Layout セッション情報 ==========
  console.log('[SERVER] 🔍 VERCEL DEBUG - Layout Session Details:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userEmail: session?.user?.email || 'no user',
    userId: session?.user?.id || 'no id',
    sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry',
    currentTime: new Date().toISOString(),
    isExpired: session?.expires_at ? Date.now() / 1000 > session.expires_at : 'unknown',
    tokenLength: session?.access_token?.length || 0,
    layoutTimestamp: new Date().toISOString()
  })

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