'use client'

import { useRouter } from 'next/navigation'
import { useShippingFormStore, type PackageInfo, useWaitForHydration } from '@/store/shippingFormStore'
import { isUS } from '@/lib/utils/isUS'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Package } from 'lucide-react'

export default function PackageDetailsForm() {
  const router = useRouter()
  const { isLoading: isHydrationLoading, isReady } = useWaitForHydration()
  
  // Zustandストアから直接状態とアクションを取得
  const packages = useShippingFormStore((state) => state.packages)
  const addPackage = useShippingFormStore((state) => state.addPackage)
  const updatePackage = useShippingFormStore((state) => state.updatePackage)
  const removePackage = useShippingFormStore((state) => state.removePackage)
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)
  

  // 荷物情報を更新する関数
  const handlePackageChange = (index: number, field: keyof PackageInfo, value: string) => {
    updatePackage(index, field, value)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/recipient')
  }

  // フォーム送信ハンドラー（次のページへの遷移のみ）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 荷物詳細ステップを完了としてマーク
    markStepCompleted('/shipping/new/packages')
    const cc = useShippingFormStore.getState().recipientInfo?.countryCode
    if (isUS(cc)) router.push('/shipping/new/contents/hts')
    else router.push('/shipping/new/contents')
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">荷物の詳細</h1>
            <p className="text-gray-600">荷物の詳細情報を入力してください</p>
          </div>

          {/* ハイドレーション待機ローディング */}
          {isHydrationLoading && (
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
                  荷物情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 荷物のリストを.map()でループ処理 */}
                  <div className="space-y-6 mt-4">
                    {packages.map((pkg, index) => (
                      <Card key={index} className="border-2 border-gray-200">
                        <CardHeader className="bg-gray-50 border-b">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">荷物 {index + 1}</CardTitle>
                            {packages.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePackage(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                削除
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          {/* Packaging Type */}
                          <div className="space-y-2">
                            <Label htmlFor={`type-${index}`} className="text-sm font-medium">
                              梱包材の種類 <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={pkg.type}
                              onValueChange={(value) => handlePackageChange(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="梱包材を選択してください" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="YOUR_PACKAGING">お客様ご用意の梱包材</SelectItem>
                                <SelectItem value="FEDEX_PAK">FedEx Pak</SelectItem>
                                <SelectItem value="FEDEX_BOX">FedEx Box</SelectItem>
                                <SelectItem value="FEDEX_ENVELOPE">FedEx Envelope</SelectItem>
                                <SelectItem value="FEDEX_TUBE">FedEx Tube</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Weight */}
                          <div className="space-y-2">
                            <Label htmlFor={`weight-${index}`} className="text-sm font-medium">
                              荷物の重量 (kg) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`weight-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={pkg.weight}
                              onChange={(e) => handlePackageChange(index, 'weight', e.target.value)}
                              placeholder="例: 2.5"
                              required
                            />
                          </div>

                          

                          {/* Conditional Dimensions - お客様ご用意の梱包材の場合のみ表示 */}
                          {pkg.type === 'YOUR_PACKAGING' && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                              <h3 className="text-sm font-medium text-gray-700 mb-3">
                                荷物のサイズ <span className="text-red-500">*</span>
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`length-${index}`} className="text-sm font-medium text-gray-600">
                                    長さ (cm)
                                  </Label>
                                  <Input
                                    id={`length-${index}`}
                                    type="number"
                                    min="0"
                                    value={pkg.length}
                                    onChange={(e) => handlePackageChange(index, 'length', e.target.value)}
                                    placeholder="例: 30"
                                    required={pkg.type === 'YOUR_PACKAGING'}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`width-${index}`} className="text-sm font-medium text-gray-600">
                                    幅 (cm)
                                  </Label>
                                  <Input
                                    id={`width-${index}`}
                                    type="number"
                                    min="0"
                                    value={pkg.width}
                                    onChange={(e) => handlePackageChange(index, 'width', e.target.value)}
                                    placeholder="例: 20"
                                    required={pkg.type === 'YOUR_PACKAGING'}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`height-${index}`} className="text-sm font-medium text-gray-600">
                                    高さ (cm)
                                  </Label>
                                  <Input
                                    id={`height-${index}`}
                                    type="number"
                                    min="0"
                                    value={pkg.height}
                                    onChange={(e) => handlePackageChange(index, 'height', e.target.value)}
                                    placeholder="例: 15"
                                    required={pkg.type === 'YOUR_PACKAGING'}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Add Another Package Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPackage}
                    className="w-full border-dashed border-green-600 text-green-600 hover:bg-green-50"
                  >
                    + 別の荷物を追加
                  </Button>

                  {/* ボタン */}
                  <div className="flex justify-between mt-8">
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