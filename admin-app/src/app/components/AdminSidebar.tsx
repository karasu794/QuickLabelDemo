'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  PercentCircle,
  History,
  Bell,
  Building2,
  LayoutDashboard
} from 'lucide-react'

const navigationItems = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: LayoutDashboard
  },
  {
    name: 'ユーザー管理',
    href: '/users',
    icon: Users
  },
  {
    name: '取引履歴',
    href: '/transactions',
    icon: History
  },
  {
    name: '手数料設定',
    href: '/fees',
    icon: PercentCircle
  },
  {
    name: '通知管理',
    href: '/notifications',
    icon: Bell
  },
  {
    name: '会社情報',
    href: '/company-info',
    icon: Building2
  }
]

export default function AdminSidebar() {
  let pathname = '';
  
  try {
    pathname = usePathname() || '';
  } catch (error) {
    console.warn('usePathname failed, defaulting to empty string');
    pathname = '';
  }

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex flex-col bg-white shadow-lg border-r border-gray-200">
      {/* ヘッダー */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">管理画面</h2>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 mt-6 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  active
                    ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  active ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                }`} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* フッター情報 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          QuickLabel Admin v1.0
        </div>
      </div>
    </div>
  )
} 