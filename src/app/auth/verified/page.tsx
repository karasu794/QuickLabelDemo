import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VerifiedPage() {

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">メールアドレスの確認が完了しました</h1>
          <p className="text-gray-700">ご登録ありがとうございます。アカウントのメール認証が正常に完了しました。</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/mypage" className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            マイページへ
          </Link>
          <Link href="/" className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  )
}


