export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-4">
          <div className="text-6xl font-bold text-gray-300 mb-2">404</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            ページが見つかりません
          </h1>
          <p className="text-gray-600 mb-6">
            お探しのページは存在しないか、移動または削除された可能性があります。
          </p>
        </div>
        <div className="space-y-3">
          <a
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            ホームページに戻る
          </a>
          <a
            href="/login"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            ログインページ
          </a>
        </div>
      </div>
    </div>
  );
}