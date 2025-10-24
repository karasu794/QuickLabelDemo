// 探索ログ: モバイル用ステップ進捗。各ステップにdata-test(step{n}-status)を付与。
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useShippingFormStore } from '@/store/shippingFormStore'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const steps = [
  { id: 1, name: '荷送人', shortName: '送人', href: '/shipping/new/shipper' },
  { id: 2, name: '荷受人', shortName: '受人', href: '/shipping/new/recipient' },
  { id: 3, name: '荷物', shortName: '荷物', href: '/shipping/new/packages' },
  { id: 4, name: '内容品', shortName: '内容', href: '/shipping/new/contents' },
  { id: 5, name: '確認', shortName: '確認', href: '/shipping/new/review' },
  { id: 6, name: '完了', shortName: '完了', href: '/shipping/new/success' }
]

export default function MobileStepProgress() {
  const pathname = usePathname()
  const isStepCompleted = useShippingFormStore((state) => state.isStepCompleted)
  const [isHydrated, setIsHydrated] = useState(false)

  // ハイドレーション完了を待つ
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 現在のステップを特定
  const currentStepIndex = steps.findIndex(step => step.href === pathname)
  const currentStep = steps[currentStepIndex]
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
      {/* ステップタイトルとナビゲーション */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* 前のステップボタン */}
          {currentStepIndex > 0 && (
            <Link 
              href={steps[currentStepIndex - 1].href}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
          )}
          
          {/* 現在のステップ情報 */}
          <div className="flex items-center space-x-2">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
              ${currentStep ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {currentStep?.id || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentStep?.name || 'ページが見つかりません'}
              </h2>
              <p className="text-xs text-gray-500">
                ステップ {currentStep?.id || '?'} / {steps.length}
              </p>
              {/* ステータス（E2E用data-test） */}
              {steps.map((s) => {
                const done = isHydrated ? isStepCompleted(s.href) : false
                return (
                  <span key={s.id} className="sr-only" data-test={`step${s.id}-status`}>
                    {done ? 'synced' : 'pending'}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* 次のステップボタン */}
        {currentStepIndex < steps.length - 1 && currentStepIndex >= 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">次へ</span>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* プログレスバー */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* ステップドット */}
        <div className="absolute top-0 left-0 w-full h-2 flex justify-between items-center">
          {steps.map((step, index) => {
            const isActive = pathname === step.href
            const isCompleted = isHydrated ? isStepCompleted(step.href) : false
            const isPassed = index < currentStepIndex
            
            return (
              <div
                key={step.id}
                className={`
                  w-3 h-3 rounded-full border-2 bg-white transition-colors duration-200
                  ${isActive 
                    ? 'border-purple-600 bg-purple-600' 
                    : isPassed || isCompleted
                    ? 'border-orange-400 bg-orange-400'
                    : 'border-gray-300'
                  }
                `}
                style={{ 
                  transform: 'translateY(-2px)',
                  zIndex: 10
                }}
              />
            )
          })}
        </div>
      </div>

      {/* ステップ名一覧（横スクロール対応） */}
      <div className="mt-3 overflow-x-auto">
        <div className="flex space-x-4 min-w-max">
          {steps.map((step, index) => {
            const isActive = pathname === step.href
            const isCompleted = isHydrated ? isStepCompleted(step.href) : false
            const isPassed = index < currentStepIndex
            
            return (
              <div key={step.id} className="flex-shrink-0">
                {(isCompleted || isPassed) && !isActive ? (
                  <Link href={step.href} className="block">
                    <span className={`
                      text-xs px-2 py-1 rounded-full transition-colors
                      ${isActive 
                        ? 'bg-purple-100 text-purple-800 font-medium' 
                        : isPassed || isCompleted
                        ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                        : 'text-gray-500'
                      }
                    `}>
                      {step.shortName}
                    </span>
                  </Link>
                ) : (
                  <span className={`
                    text-xs px-2 py-1 rounded-full transition-colors
                    ${isActive 
                      ? 'bg-purple-100 text-purple-800 font-medium' 
                      : isPassed || isCompleted
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-500'
                    }
                  `}>
                    {step.shortName}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 