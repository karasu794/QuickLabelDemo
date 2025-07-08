'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const steps = [
  { id: 1, name: '荷送人情報', href: '/shipping/new/shipper' },
  { id: 2, name: '荷受人情報', href: '/shipping/new/recipient' },
  { id: 3, name: '荷物情報', href: '/shipping/new/packages' },
  { id: 4, name: '内容品情報', href: '/shipping/new/contents' },
  { id: 5, name: 'アイテム情報', href: '/shipping/new/items' },
  { id: 6, name: '確認画面', href: '/shipping/new/review' },
  { id: 7, name: '完了', href: '/shipping/new/success' }
]

export default function ShippingNewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto p-6">
        
        {/* 左側：メインメニュー */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">メニュー</h3>
          <nav className="space-y-2">
            <Link href="/" className="block text-gray-600 hover:text-blue-600 transition-colors">
              ホーム
            </Link>
            <Link href="/account" className="block text-gray-600 hover:text-blue-600 transition-colors">
              アカウント
            </Link>
            <Link href="/shipping/new/shipper" className="block text-blue-600 font-medium">
              送り状作成
            </Link>
            <Link href="/admin/transactions" className="block text-gray-600 hover:text-blue-600 transition-colors">
              取引履歴
            </Link>
          </nav>
        </div>

        {/* 中央：コンテンツエリア */}
        <div className="col-span-7 bg-white rounded-lg shadow-sm">
          {children}
        </div>

        {/* 右側：ステップナビゲーション */}
        <div className="col-span-3 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">送り状作成ステップ</h3>
          <nav className="space-y-1">
            {steps.map((step) => {
              const isActive = pathname === step.href
              const currentStepIndex = steps.findIndex(s => s.href === pathname)
              const stepIndex = step.id - 1
              
              const stepContent = (
                <div className={`
                  flex items-center p-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-purple-200 border-l-4 border-purple-600 text-purple-800' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}>
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mr-3
                    ${isActive 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {step.id}
                  </div>
                  <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                    {step.name}
                  </span>
                </div>
              )
              
              return (
                <div key={step.id}>
                  {!isActive ? (
                    <Link href={step.href}>
                      {stepContent}
                    </Link>
                  ) : (
                    stepContent
                  )}
                </div>
              )
            })}
          </nav>
          
          {/* 追加情報 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">ヘルプ</h4>
            <p className="text-sm text-blue-700">
              各ステップを順番に進めて、送り状を作成してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 