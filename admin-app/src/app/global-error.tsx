'use client' // Global Error コンポーネントはクライアントコンポーネントである必要があります

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl font-bold text-red-600 mb-4">500</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              サーバーエラーが発生しました
            </h1>
            <p className="text-gray-600 mb-8">
              申し訳ございません。サーバーで予期しないエラーが発生しました。
              しばらく時間をおいてから再度お試しください。
            </p>
            <div className="space-x-4">
              <button
                onClick={reset}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                再試行
              </button>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ホームに戻る
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-red-50 rounded-lg text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">開発モード - エラー詳細:</h3>
                <pre className="text-xs text-red-700 whitespace-pre-wrap">
                  {error.message}
                </pre>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}