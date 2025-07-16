// src/components/QuoteFormComponent.tsx

"use client"

import React, { useCallback } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Plus, X, Loader2 } from "lucide-react"
import { GooglePlaceAutocomplete, ParsedAddress } from "./GooglePlaceAutocomplete"

//【重要】このファイルの型定義もシンプルにする
export interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
}

export interface ExtendedQuoteParams {
  originCountry: string
  originPostalCode: string
  originStateCode: string
  originCityName: string
  originAddressInput: string
  originSelected: boolean
  destinationCountry: string
  destinationPostalCode: string
  destinationStateCode: string
  destinationCityName: string
  destinationAddressInput: string
  destinationSelected: boolean
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  declaredValue: string
}

interface QuoteFormProps {
  quoteParams: ExtendedQuoteParams
  packages: Package[]
  isLoading: boolean
  error: string
  onQuoteParamsChange: (field: keyof ExtendedQuoteParams, value: string | boolean) => void
  onPackageChange: (id: number, field: keyof Package, value: string) => void
  onAddPackage: () => void
  onRemovePackage: (id: number) => void
  onSubmit: (e: React.FormEvent) => void
}

export default function QuoteFormComponent({
  quoteParams,
  packages,
  isLoading,
  error,
  onQuoteParamsChange,
  onPackageChange,
  onAddPackage,
  onRemovePackage,
  onSubmit
}: QuoteFormProps) {

  // 場所が選択された際のコールバック関数
  const handlePlaceSelect = useCallback((type: 'origin' | 'destination', data: ParsedAddress) => {
    console.log(`✅ Received final parsed English data for ${type}:`, data);
    onQuoteParamsChange(`${type}Country`, data.countryCode);
    onQuoteParamsChange(`${type}PostalCode`, data.postalCode);
    onQuoteParamsChange(`${type}StateCode`, data.stateCode);
    onQuoteParamsChange(`${type}CityName`, data.cityName);
    onQuoteParamsChange(`${type}AddressInput`, data.fullAddress); // 表示用
    onQuoteParamsChange(`${type}Selected`, true);
  }, [onQuoteParamsChange]);
  
  // 入力値が変更された際のコールバック関数
  const handleInputChange = useCallback((type: 'origin' | 'destination') => {
      onQuoteParamsChange(`${type}Selected`, false);
  },[onQuoteParamsChange]);


  const getTotalWeight = () => {
    return packages
      .reduce((total, pkg) => total + (Number(pkg.weight) || 0), 0)
      .toFixed(1)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-12">運送料金見積もり</h1>
      <Card>
        <CardContent className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* 上部の見出しと説明文 */}
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800">出荷地と仕向地を入力してください</h2>
              <p className="text-gray-600">住所を入力すると、自動的に候補が表示されます</p>
            </div>

            {/* 出荷地 */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center">
                <span className="text-blue-600 mr-2">📍</span>
                出荷地
              </Label>
              <div className="relative">
                <GooglePlaceAutocomplete
                  value={quoteParams.originAddressInput}
                  onChange={(value) => onQuoteParamsChange('originAddressInput', value)}
                  onPlaceSelect={(data) => handlePlaceSelect('origin', data)}
                  onInputChange={() => handleInputChange('origin')}
                  placeholder="国、郵便番号、または住所を入力"
                  customClassName="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {/* 出荷地の詳細情報表示 */}
              {quoteParams.originSelected && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900">選択された出荷地</div>
                  <div className="text-sm text-blue-800">
                    国: {quoteParams.originCountry} | 
                    郵便番号: {quoteParams.originPostalCode} | 
                    都市: {quoteParams.originCityName}
                    {quoteParams.originStateCode && ` | 州/県: ${quoteParams.originStateCode}`}
                  </div>
                </div>
              )}
            </div>

            {/* 仕向地 */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center">
                <span className="text-green-600 mr-2">📍</span>
                仕向地
              </Label>
              <div className="relative">
                <GooglePlaceAutocomplete
                  value={quoteParams.destinationAddressInput}
                  onChange={(value) => onQuoteParamsChange('destinationAddressInput', value)}
                  onPlaceSelect={(data) => handlePlaceSelect('destination', data)}
                  onInputChange={() => handleInputChange('destination')}
                  placeholder="国、郵便番号、または住所を入力"
                  customClassName="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              {/* 仕向地の詳細情報表示 */}
              {quoteParams.destinationSelected && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-900">選択された仕向地</div>
                  <div className="text-sm text-green-800">
                    国: {quoteParams.destinationCountry} | 
                    郵便番号: {quoteParams.destinationPostalCode} | 
                    都市: {quoteParams.destinationCityName}
                    {quoteParams.destinationStateCode && ` | 州/県: ${quoteParams.destinationStateCode}`}
                  </div>
                </div>
              )}
            </div>

            {/* 個人宅への配送チェックボックス */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="isResidential"
                checked={quoteParams.isResidential}
                onCheckedChange={(checked) => onQuoteParamsChange("isResidential", !!checked)}
              />
              <Label htmlFor="isResidential" className="text-sm font-medium">
                個人宅への配送
              </Label>
            </div>

            {/* お客様の貨物詳細セクション */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">お客様の貨物詳細を教えてください</h2>
              
              {/* より高額な保険を年額使用する */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="higherInsurance"
                  checked={quoteParams.higherInsurance}
                  onCheckedChange={(checked) => onQuoteParamsChange("higherInsurance", !!checked)}
                />
                <Label htmlFor="higherInsurance" className="text-sm font-medium">
                  より高額な保険を年額使用する
                </Label>
              </div>

              {/* 保証金設定 */}
              {quoteParams.higherInsurance && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="declaredValue" className="text-sm font-medium">保証金額 (JPY)</Label>
                  <Input
                    id="declaredValue"
                    type="number"
                    min="0"
                    placeholder="例: 100000"
                    value={quoteParams.declaredValue}
                    onChange={(e) => onQuoteParamsChange("declaredValue", e.target.value)}
                  />
                  <p className="text-xs text-gray-600">
                    商品の価値に応じて保証金額を設定してください。
                  </p>
                </div>
              )}
            </div>

            {/* パッケージ情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">パッケージ情報</h3>
              {packages.map((pkg, index) => (
                <div key={pkg.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">パッケージ {index + 1}</h4>
                    {packages.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemovePackage(pkg.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* 梱包材 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">梱包材</Label>
                      <Select value={pkg.packagingType} onValueChange={(value) => onPackageChange(pkg.id, 'packagingType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="梱包材を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YOUR_PACKAGING">お客様ご用意の梱包材</SelectItem>
                          <SelectItem value="FEDEX_ENVELOPE">FedEx Envelope</SelectItem>
                          <SelectItem value="FEDEX_PAK">FedEx Pak</SelectItem>
                          <SelectItem value="FEDEX_BOX">FedEx Box</SelectItem>
                          <SelectItem value="FEDEX_TUBE">FedEx Tube</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* パッケージ重量 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">パッケージ重量 (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={pkg.weight}
                        onChange={(e) => onPackageChange(pkg.id, 'weight', e.target.value)}
                      />
                    </div>

                    {/* 寸法 (お客様梱包材の場合のみ) */}
                    {pkg.packagingType === 'YOUR_PACKAGING' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">寸法 L×W×H (cm)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="長さ"
                            value={pkg.length}
                            onChange={(e) => onPackageChange(pkg.id, 'length', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="幅"
                            value={pkg.width}
                            onChange={(e) => onPackageChange(pkg.id, 'width', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="高さ"
                            value={pkg.height}
                            onChange={(e) => onPackageChange(pkg.id, 'height', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* 別のパッケージを追加 */}
              <Button
                type="button"
                variant="outline"
                onClick={onAddPackage}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                別のパッケージを追加
              </Button>
              
              {/* 総重量 */}
              <div className="text-center">
                <span className="text-lg font-semibold">総重量: {getTotalWeight()} kg</span>
              </div>
            </div>

            {/* 希望出荷日 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">希望出荷日はいつですか？</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">出荷日</Label>
                <Input
                  type="date"
                  value={quoteParams.shipDate}
                  onChange={(e) => onQuoteParamsChange("shipDate", e.target.value)}
                />
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {/* 料金を表示ボタン */}
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full h-12 text-lg text-white ${
                isLoading 
                  ? 'bg-orange-300 cursor-not-allowed' 
                  : 'bg-orange-400 hover:bg-orange-500'
              }`}
            >
              見積もりを表示
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
