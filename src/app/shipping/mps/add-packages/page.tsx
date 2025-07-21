'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMPSStore } from '@/store/mpsStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function MPSAddPackagesPage() {
  const router = useRouter()
  const {
    shipment,
    packages,
    isLoading,
    error,
    addPackage,
    updatePackage,
    removePackage,
    markPackageAddedToFedEx,
    setCurrentStep,
    setLoading,
    setError
  } = useMPSStore()

  const [pendingPackages, setPendingPackages] = useState<string[]>([]) // 追加処理中のパッケージID

  useEffect(() => {
    setCurrentStep('add-packages')
    
    // Open Shipmentが作成されていない場合は前のステップに戻る
    if (!shipment || !shipment.masterTrackingNumber) {
      router.push('/shipping/mps/setup')
      return
    }
  }, [setCurrentStep, shipment, router])

  // 新しいパッケージを追加
  const handleAddNewPackage = () => {
    addPackage()
  }

  // パッケージをFedXに追加
  const addPackageToFedEx = async (packageId: string) => {
    if (!shipment?.masterTrackingNumber) {
      setError('Open Shipmentが見つかりません')
      return
    }

    setPendingPackages(prev => [...prev, packageId])
    setError(null)

    try {
      const packageToAdd = packages.find(pkg => pkg.id === packageId)
      if (!packageToAdd) {
        throw new Error('パッケージが見つかりません')
      }

      // バリデーション
      if (!packageToAdd.weight) {
        throw new Error('重量は必須です')
      }
      if (packageToAdd.type === 'YOUR_PACKAGING' && (!packageToAdd.length || !packageToAdd.width || !packageToAdd.height)) {
        throw new Error('カスタム梱包材の場合は寸法が必須です')
      }

      const requestData = {
        masterTrackingNumber: shipment.masterTrackingNumber,
        packages: [{
          weight: packageToAdd.weight,
          type: packageToAdd.type,
          length: packageToAdd.length,
          width: packageToAdd.width,
          height: packageToAdd.height,
          declaredValue: packageToAdd.declaredValue
        }]
      }

      console.log(`📦 パッケージ${packageToAdd.sequenceNumber}をFedXに追加中...`, requestData)

      const response = await fetch('/api/open-ship/add-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'パッケージ追加に失敗しました')
      }

      const result = await response.json()
      console.log('✅ パッケージ追加成功:', result.data)

      // ストアを更新
      const addedPackage = result.data.addedPackages[0]
      if (addedPackage) {
        markPackageAddedToFedEx(packageId, addedPackage.sequenceNumber)
      }

    } catch (error) {
      console.error('❌ パッケージ追加エラー:', error)
      setError(error instanceof Error ? error.message : 'パッケージ追加に失敗しました')
    } finally {
      setPendingPackages(prev => prev.filter(id => id !== packageId))
    }
  }

  // パッケージ削除
  const handleRemovePackage = (packageId: string) => {
    const packageToRemove = packages.find(pkg => pkg.id === packageId)
    if (packageToRemove?.addedToFedEx) {
      alert('FedXに追加済みのパッケージは削除できません。確定前にのみ編集可能です。')
      return
    }
    removePackage(packageId)
  }

  // 確定ページに進む
  const proceedToConfirm = () => {
    const hasUnaddedPackages = packages.some(pkg => !pkg.addedToFedEx)
    if (hasUnaddedPackages) {
      alert('すべてのパッケージをFedXに追加してから次に進んでください。')
      return
    }
    router.push('/shipping/mps/confirm')
  }

  // 統計計算
  const totalPackages = packages.length
  const addedPackages = packages.filter(pkg => pkg.addedToFedEx).length
  const pendingAdditions = pendingPackages.length
  const totalWeight = packages.reduce((sum, pkg) => sum + (parseFloat(pkg.weight) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Open Shipment情報 */}
      {shipment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Open Shipment</h3>
                <p className="text-blue-700 text-sm">追跡番号: {shipment.masterTrackingNumber}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {addedPackages}/{totalPackages} パッケージ追加済み
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            パッケージ管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalPackages}</div>
              <div className="text-sm text-gray-600">総パッケージ数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{addedPackages}</div>
              <div className="text-sm text-gray-600">FedX追加済み</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingAdditions}</div>
              <div className="text-sm text-gray-600">追加処理中</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalWeight.toFixed(1)} kg</div>
              <div className="text-sm text-gray-600">総重量</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パッケージリスト */}
      <div className="space-y-4">
        {packages.map((pkg, index) => {
          const isPending = pendingPackages.includes(pkg.id)
          const isAdded = pkg.addedToFedEx
          const canEdit = !isAdded && !isPending

          return (
            <Card key={pkg.id} className={`
              ${isAdded ? 'border-green-200 bg-green-50' : 
                isPending ? 'border-yellow-200 bg-yellow-50' : 
                'border-gray-200'}
            `}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">パッケージ {index + 1}</CardTitle>
                    {isAdded && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        FedX追加済み
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        追加処理中
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isAdded && !isPending && (
                      <Button
                        size="sm"
                        onClick={() => addPackageToFedEx(pkg.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!pkg.weight || (pkg.type === 'YOUR_PACKAGING' && (!pkg.length || !pkg.width || !pkg.height))}
                      >
                        FedXに追加
                      </Button>
                    )}
                    {canEdit && packages.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemovePackage(pkg.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`type-${pkg.id}`}>梱包材の種類</Label>
                    <Select
                      value={pkg.type}
                      onValueChange={(value) => updatePackage(pkg.id, 'type', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className={!canEdit ? 'bg-gray-100' : ''}>
                        <SelectValue placeholder="梱包材を選択" />
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
                  <div className="space-y-2">
                    <Label htmlFor={`weight-${pkg.id}`}>重量 (kg) <span className="text-red-500">*</span></Label>
                    <Input
                      id={`weight-${pkg.id}`}
                      type="number"
                      step="0.1"
                      min="0"
                      value={pkg.weight}
                      onChange={(e) => updatePackage(pkg.id, 'weight', e.target.value)}
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-gray-100' : ''}
                      required
                    />
                  </div>
                </div>

                {pkg.type === 'YOUR_PACKAGING' && (
                  <div className="space-y-2">
                    <Label>寸法 (cm) <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`length-${pkg.id}`} className="text-sm">長さ</Label>
                        <Input
                          id={`length-${pkg.id}`}
                          type="number"
                          min="0"
                          value={pkg.length || ''}
                          onChange={(e) => updatePackage(pkg.id, 'length', e.target.value)}
                          disabled={!canEdit}
                          className={!canEdit ? 'bg-gray-100' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`width-${pkg.id}`} className="text-sm">幅</Label>
                        <Input
                          id={`width-${pkg.id}`}
                          type="number"
                          min="0"
                          value={pkg.width || ''}
                          onChange={(e) => updatePackage(pkg.id, 'width', e.target.value)}
                          disabled={!canEdit}
                          className={!canEdit ? 'bg-gray-100' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`height-${pkg.id}`} className="text-sm">高さ</Label>
                        <Input
                          id={`height-${pkg.id}`}
                          type="number"
                          min="0"
                          value={pkg.height || ''}
                          onChange={(e) => updatePackage(pkg.id, 'height', e.target.value)}
                          disabled={!canEdit}
                          className={!canEdit ? 'bg-gray-100' : ''}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`declaredValue-${pkg.id}`}>申告価額 (円)</Label>
                  <Input
                    id={`declaredValue-${pkg.id}`}
                    type="number"
                    min="0"
                    value={pkg.declaredValue || ''}
                    onChange={(e) => updatePackage(pkg.id, 'declaredValue', e.target.value)}
                    disabled={!canEdit}
                    className={!canEdit ? 'bg-gray-100' : ''}
                    placeholder="例: 100000"
                  />
                  <p className="text-xs text-gray-600">
                    この荷物の価値（保険に使用されます）
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* アクションボタン */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleAddNewPackage}
          variant="outline"
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
          パッケージを追加
        </Button>

        <div className="flex gap-4">
          <Button
            onClick={() => router.push('/shipping/mps/setup')}
            variant="outline"
          >
            前に戻る
          </Button>
          
          <Button
            onClick={proceedToConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={addedPackages !== totalPackages || pendingAdditions > 0}
          >
            確定に進む
            {addedPackages < totalPackages && (
              <span className="ml-2 text-xs">
                ({totalPackages - addedPackages}個未追加)
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 説明文 */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">📝 使用方法</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• パッケージを追加：「パッケージを追加」ボタンで新しい荷物を追加できます</li>
            <li>• FedXに追加：パッケージ情報を入力後、「FedXに追加」ボタンで段階的に追加</li>
            <li>• 編集制限：FedXに追加済みのパッケージは編集・削除できません</li>
            <li>• 確定：すべてのパッケージをFedXに追加後、確定ページで送り状を生成できます</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 