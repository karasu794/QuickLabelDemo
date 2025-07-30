// src/app/layout.tsx

import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/app/components/layout/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QuickLabel',
  description: 'FedEx国際配送ラベル発行システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main className="container mx-auto p-6 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}