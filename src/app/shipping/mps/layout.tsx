'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Circle, Package, Plus, CheckSquare } from 'lucide-react'

const MPS_STEPS = [
  { 
    path: '/shipping/mps/setup', 
    title: 'Open Shipment作成', 
    description: '基本情報と最初の荷物',
    icon: Package
  },
  { 
    path: '/shipping/mps/add-packages', 
    title: 'パッケージ追加', 
    description: '段階的に荷物を追加',
    icon: Plus
  },
  { 
    path: '/shipping/mps/confirm', 
    title: '確定・ラベル生成', 
    description: '送り状確定と決済',
    icon: CheckSquare
  }
]

interface MPSLayoutProps {
  children: React.ReactNode
}

export default function MPSLayout({ children }: MPSLayoutProps) {
  const pathname = usePathname()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    const stepIndex = MPS_STEPS.findIndex(step => step.path === pathname)
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex)
    }
  }, [pathname])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              MPS配送作成
            </h1>
            <p className="text-gray-600">
              複数個口の段階的送り状作成（FedEx Open Ship API）
            </p>
          </div>

          {/* ステップインジケーター */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {MPS_STEPS.map((step, index) => {
                  const isCompleted = index < currentStepIndex
                  const isCurrent = index === currentStepIndex
                  const IconComponent = step.icon

                  return (
                    <div key={step.path} className="flex items-center">
                      {/* ステップアイコン */}
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors
                        ${isCompleted 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : isCurrent 
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <IconComponent className="h-6 w-6" />
                        )}
                      </div>

                      {/* ステップ情報 */}
                      <div className="ml-4 text-left">
                        <h3 className={`text-sm font-medium ${
                          isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {step.description}
                        </p>
                      </div>

                      {/* 接続線 */}
                      {index < MPS_STEPS.length - 1 && (
                        <div className={`
                          flex-1 h-0.5 mx-6 transition-colors
                          ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'}
                        `} />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* メインコンテンツ */}
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 