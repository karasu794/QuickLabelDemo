import { Receipt } from 'lucide-react'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

export default function MypageReceiptsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">領収書一覧</h1>
      </div>
      
      <div className="text-center py-12">
        <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">領収書一覧機能を準備中...</p>
        <p className="text-sm text-gray-400">
          過去の決済履歴と領収書をダウンロードすることができます
        </p>
      </div>
    </div>
  )
} 