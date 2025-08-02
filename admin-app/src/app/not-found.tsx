// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>ページが見つかりません - Admin App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
          .content { max-width: 28rem; width: 100%; text-align: center; }
          .error-code { font-size: 3.75rem; font-weight: bold; color: #111827; margin-bottom: 1rem; }
          .title { font-size: 1.5rem; font-weight: 600; color: #111827; margin-bottom: 1rem; }
          .description { color: #6b7280; margin-bottom: 2rem; }
          .button { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.375rem; text-decoration: none; font-weight: 500; font-size: 0.875rem; background: #2563eb; color: white; }
          .button:hover { background: #1d4ed8; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="content">
            <div className="error-code">404</div>
            <h1 className="title">ページが見つかりません</h1>
            <p className="description">
              お探しのページは存在しないか、移動した可能性があります。
            </p>
            <a href="/" className="button">
              ホームに戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}