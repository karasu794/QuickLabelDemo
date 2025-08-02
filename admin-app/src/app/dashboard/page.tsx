export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          ダッシュボード
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          QuickLabel管理画面へようこそ
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            総ユーザー数
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            --
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            今月の取引数
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            --
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            総売上
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            ¥--
          </dd>
        </div>
      </div>

      <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          最近のアクティビティ
        </h3>
        <div className="mt-6 flow-root">
          <div className="text-center py-12">
            <p className="text-gray-500">データを読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  )
}