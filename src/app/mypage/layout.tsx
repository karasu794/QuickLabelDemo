import { ReactNode } from 'react'
import Link from 'next/link'
import { 
  History, 
  Upload, 
  Receipt, 
  User,
  Settings
} from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

interface MypageLayoutProps {
  children: ReactNode
}

export default function MypageLayout({ children }: MypageLayoutProps) {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* サイドバー */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">マイページ</h2>
                </div>
                
                <nav className="space-y-2">
                  <SidebarLink
                    href="/mypage/profile"
                    icon={<Settings className="h-5 w-5" />}
                    label="プロフィール編集"
                    description="氏名・会社情報の更新"
                  />
                  <SidebarLink
                    href="/mypage/history"
                    icon={<History className="h-5 w-5" />}
                    label="発送履歴"
                    description="過去の発送を確認・再利用"
                  />
                  <SidebarLink
                    href="/mypage/csv-upload"
                    icon={<Upload className="h-5 w-5" />}
                    label="CSV一括登録"
                    description="複数発送の効率化"
                  />
                  <SidebarLink
                    href="/mypage/receipts"
                    icon={<Receipt className="h-5 w-5" />}
                    label="領収書一覧"
                    description="決済履歴・領収書発行"
                  />
                </nav>
              </div>
            </div>

            {/* メインコンテンツエリア */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow-sm border">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

// サイドバーリンクコンポーネント
interface SidebarLinkProps {
  href: string
  icon: ReactNode
  label: string
  description: string
}

function SidebarLink({ href, icon, label, description }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {label}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      </div>
    </Link>
  )
} 