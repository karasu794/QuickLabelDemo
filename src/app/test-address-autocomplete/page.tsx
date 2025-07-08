'use client'

import { useState, useEffect } from 'react'
import AddressAutocomplete from '@/components/AddressAutocomplete'

export default function TestAddressAutocompletePage() {
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<{address: string, lat?: number, lng?: number} | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  useEffect(() => {
    const logs: string[] = []
    
    // APIキーの確認
    const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY
    logs.push(`APIキー設定: ${apiKey ? `あり（長さ: ${apiKey.length}文字）` : 'なし'}`)
    
    // Google Maps APIの読み込み状態確認
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined') {
        logs.push(`window.google: ${window.google ? 'あり' : 'なし'}`)
        if (window.google) {
          logs.push(`window.google.maps: ${window.google.maps ? 'あり' : 'なし'}`)
          if (window.google.maps) {
            logs.push(`window.google.maps.places: ${window.google.maps.places ? 'あり' : 'なし'}`)
          }
        }
      }
      setDebugInfo([...logs])
    }

    // 初回チェック
    checkGoogleMaps()

    // 遅延チェック（APIが非同期で読み込まれる場合）
    const timerId = setTimeout(() => {
      logs.push('--- 3秒後の再チェック ---')
      checkGoogleMaps()
    }, 3000)

    return () => clearTimeout(timerId)
  }, [])

  const handleAddress1Select = (address: string, lat?: number, lng?: number) => {
    setSelectedAddress({ address, lat, lng })
    console.log('住所1選択:', { address, lat, lng })
  }

  const handleAddress2Select = (address: string, lat?: number, lng?: number) => {
    setSelectedAddress({ address, lat, lng })
    console.log('住所2選択:', { address, lat, lng })
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">住所自動入力テスト</h1>
        
        {/* デバッグ情報 */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-6 font-mono text-sm">
          <h3 className="text-white font-bold mb-2">デバッグ情報:</h3>
          {debugInfo.map((info, index) => (
            <div key={index}>{info}</div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">use-places-autocomplete ライブラリ使用</h2>
            <p className="text-gray-600 mb-4">
              タイムアウト問題を解決するため、新しいライブラリに切り替えました。
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日本の住所（countryCode: JP）
              </label>
              <AddressAutocomplete
                value={address1}
                onChange={setAddress1}
                onAddressSelect={handleAddress1Select}
                placeholder="例: 東京都渋谷区渋谷1-1-1"
                countryCode="JP"
                className="w-full"
              />
              <p className="mt-2 text-sm text-gray-600">
                現在の値: {address1 || '(未入力)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アメリカの住所（countryCode: US）
              </label>
              <AddressAutocomplete
                value={address2}
                onChange={setAddress2}
                onAddressSelect={handleAddress2Select}
                placeholder="例: 123 Main St, New York, NY"
                countryCode="US"
                className="w-full"
              />
              <p className="mt-2 text-sm text-gray-600">
                現在の値: {address2 || '(未入力)'}
              </p>
            </div>
          </div>

          {selectedAddress && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">選択された住所の詳細:</h3>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                {JSON.stringify(selectedAddress, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-2">実装の特徴:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>use-places-autocompleteライブラリを使用</li>
              <li>デバウンス機能（300ms）でAPIリクエストを最適化</li>
              <li>国コードによる検索範囲の制限</li>
              <li>日本語での結果表示</li>
              <li>住所選択時に緯度経度も取得可能</li>
              <li>クリアボタン付き</li>
              <li>Google Maps API未読み込み時は通常のInputを表示</li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">トラブルシューティング:</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              <li>コンソール（F12）でエラーを確認してください</li>
              <li>Google Cloud ConsoleでAPIキーの制限を確認してください</li>
              <li>Places APIが有効になっているか確認してください</li>
              <li>Vercelの環境変数にAPIキーが設定されているか確認してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 