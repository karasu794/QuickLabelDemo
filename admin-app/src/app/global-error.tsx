'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-4">
          <div className="text-6xl font-bold text-red-300 mb-2">⚠️</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            システムエラー
          </h1>
          <p className="text-gray-600 mb-6">
            予期しないエラーが発生しました。管理者にお問い合わせください。
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-4">
              エラーID: {error.digest}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          <a
            href="/"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            ホームページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}