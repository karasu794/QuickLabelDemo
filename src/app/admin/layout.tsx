import Link from 'next/link'
import { ReactNode } from 'react'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* サイドバー */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">管理者パネル</h1>
          <nav className="space-y-2">
            <Link 
              href="/admin/users" 
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              会員管理
            </Link>
            <Link 
              href="/admin/transactions" 
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              取引管理
            </Link>
            <Link 
              href="/admin/fees" 
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              手数料管理
            </Link>
            <Link 
              href="/admin/company-info" 
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              自社情報設定
            </Link>
            <Link 
              href="/admin/notifications" 
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              通知一覧
            </Link>
          </nav>
        </div>
        
        {/* フッター */}
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <Link 
            href="/" 
            className="block px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            ← メインサイトに戻る
          </Link>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
} 