'use client'

import Link from 'next/link'
import { 
  Users, 
  PercentCircle, 
  History, 
  Bell, 
  Building2,
  TrendingUp,
  Shield,
  Settings 
} from 'lucide-react'

const dashboardCards = [
  {
    title: 'ユーザー管理',
    description: '登録ユーザーの管理と詳細情報の確認',
    href: '/users',
    icon: Users,
    color: 'bg-blue-500'
  },
  {
    title: '取引履歴',
    description: '全ての取引記録と売上データの管理',
    href: '/transactions',
    icon: History,
    color: 'bg-green-500'
  },
  {
    title: '手数料設定',
    description: 'サービス手数料率の設定と管理',
    href: '/fees',
    icon: PercentCircle,
    color: 'bg-purple-500'
  },
  {
    title: '通知管理',
    description: 'システム通知とお知らせの管理',
    href: '/notifications',
    icon: Bell,
    color: 'bg-orange-500'
  },
  {
    title: '会社情報',
    description: '企業情報と設定の管理',
    href: '/company-info',
    icon: Building2,
    color: 'bg-indigo-500'
  },
  {
    title: 'デバッグ',
    description: 'システムデバッグとエラーログ確認',
    href: '/debug',
    icon: Settings,
    color: 'bg-gray-500'
  }
]

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="mt-2 text-gray-600">QuickLabelの管理機能にアクセスできます</p>
      </div>

      {/* ウェルカムカード */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-8 text-white">
        <div className="flex items-center">
          <Shield className="h-12 w-12 mr-4" />
          <div>
            <h2 className="text-2xl font-bold">管理者として認証されました</h2>
            <p className="text-purple-100 mt-1">全ての管理機能にアクセス可能です</p>
          </div>
        </div>
      </div>

      {/* 管理機能カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-gray-300"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
                  管理画面へ →
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* システム情報 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">システム情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">稼働中</div>
            <div className="text-sm text-gray-600">システム状態</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">v1.0</div>
            <div className="text-sm text-gray-600">管理画面バージョン</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">Admin</div>
            <div className="text-sm text-gray-600">アクセスレベル</div>
          </div>
        </div>
      </div>
    </div>
  )
}