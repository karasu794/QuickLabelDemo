'use client'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Users,
  Info
} from 'lucide-react'

interface UploadResult {
  success: boolean
  message?: string
  count?: number
  error?: string
  details?: string[]
}

export default function CSVUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null) // 結果をリセット
    }
  }

  const handleTemplateDownload = async () => {
    try {
      const response = await fetch('/api/address-book/template')
      
      if (!response.ok) {
        throw new Error('テンプレートのダウンロードに失敗しました')
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = 'address_template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('テンプレートダウンロードエラー:', error)
      // フォールバック：エラー時は既存の静的ファイルを使用
      const link = document.createElement('a')
      link.href = '/template.csv'
      link.download = 'template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/address-book/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          count: data.count
        })
        // 成功時はファイル選択をリセット
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setResult({
          success: false,
          error: data.error,
          details: data.details
        })
      }
    } catch (error) {
      console.error('アップロードエラー:', error)
      setResult({
        success: false,
        error: 'アップロードに失敗しました'
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-2 rounded-lg">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CSV一括登録</h1>
            <p className="text-gray-600">複数の宛先を一度に登録できます</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: 説明とテンプレート */}
          <div className="space-y-6">
            {/* テンプレートダウンロード */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <Download className="h-5 w-5" />
                テンプレートダウンロード
              </h2>
              <p className="text-blue-800 mb-4">
                まずはテンプレートファイルをダウンロードして、必要な項目を確認してください。
              </p>
              <button
                onClick={handleTemplateDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                template.csv をダウンロード
              </button>
            </div>

            {/* 使用方法 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="h-5 w-5" />
                使用方法
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
                  <span>テンプレートファイルをダウンロード</span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">2</span>
                  <span>Excel等で宛先情報を入力（contact_name, country_codeは必須）</span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">3</span>
                  <span>CSV形式で保存してアップロード</span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">4</span>
                  <span>登録完了後、発送時に宛先として利用可能</span>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">注意事項</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• ファイルサイズは5MB以下</li>
                <li>• 宛先名（contact_name）は必須</li>
                <li>• 国コード（country_code）は2文字（例: JP, US）</li>
                <li>• CSV形式（UTF-8エンコード推奨）</li>
              </ul>
            </div>
          </div>

          {/* 右側: アップロード */}
          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                ファイルアップロード
              </h2>

              {/* ファイル選択エリア */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file"
                />
                <label
                  htmlFor="csv-file"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="bg-gray-100 p-3 rounded-full">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">CSVファイルを選択</p>
                    <p className="text-sm text-gray-500">または、ここにドラッグ&ドロップ</p>
                  </div>
                </label>
              </div>

              {/* 選択されたファイル情報 */}
              {file && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* アップロードボタン */}
              <div className="mt-6">
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {uploading ? 'アップロード中...' : 'CSVをアップロード'}
                </button>
              </div>
            </div>

            {/* 結果表示 */}
            {result && (
              <div className={`border rounded-lg p-6 ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.success ? '登録完了' : 'エラーが発生しました'}
                    </h3>
                    <p className={`mt-1 ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? result.message : result.error}
                    </p>
                    
                    {/* エラー詳細 */}
                    {!result.success && result.details && result.details.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-900 mb-2">詳細:</p>
                        <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                          {result.details.map((detail, index) => (
                            <li key={index} className="flex gap-2">
                              <span>•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 