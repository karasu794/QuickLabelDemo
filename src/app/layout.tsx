// src/app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header' // ★ Headerコンポーネントをインポート
import { GoogleMapsProvider } from '@/components/GooglePlaceAutocomplete'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QuickLabel',
  description: 'FedEx Label Creation Service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <GoogleMapsProvider>
          <Header /> {/* ★ bodyタグのすぐ下にHeaderを配置 */}
          <main className="container mx-auto p-6 bg-gray-50 min-h-screen">
            {children}
          </main>
        </GoogleMapsProvider>
      </body>
    </html>
  )
}