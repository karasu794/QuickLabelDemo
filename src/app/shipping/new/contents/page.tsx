'use client'

import { useState } from 'react'
import { useItems, useWaitForHydration, useRecipientInfo } from '@/store/shippingFormStore'
import { getCountryOptions } from '@/lib/data/locations'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import HSCodeAutocomplete from '@/components/HSCodeAutocomplete'

import { AlertCircle, Plus, Package, X, Loader2 } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'

export default function ContentsPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { items, setItems, addItem, updateItem, removeItem } = useItems()
  const { recipientInfo } = useRecipientInfo()
  const [error, setError] = useState('')
  
  const countryOptions = getCountryOptions()

  const handleItemChange = (index: number, field: keyof typeof items[0], value: string | number) => {
    updateItem(index, field, value)
  }

  // HSCodeAutocomplete用のハンドラー
  const handleDescriptionChange = (index: number, description: string) => {
    updateItem(index, 'description', description)
  }

  const handleHSCodeChange = (index: number, hsCode: string) => {
    updateItem(index, 'hsCode', hsCode)
  }

  const handleAddItem = () => {
    addItem()
  }

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      removeItem(index)
    }
  }

  const validateForm = () => {
    for (const item of items) {
      if (!item.description.trim()) {
        setError('すべての商品の説明を入力してください')
        return false
      }
      if (!item.countryOfManufacture) {
        setError('すべての商品の製造国を選択してください')
        return false
      }
      if (item.quantity <= 0) {
        setError('数量は1以上を入力してください')
        return false
      }
      if (item.weight <= 0) {
        setError('重量は0より大きい値を入力してください')
        return false
      }
      if (item.unitPrice <= 0) {
        setError('単価は0より大きい値を入力してください')
        return false
      }
    }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (validateForm()) {
      router.push('/shipping/new/review')
  }
  }

  const handlePrevious = () => {
    router.push('/shipping/new/packages')
  }

  const getTotalValue = () => {
    return items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0)
  }

  const getTotalWeight = () => {
    return items.reduce((total, item) => total + item.weight, 0)
  }

  // HSコード機能が使用可能かどうかを判定
  const isHSCodeAvailable = recipientInfo && recipientInfo.countryCode && recipientInfo.countryCode.trim() !== ''

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">内容品情報</h1>
            <p className="text-gray-600">送る商品の詳細情報を入力してください</p>
        </div>

          {/* ハイドレーション待機ローディング */}
          {isLoading && (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="text-gray-600">データを読み込み中...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* フォーム本体 */}
          {isReady && (

          <Card>
            <CardHeader className="bg-green-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                内容品情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">商品 {index + 1}</h3>
                {items.length > 1 && (
                        <Button
                    type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700"
                  >
                          <X className="h-4 w-4" />
                        </Button>
                )}
              </div>
              
                    <div className="grid grid-cols-1 gap-4">
                      {/* HSコード自動入力コンポーネント */}
                      {isHSCodeAvailable ? (
                        <HSCodeAutocomplete
                          description={item.description}
                          hsCode={item.hsCode}
                          destinationCountryCode={recipientInfo.countryCode}
                          onDescriptionChange={(description) => handleDescriptionChange(index, description)}
                          onHSCodeChange={(hsCode) => handleHSCodeChange(index, hsCode)}
                          label="商品説明・HSコード"
                          placeholder="商品の詳細な説明を入力してください（例：コットンTシャツ、電子機器、書籍など）"
                          required
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* 通常の入力フィールド（HSコード機能無効時） */}
                <div className="space-y-2">
                            <Label htmlFor={`description-${index}`}>商品説明 <span className="text-red-500">*</span></Label>
                  <textarea
                              id={`description-${index}`}
                    value={item.description}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="商品の詳細な説明を入力してください"
                              rows={3}
                    required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                            <Label htmlFor={`hsCode-${index}`}>HSコード</Label>
                            <Input
                              id={`hsCode-${index}`}
                    value={item.hsCode}
                    onChange={(e) => handleItemChange(index, 'hsCode', e.target.value)}
                              placeholder="例: 1234.56.78"
                            />
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="flex items-center space-x-2 text-yellow-700 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span>HSコード自動入力機能を使用するには、まず受取人の国を選択してください。</span>
                            </div>
                          </div>
                        </div>
                      )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                        <Label htmlFor={`countryOfManufacture-${index}`}>製造国 <span className="text-red-500">*</span></Label>
                                              <Combobox
                        options={countryOptions}
                        value={item.countryOfManufacture}
                        onSelect={(value) => handleItemChange(index, 'countryOfManufacture', value)}
                        placeholder="製造国を選択してください"
                        searchPlaceholder="国名または国コードで検索..."
                        emptyText="該当する国が見つかりません"
                      />
                  </div>
                  <div className="space-y-2">
                        <Label htmlFor={`quantity-${index}`}>数量 <span className="text-red-500">*</span></Label>
                        <Input
                          id={`quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                        <Label htmlFor={`weight-${index}`}>重量 (kg) <span className="text-red-500">*</span></Label>
                        <Input
                          id={`weight-${index}`}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={item.weight}
                      onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`unitPrice-${index}`}>単価 (JPY) <span className="text-red-500">*</span></Label>
                        <Input
                          id={`unitPrice-${index}`}
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                      <div className="space-y-2">
                        <Label htmlFor={`currency-${index}`}>通貨</Label>
                        <Select 
                          value={item.currency} 
                          onValueChange={(value) => handleItemChange(index, 'currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JPY">JPY</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                </div>
              </div>

                    <div className="text-right text-sm text-gray-600">
                      合計価格: {(item.unitPrice * item.quantity).toLocaleString()} {item.currency}
                    </div>
            </div>
          ))}

                <Button
              type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="w-full"
            >
                  <Plus className="h-4 w-4 mr-2" />
                  商品を追加
                </Button>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">総重量:</span> {getTotalWeight().toFixed(1)} kg
                    </div>
                    <div>
                      <span className="font-medium">総価格:</span> {getTotalValue().toLocaleString()} JPY
              </div>
            </div>
          </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    戻る
                  </Button>
                  <Button type="submit">
                    次へ
                  </Button>
          </div>
        </form>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
} 