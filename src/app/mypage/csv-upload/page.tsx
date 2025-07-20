import { Upload } from 'lucide-react'

export default function MypageCsvUploadPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">CSV一括登録</h1>
      </div>
      
      <div className="text-center py-12">
        <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">CSV一括登録機能を準備中...</p>
        <p className="text-sm text-gray-400">
          CSVファイルから複数の送り状を一括で作成することができます
        </p>
      </div>
    </div>
  )
} 