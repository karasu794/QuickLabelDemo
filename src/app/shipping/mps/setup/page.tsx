'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMPSStore } from '@/store/mpsStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Package, Users, MapPin } from 'lucide-react'
import { GooglePlaceAutocomplete, ParsedAddress } from '@/components/GooglePlaceAutocomplete'
import { getPrefectureFromPostalCode, usStates, canadianProvinces } from '@/lib/data/locations'

export default function MPSSetupPage() {
  const router = useRouter()
  const {
    shipment,
    shipperInfo,
    recipientInfo,
    packages,
    items,
    isLoading,
    error,
    setShipment,
    updateShipperInfo,
    updateRecipientInfo,
    updatePackage,
    setCurrentStep,
    setLoading,
    setError
  } = useMPSStore()

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setCurrentStep('setup')
  }, [setCurrentStep])

  // フォームバリデーション
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // 荷送人情報
    if (!shipperInfo.companyName) errors.shipperCompanyName = '会社名は必須です'
    if (!shipperInfo.contactName) errors.shipperContactName = '担当者名は必須です'
    if (!shipperInfo.phoneNumber) errors.shipperPhoneNumber = '電話番号は必須です'
    if (!shipperInfo.postalCode) errors.shipperPostalCode = '郵便番号は必須です'
    if (!shipperInfo.cityName) errors.shipperCityName = '市区町村は必須です'
    if (!shipperInfo.address1) errors.shipperAddress1 = '住所は必須です'

    // 荷受人情報
    if (!recipientInfo.companyName) errors.recipientCompanyName = '会社名は必須です'
    if (!recipientInfo.contactName) errors.recipientContactName = '担当者名は必須です'
    if (!recipientInfo.phoneNumber) errors.recipientPhoneNumber = '電話番号は必須です'
    if (!recipientInfo.email) errors.recipientEmail = 'メールアドレスは必須です'
    if (!recipientInfo.postalCode) errors.recipientPostalCode = '郵便番号は必須です'
    if (!recipientInfo.cityName) errors.recipientCityName = '市区町村は必須です'
    if (!recipientInfo.address1) errors.recipientAddress1 = '住所は必須です'

    // 最初のパッケージ
    const firstPackage = packages[0]
    if (firstPackage) {
      if (!firstPackage.weight) errors.packageWeight = '重量は必須です'
      if (firstPackage.type === 'YOUR_PACKAGING') {
        if (!firstPackage.length) errors.packageLength = '長さは必須です'
        if (!firstPackage.width) errors.packageWidth = '幅は必須です'
        if (!firstPackage.height) errors.packageHeight = '高さは必須です'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Open Shipment作成
  const createOpenShipment = async () => {
    if (!validateForm()) {
      setError('入力内容に不備があります。エラーを修正してください。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData = {
        shipperInfo,
        recipientInfo,
        packages: packages.map(pkg => ({
          weight: pkg.weight,
          type: pkg.type,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          declaredValue: pkg.declaredValue
        })),
        items: items.filter(item => item.description && item.weight > 0),
        serviceType: 'FEDEX_INTERNATIONAL_PRIORITY'
      }

      console.log('🚀 Open Shipment作成リクエスト:', requestData)

      const response = await fetch('/api/open-ship/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Open Shipment作成に失敗しました')
      }

      const result = await response.json()
      console.log('✅ Open Shipment作成成功:', result.data)

      // ストアに結果を保存
      setShipment({
        id: result.data.dbRecordId,
        masterTrackingNumber: result.data.masterTrackingNumber,
        fedexIndex: result.data.index,
        status: 'created',
        totalPackages: 1,
        packagesAdded: 1,
        serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
        createdAt: new Date().toISOString()
      })

      // 最初のパッケージをFedEx追加済みとしてマーク
      if (packages[0]) {
        packages[0].addedToFedEx = true
        packages[0].sequenceNumber = 1
      }

      // 次のステップに進む
      router.push('/shipping/mps/add-packages')

    } catch (error) {
      console.error('❌ Open Shipment作成エラー:', error)
      setError(error instanceof Error ? error.message : 'Open Shipment作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 住所オートコンプリートハンドラー
  const handleShipperAddressSelect = (address: ParsedAddress) => {
    updateShipperInfo('countryCode', address.countryCode)
    updateShipperInfo('stateCode', address.stateCode || '')
    updateShipperInfo('cityName', address.cityName)
    updateShipperInfo('postalCode', address.postalCode)
    updateShipperInfo('address1', address.address1)
  }

  const handleRecipientAddressSelect = (address: ParsedAddress) => {
    updateRecipientInfo('countryCode', address.countryCode)
    updateRecipientInfo('stateCode', address.stateCode || '')
    updateRecipientInfo('cityName', address.cityName)
    updateRecipientInfo('postalCode', address.postalCode)
    updateRecipientInfo('address1', address.address1)
  }

  const firstPackage = packages[0]

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 荷送人情報 */}
      <Card>
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            荷送人情報
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipperCompanyName">会社名 <span className="text-red-500">*</span></Label>
              <Input
                id="shipperCompanyName"
                value={shipperInfo.companyName}
                onChange={(e) => updateShipperInfo('companyName', e.target.value)}
                className={formErrors.shipperCompanyName ? 'border-red-500' : ''}
              />
              {formErrors.shipperCompanyName && (
                <p className="text-red-500 text-xs">{formErrors.shipperCompanyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipperContactName">担当者名 <span className="text-red-500">*</span></Label>
              <Input
                id="shipperContactName"
                value={shipperInfo.contactName}
                onChange={(e) => updateShipperInfo('contactName', e.target.value)}
                className={formErrors.shipperContactName ? 'border-red-500' : ''}
              />
              {formErrors.shipperContactName && (
                <p className="text-red-500 text-xs">{formErrors.shipperContactName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipperPhoneNumber">電話番号 <span className="text-red-500">*</span></Label>
              <Input
                id="shipperPhoneNumber"
                value={shipperInfo.phoneNumber}
                onChange={(e) => updateShipperInfo('phoneNumber', e.target.value)}
                className={formErrors.shipperPhoneNumber ? 'border-red-500' : ''}
              />
              {formErrors.shipperPhoneNumber && (
                <p className="text-red-500 text-xs">{formErrors.shipperPhoneNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipperPostalCode">郵便番号 <span className="text-red-500">*</span></Label>
              <Input
                id="shipperPostalCode"
                value={shipperInfo.postalCode}
                onChange={(e) => updateShipperInfo('postalCode', e.target.value)}
                className={formErrors.shipperPostalCode ? 'border-red-500' : ''}
              />
              {formErrors.shipperPostalCode && (
                <p className="text-red-500 text-xs">{formErrors.shipperPostalCode}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipperAddress">住所 <span className="text-red-500">*</span></Label>
            <GooglePlaceAutocomplete
              onAddressSelect={handleShipperAddressSelect}
              placeholder="住所を入力または検索..."
              defaultValue={shipperInfo.address1}
            />
            {formErrors.shipperAddress1 && (
              <p className="text-red-500 text-xs">{formErrors.shipperAddress1}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 荷受人情報 */}
      <Card>
        <CardHeader className="bg-green-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            荷受人情報
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientCompanyName">会社名 <span className="text-red-500">*</span></Label>
              <Input
                id="recipientCompanyName"
                value={recipientInfo.companyName}
                onChange={(e) => updateRecipientInfo('companyName', e.target.value)}
                className={formErrors.recipientCompanyName ? 'border-red-500' : ''}
              />
              {formErrors.recipientCompanyName && (
                <p className="text-red-500 text-xs">{formErrors.recipientCompanyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientContactName">担当者名 <span className="text-red-500">*</span></Label>
              <Input
                id="recipientContactName"
                value={recipientInfo.contactName}
                onChange={(e) => updateRecipientInfo('contactName', e.target.value)}
                className={formErrors.recipientContactName ? 'border-red-500' : ''}
              />
              {formErrors.recipientContactName && (
                <p className="text-red-500 text-xs">{formErrors.recipientContactName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientPhoneNumber">電話番号 <span className="text-red-500">*</span></Label>
              <Input
                id="recipientPhoneNumber"
                value={recipientInfo.phoneNumber}
                onChange={(e) => updateRecipientInfo('phoneNumber', e.target.value)}
                className={formErrors.recipientPhoneNumber ? 'border-red-500' : ''}
              />
              {formErrors.recipientPhoneNumber && (
                <p className="text-red-500 text-xs">{formErrors.recipientPhoneNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">メールアドレス <span className="text-red-500">*</span></Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientInfo.email}
                onChange={(e) => updateRecipientInfo('email', e.target.value)}
                className={formErrors.recipientEmail ? 'border-red-500' : ''}
              />
              {formErrors.recipientEmail && (
                <p className="text-red-500 text-xs">{formErrors.recipientEmail}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientAddress">住所 <span className="text-red-500">*</span></Label>
            <GooglePlaceAutocomplete
              onAddressSelect={handleRecipientAddressSelect}
              placeholder="住所を入力または検索..."
              defaultValue={recipientInfo.address1}
            />
            {formErrors.recipientAddress1 && (
              <p className="text-red-500 text-xs">{formErrors.recipientAddress1}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isResidential"
              checked={recipientInfo.isResidential}
              onCheckedChange={(checked) => updateRecipientInfo('isResidential', !!checked)}
            />
            <Label htmlFor="isResidential" className="text-sm">
              個人宅配送
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* 最初のパッケージ */}
      {firstPackage && (
        <Card>
          <CardHeader className="bg-purple-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              最初のパッケージ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packageType">梱包材の種類 <span className="text-red-500">*</span></Label>
                <Select
                  value={firstPackage.type}
                  onValueChange={(value) => updatePackage(firstPackage.id, 'type', value)}
                >
                  <SelectTrigger>
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
                <Label htmlFor="packageWeight">重量 (kg) <span className="text-red-500">*</span></Label>
                <Input
                  id="packageWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={firstPackage.weight}
                  onChange={(e) => updatePackage(firstPackage.id, 'weight', e.target.value)}
                  className={formErrors.packageWeight ? 'border-red-500' : ''}
                />
                {formErrors.packageWeight && (
                  <p className="text-red-500 text-xs">{formErrors.packageWeight}</p>
                )}
              </div>
            </div>

            {firstPackage.type === 'YOUR_PACKAGING' && (
              <div className="space-y-2">
                <Label>寸法 (cm) <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageLength" className="text-sm">長さ</Label>
                    <Input
                      id="packageLength"
                      type="number"
                      min="0"
                      value={firstPackage.length || ''}
                      onChange={(e) => updatePackage(firstPackage.id, 'length', e.target.value)}
                      className={formErrors.packageLength ? 'border-red-500' : ''}
                    />
                    {formErrors.packageLength && (
                      <p className="text-red-500 text-xs">{formErrors.packageLength}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageWidth" className="text-sm">幅</Label>
                    <Input
                      id="packageWidth"
                      type="number"
                      min="0"
                      value={firstPackage.width || ''}
                      onChange={(e) => updatePackage(firstPackage.id, 'width', e.target.value)}
                      className={formErrors.packageWidth ? 'border-red-500' : ''}
                    />
                    {formErrors.packageWidth && (
                      <p className="text-red-500 text-xs">{formErrors.packageWidth}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageHeight" className="text-sm">高さ</Label>
                    <Input
                      id="packageHeight"
                      type="number"
                      min="0"
                      value={firstPackage.height || ''}
                      onChange={(e) => updatePackage(firstPackage.id, 'height', e.target.value)}
                      className={formErrors.packageHeight ? 'border-red-500' : ''}
                    />
                    {formErrors.packageHeight && (
                      <p className="text-red-500 text-xs">{formErrors.packageHeight}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="packageDeclaredValue">申告価額 (円)</Label>
              <Input
                id="packageDeclaredValue"
                type="number"
                min="0"
                value={firstPackage.declaredValue || ''}
                onChange={(e) => updatePackage(firstPackage.id, 'declaredValue', e.target.value)}
                placeholder="例: 100000"
              />
              <p className="text-xs text-gray-600">
                この荷物の価値（保険に使用されます）
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 作成ボタン */}
      <div className="flex justify-end">
        <Button 
          onClick={createOpenShipment}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Open Shipment作成中...
            </>
          ) : (
            'Open Shipment作成'
          )}
        </Button>
      </div>
    </div>
  )
} 