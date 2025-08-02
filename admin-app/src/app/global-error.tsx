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
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>サーバーエラー - Admin App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
          .content { max-width: 28rem; width: 100%; text-align: center; }
          .error-code { font-size: 3.75rem; font-weight: bold; color: #dc2626; margin-bottom: 1rem; }
          .title { font-size: 1.5rem; font-weight: 600; color: #111827; margin-bottom: 1rem; }
          .description { color: #6b7280; margin-bottom: 2rem; }
          .buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
          .button { padding: 0.5rem 1rem; border-radius: 0.375rem; text-decoration: none; font-weight: 500; font-size: 0.875rem; cursor: pointer; }
          .button-primary { background: #dc2626; color: white; border: none; }
          .button-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="content">
            <div className="error-code">500</div>
            <h1 className="title">サーバーエラーが発生しました</h1>
            <p className="description">
              申し訳ございません。サーバーで予期しないエラーが発生しました。
              しばらく時間をおいてから再度お試しください。
            </p>
            <div className="buttons">
              <button onClick={reset} className="button button-primary">
                再試行
              </button>
              <a href="/" className="button button-secondary">
                ホームに戻る
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}