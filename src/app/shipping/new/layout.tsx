'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useShippingFormStore } from '@/store/shippingFormStore'
import { useState, useEffect } from 'react'
import MobileStepProgress from '@/components/MobileStepProgress'

const steps = [
  { id: 1, name: '荷送人情報', href: '/shipping/new/shipper' },
  { id: 2, name: '荷受人情報', href: '/shipping/new/recipient' },
  { id: 3, name: '荷物情報', href: '/shipping/new/packages' },
  { id: 4, name: '内容品の詳細', href: '/shipping/new/contents' },
  { id: 5, name: '確認画面', href: '/shipping/new/review' },
  { id: 6, name: '完了', href: '/shipping/new/success' }
]

export default function ShippingNewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isStepCompleted = useShippingFormStore((state) => state.isStepCompleted)
  const [isHydrated, setIsHydrated] = useState(false)

  // ハイドレーション完了を待つ
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モバイル用コンパクトプログレスバー */}
      <MobileStepProgress />
      
      {/* メインコンテナ - レスポンシブ対応 */}
      <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
        {/* デスクトップレイアウト: グリッド、モバイルレイアウト: フルワイズ */}
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-6">
          
          {/* メインコンテンツエリア - レスポンシブ幅調整 */}
          <div className="w-full md:col-span-9">
            <div className="bg-white rounded-lg shadow-sm">
              {children}
            </div>
          </div>

          {/* デスクトップ用サイドバーステップナビゲーション */}
          <div className="hidden md:block md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">送り状作成ステップ</h3>
              <nav className="space-y-1">
                {steps.map((step) => {
                  const isActive = pathname === step.href
                  const isCompleted = isHydrated ? isStepCompleted(step.href) : false
                  
                  const stepContent = (
                    <div className={`
                      flex items-center justify-between p-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-purple-200 border-l-4 border-purple-600 text-purple-800' 
                        : isCompleted
                        ? 'bg-orange-100 border-l-4 border-orange-400 text-orange-800 hover:bg-orange-150'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}>
                      <div className="flex items-center">
                        <div className={`
                          flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mr-3
                          ${isActive 
                            ? 'bg-purple-600 text-white' 
                            : isCompleted
                            ? 'bg-orange-400 text-white'
                            : 'bg-gray-100 text-gray-500'
                          }
                        `}>
                          {isHydrated && isCompleted ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step.id
                          )}
                        </div>
                        <span className={`text-sm lg:text-base ${isActive ? 'font-medium' : isCompleted ? 'font-medium' : ''}`}>
                          {step.name}
                        </span>
                      </div>
                      
                      {/* 編集ボタン（完了したステップのみ表示） */}
                      {isHydrated && isCompleted && !isActive && (
                        <span className="text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded-md">
                          編集
                        </span>
                      )}
                    </div>
                  )
                  
                  return (
                    <div key={step.id}>
                      {isHydrated && ((!isActive && isCompleted) || (!isActive && !isCompleted)) ? (
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
              <div className="mt-6 lg:mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">ヘルプ</h4>
                <p className="text-sm text-blue-700">
                  各ステップを順番に進めて、送り状を作成してください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 