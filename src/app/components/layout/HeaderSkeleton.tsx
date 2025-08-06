'use client'

/**
 * HeaderSkeleton - 認証状態確認中に表示されるスケルトンUI
 * レースコンディション防止のため、認証状態が不明な間はこのコンポーネントを表示
 */
export default function HeaderSkeleton() {
  return (
    <header className="bg-purple-900">
      <div className="container mx-auto px-6 h-16">
        <nav className="flex justify-between items-center h-full">
          {/* ロゴ部分 */}
          <div className="text-white text-xl font-normal">
            QuickLabel
          </div>

          {/* ナビゲーション部分のスケルトン */}
          <div className="flex items-center space-x-8">
            {/* スケルトンアニメーション */}
            <div className="h-4 w-16 bg-purple-700 rounded animate-pulse opacity-60"></div>
            <div className="h-4 w-20 bg-purple-700 rounded animate-pulse opacity-60"></div>
            <div className="h-8 w-20 bg-purple-700 rounded animate-pulse opacity-60"></div>
          </div>
        </nav>
      </div>
    </header>
  )
}