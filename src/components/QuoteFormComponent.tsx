// src/components/QuoteFormComponent.tsx

"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Plus, X, Loader2 } from "lucide-react"
import { GooglePlaceAutocomplete, ParsedAddress } from "./GooglePlaceAutocomplete"
import { getPrefectureFromPostalCode, usStates, canadianProvinces, japanesePrefectures } from "@/lib/data/locations"

// 郵便番号不要国の定義
const POSTAL_CODE_NOT_REQUIRED_COUNTRIES = ['HK', 'AE', 'SG'];

//【重要】このファイルの型定義もシンプルにする
export interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
  declaredValue: string
}

export interface ExtendedQuoteParams {
  originCountry: string
  originPostalCode: string
  originStateCode: string
  originCityName: string
  originAddressInput: string
  originStreet: string
  originSelected: boolean
  originPostalCodeMissing: boolean
  originCityNameMissing: boolean
  originStateCodeMissing: boolean
  destinationCountry: string
  destinationPostalCode: string
  destinationStateCode: string
  destinationCityName: string
  destinationAddressInput: string
  destinationStreet: string
  destinationSelected: boolean
  destinationPostalCodeMissing: boolean
  destinationCityNameMissing: boolean
  destinationStateCodeMissing: boolean
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  isPhoenixShipment: boolean
  phoenixMode: 'none' | 'from' | 'to'
}

interface QuoteFormProps {
  quoteParams: ExtendedQuoteParams
  packages: Package[]
  isLoading: boolean
  error: string
  packageErrors: { [key: number]: string | null }
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
  packageErrors,
  onQuoteParamsChange,
  onPackageChange,
  onAddPackage,
  onRemovePackage,
  onSubmit
}: QuoteFormProps) {

  // エラーがあるかどうかをチェック
  const hasValidationErrors = Object.values(packageErrors).some(error => error !== null);
  
  // 🔍 State変更監視用useEffect
  useEffect(() => {
    console.log(`🎭 QuoteFormComponent再レンダリング:`);
    console.log(`   originStateCode: "${quoteParams.originStateCode}"`);
    console.log(`   destinationStateCode: "${quoteParams.destinationStateCode}"`);
  }, [quoteParams.originStateCode, quoteParams.destinationStateCode]);

  // 場所が選択された際のコールバック関数
  const handlePlaceSelect = useCallback((type: 'origin' | 'destination', data: ParsedAddress) => {
    onQuoteParamsChange(`${type}Country`, data.countryCode);
    onQuoteParamsChange(`${type}PostalCode`, data.postalCode);
    
    // 🇯🇵 日本の場合は郵便番号から県を自動判定
    let stateCode = data.stateCode;
    if (data.countryCode === 'JP' && data.postalCode) {
      const prefectureFromPostal = getPrefectureFromPostalCode(data.postalCode);
      if (prefectureFromPostal) {
        stateCode = prefectureFromPostal;
        console.log(`📮 郵便番号から県を自動判定: ${data.postalCode} → ${stateCode}`);
        
        // 判定した県コードがjapanesePrefecturesに存在するか確認
        const matchingPrefecture = japanesePrefectures.find(p => p.code === stateCode);
        if (matchingPrefecture) {
          console.log(`✅ 県選択成功: ${stateCode} (${matchingPrefecture.name})`);
        } else {
          console.log(`⚠️ 判定された県コード "${stateCode}" がオプションに存在しません`);
          stateCode = ''; // 不明な場合は空にする
        }
      } else {
        console.log(`⚠️ 郵便番号 "${data.postalCode}" から県を判定できませんでした`);
        stateCode = ''; // 判定できない場合は空にする
      }
    }
    
    onQuoteParamsChange(`${type}StateCode`, stateCode);
    onQuoteParamsChange(`${type}CityName`, data.cityName);
    onQuoteParamsChange(`${type}Street`, data.street); // 英語の番地・通り名
    onQuoteParamsChange(`${type}AddressInput`, data.fullAddress); // 表示用の日本語住所
    onQuoteParamsChange(`${type}Selected`, true);
    onQuoteParamsChange(`${type}PostalCodeMissing`, !!data.postalCodeMissing); // 郵便番号不足フラグ
  }, [onQuoteParamsChange]);
  
  // 入力値が変更された際のコールバック関数
  const handleInputChange = useCallback((type: 'origin' | 'destination') => {
    console.log(`📝 手動入力開始: ${type} - フェニックスモードをリセット`)
    
    // 選択状態をリセット
    onQuoteParamsChange(`${type}Selected`, false);
    
    // フェニックスモードのリセット処理
    if (quoteParams.phoenixMode !== 'none') {
      console.log(`🔄 フェニックスモード "${quoteParams.phoenixMode}" → "none" にリセット`)
      
      // フェニックスモードをリセット
      onQuoteParamsChange('phoenixMode', 'none')
      onQuoteParamsChange('isPhoenixShipment', false)
      
      // 該当する住所情報をクリア
      onQuoteParamsChange(`${type}Country`, '')
      onQuoteParamsChange(`${type}PostalCode`, '')
      onQuoteParamsChange(`${type}StateCode`, '')
      onQuoteParamsChange(`${type}CityName`, '')
      onQuoteParamsChange(`${type}Street`, '')
      onQuoteParamsChange(`${type}PostalCodeMissing`, false)
      onQuoteParamsChange(`${type}CityNameMissing`, false)
      onQuoteParamsChange(`${type}StateCodeMissing`, false)
      
      console.log(`✅ ${type}の住所情報をクリア完了`)
    }
  }, [onQuoteParamsChange, quoteParams.phoenixMode])

  // フェニックス住所を取得してフォームに自動入力する関数
  const handlePhoenixAddressClick = useCallback(async (type: 'origin' | 'destination') => {
    try {
      console.log(`🏢 フェニックス住所取得開始: ${type}`)
      
      const response = await fetch('/api/company-info')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '自社住所情報の取得に失敗しました')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '自社住所情報の取得に失敗しました')
      }
      
      const companyInfo = data.data
      console.log('✅ フェニックス住所取得成功:', companyInfo)
      
      // フェニックス住所をフォームに自動入力
      onQuoteParamsChange(`${type}Country`, 'JP')
      onQuoteParamsChange(`${type}PostalCode`, companyInfo.postalCode)
      onQuoteParamsChange(`${type}CityName`, companyInfo.address1) // 都道府県・市区町村
      onQuoteParamsChange(`${type}Street`, companyInfo.address2 || '') // 番地・建物名
      
      // 日本の場合、郵便番号から県を自動判定
      let stateCode = ''
      if (companyInfo.postalCode) {
        const prefectureFromPostal = getPrefectureFromPostalCode(companyInfo.postalCode)
        if (prefectureFromPostal) {
          stateCode = prefectureFromPostal
          console.log(`📮 フェニックス住所: 郵便番号から県を自動判定: ${companyInfo.postalCode} → ${stateCode}`)
        }
      }
      onQuoteParamsChange(`${type}StateCode`, stateCode)
      
      // 表示用の住所文字列を作成
      const displayAddress = `${companyInfo.postalCode} ${companyInfo.address1}${companyInfo.address2 ? ' ' + companyInfo.address2 : ''}`
      onQuoteParamsChange(`${type}AddressInput`, displayAddress)
      
      // 選択済みフラグを設定
      onQuoteParamsChange(`${type}Selected`, true)
      onQuoteParamsChange(`${type}PostalCodeMissing`, false)
      onQuoteParamsChange(`${type}CityNameMissing`, false)
      onQuoteParamsChange(`${type}StateCodeMissing`, false)
      
      // フェニックス送受取フラグとモードを設定
      onQuoteParamsChange('isPhoenixShipment', true)
      onQuoteParamsChange('phoenixMode', type === 'origin' ? 'from' : 'to')
      
      console.log(`🎯 ${type}にフェニックス住所を設定完了（モード: ${type === 'origin' ? 'from' : 'to'}）`)
      
    } catch (error) {
      console.error('❌ フェニックス住所取得エラー:', error)
      alert(`フェニックス住所の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }, [onQuoteParamsChange])


  // 州/県の表示名を取得する関数
  const getStateName = (countryCode: string, stateCode: string): string => {
    if (countryCode === 'JP' && stateCode) {
      const prefecture = japanesePrefectures.find(p => p.code === stateCode);
      return prefecture ? prefecture.name : stateCode;
    }
    return stateCode; // アメリカ・カナダの場合はそのまま
  };

  const getTotalWeight = () => {
    return packages
      .reduce((total, pkg) => total + (Number(pkg.weight) || 0), 0)
      .toFixed(1)
  }

  // Get state options based on country
  const getOriginStateOptions = () => {
    if (quoteParams.originCountry === 'US') return usStates
    if (quoteParams.originCountry === 'CA') return canadianProvinces
    if (quoteParams.originCountry === 'JP') return japanesePrefectures
    return []
  }

  const getDestinationStateOptions = () => {
    if (quoteParams.destinationCountry === 'US') return usStates
    if (quoteParams.destinationCountry === 'CA') return canadianProvinces
    if (quoteParams.destinationCountry === 'JP') return japanesePrefectures
    return []
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
              <div className="flex items-center gap-4">
                <Label className="text-base font-medium flex items-center">
                  <span className="text-blue-600 mr-2">📍</span>
                  出荷地
                </Label>
                
                {/* フェニックス住所自動入力ボタン（出荷地が空の場合のみ表示） */}
                {!quoteParams.originAddressInput && quoteParams.phoenixMode !== 'to' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhoenixAddressClick('origin')}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                  >
                    🏢 フェニックスから送る
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <GooglePlaceAutocomplete
                  value={quoteParams.originAddressInput}
                  onChange={(value) => {
                    console.log(`📝 QuoteForm: Origin address input changing to: "${value}"`);
                    onQuoteParamsChange('originAddressInput', value);
                  }}
                  onPlaceSelect={(data) => handlePlaceSelect('origin', data)}
                  onInputChange={() => handleInputChange('origin')}
                  placeholder="国、郵便番号、または住所を入力"
                />
              </div>
              
              {/* 出荷地の詳細情報表示 */}
              {quoteParams.originSelected && (
                <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
                  <div className="text-sm font-medium text-blue-900">出荷地の詳細情報</div>
                  
                  {/* 国（表示のみ） */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-blue-800">国</Label>
                      <div className="text-sm font-medium text-blue-900">{quoteParams.originCountry}</div>
                    </div>
                  </div>
                  
                  {/* 郵便番号 */}
                  <div>
                    <Label htmlFor="originPostalCodeDetail" className="text-xs text-blue-800 flex items-center">
                      郵便番号
                      {!POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originPostalCode && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && (
                        <span className="text-gray-400 ml-1">(任意)</span>
                      )}
                    </Label>
                    <Input
                      id="originPostalCodeDetail"
                      type="text"
                      value={quoteParams.originPostalCode}
                      onChange={(e) => onQuoteParamsChange('originPostalCode', e.target.value)}
                      disabled={!!quoteParams.originPostalCode}
                      placeholder="例: 442-0061, 10001"
                      className={`mt-1 ${!!quoteParams.originPostalCode ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  
                  {/* 市区町村 */}
                  <div>
                    <Label htmlFor="originCityNameDetail" className="text-xs text-blue-800 flex items-center">
                      市区町村
                      {!quoteParams.originCityName && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && (
                        <span className="text-orange-600 ml-1 text-xs">(郵便番号不要国につき必須)</span>
                      )}
                    </Label>
                    <Input
                      id="originCityNameDetail"
                      type="text"
                      value={quoteParams.originCityName}
                      onChange={(e) => onQuoteParamsChange('originCityName', e.target.value)}
                      disabled={!!quoteParams.originCityName}
                      placeholder="例: Toyokawa, Shanghai, New York"
                      className={`mt-1 ${!!quoteParams.originCityName ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  
                  {/* 州・県（US・CAの場合のみ） */}
                  {(quoteParams.originCountry === 'US' || quoteParams.originCountry === 'CA') && (
                    <div>
                      <Label htmlFor="originStateCodeDetail" className="text-xs text-blue-800 flex items-center">
                        州・県
                        {!quoteParams.originStateCode && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                        <span className="text-purple-600 ml-2 text-xs">
                          (現在値: "{quoteParams.originStateCode}")
                        </span>
                      </Label>
                      <Select 
                        value={quoteParams.originStateCode} 
                        onValueChange={(value) => {
                          console.log(`🔄 出荷地州・県が手動変更: "${quoteParams.originStateCode}" → "${value}"`);
                          onQuoteParamsChange('originStateCode', value);
                        }}
                      >
                        <SelectTrigger className={`mt-1 bg-white`}>
                          <SelectValue placeholder="州・県を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {getOriginStateOptions().map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* 仕向地 */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label className="text-base font-medium flex items-center">
                  <span className="text-green-600 mr-2">📍</span>
                  仕向地
                </Label>
                
                {/* フェニックス住所自動入力ボタン（仕向地が空の場合のみ表示） */}
                {!quoteParams.destinationAddressInput && quoteParams.phoenixMode !== 'from' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhoenixAddressClick('destination')}
                    className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                  >
                    🏢 フェニックスへ送る
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <GooglePlaceAutocomplete
                  value={quoteParams.destinationAddressInput}
                  onChange={(value) => {
                    console.log(`📝 QuoteForm: Destination address input changing to: "${value}"`);
                    onQuoteParamsChange('destinationAddressInput', value);
                  }}
                  onPlaceSelect={(data) => handlePlaceSelect('destination', data)}
                  onInputChange={() => handleInputChange('destination')}
                  placeholder="国、郵便番号、または住所を入力"
                />
              </div>
              
              {/* 仕向地の詳細情報表示 */}
              {quoteParams.destinationSelected && (
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
                  <div className="text-sm font-medium text-green-900">仕向地の詳細情報</div>
                  
                  {/* 国（表示のみ） */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-green-800">国</Label>
                      <div className="text-sm font-medium text-green-900">{quoteParams.destinationCountry}</div>
                    </div>
                  </div>
                  
                  {/* 郵便番号 */}
                  <div>
                    <Label htmlFor="destinationPostalCodeDetail" className="text-xs text-green-800 flex items-center">
                      郵便番号
                      {!POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationPostalCode && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && (
                        <span className="text-gray-400 ml-1">(任意)</span>
                      )}
                    </Label>
                    <Input
                      id="destinationPostalCodeDetail"
                      type="text"
                      value={quoteParams.destinationPostalCode}
                      onChange={(e) => onQuoteParamsChange('destinationPostalCode', e.target.value)}
                      disabled={!!quoteParams.destinationPostalCode}
                      placeholder="例: 442-0061, 10001"
                      className={`mt-1 ${!!quoteParams.destinationPostalCode ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  
                  {/* 市区町村 */}
                  <div>
                    <Label htmlFor="destinationCityNameDetail" className="text-xs text-green-800 flex items-center">
                      市区町村
                      {!quoteParams.destinationCityName && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && (
                        <span className="text-orange-600 ml-1 text-xs">(郵便番号不要国につき必須)</span>
                      )}
                    </Label>
                    <Input
                      id="destinationCityNameDetail"
                      type="text"
                      value={quoteParams.destinationCityName}
                      onChange={(e) => onQuoteParamsChange('destinationCityName', e.target.value)}
                      disabled={!!quoteParams.destinationCityName}
                      placeholder="例: Toyokawa, Shanghai, New York"
                      className={`mt-1 ${!!quoteParams.destinationCityName ? 'bg-gray-100' : 'bg-white'}`}
                    />
                  </div>
                  
                  {/* 州・県（US・CAの場合のみ） */}
                  {(quoteParams.destinationCountry === 'US' || quoteParams.destinationCountry === 'CA') && (
                    <div>
                      <Label htmlFor="destinationStateCodeDetail" className="text-xs text-green-800 flex items-center">
                        州・県
                        {!quoteParams.destinationStateCode && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                        <span className="text-purple-600 ml-2 text-xs">
                          (現在値: "{quoteParams.destinationStateCode}")
                        </span>
                      </Label>
                      <Select 
                        value={quoteParams.destinationStateCode} 
                        onValueChange={(value) => {
                          console.log(`🔄 仕向地州・県が手動変更: "${quoteParams.destinationStateCode}" → "${value}"`);
                          onQuoteParamsChange('destinationStateCode', value);
                        }}
                      >
                        <SelectTrigger className={`mt-1 bg-white`}>
                          <SelectValue placeholder="州・県を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {getDestinationStateOptions().map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                    {/* 梱包材（最初の荷物のみ選択可能） */}
                    {index === 0 ? (
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
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">梱包材</Label>
                        <div className="p-3 bg-gray-50 rounded-md border">
                          <span className="text-sm">
                            {pkg.packagingType === 'YOUR_PACKAGING' && 'お客様ご用意の梱包材'}
                            {pkg.packagingType === 'FEDEX_ENVELOPE' && 'FedEx Envelope'}
                            {pkg.packagingType === 'FEDEX_PAK' && 'FedEx Pak'}
                            {pkg.packagingType === 'FEDEX_BOX' && 'FedEx Box'}
                            {pkg.packagingType === 'FEDEX_TUBE' && 'FedEx Tube'}
                          </span>
                        </div>
                      </div>
                    )}

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

                    {/* 申告価額（チェックボックスがONの場合のみ表示） */}
                    {quoteParams.higherInsurance && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">申告価額（円）</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="例: 100000"
                          value={pkg.declaredValue}
                          onChange={(e) => onPackageChange(pkg.id, 'declaredValue', e.target.value)}
                          className={packageErrors[pkg.id] ? "border-red-500" : ""}
                        />
                        {packageErrors[pkg.id] && (
                          <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">
                            <strong>⚠️ 申告価額上限エラー:</strong><br />
                            {packageErrors[pkg.id]}
                          </div>
                        )}
                        <p className="text-xs text-gray-600">
                          この荷物の価値を入力してください（保険に使用されます）
                        </p>
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
              disabled={isLoading || hasValidationErrors}
              className={`w-full h-12 text-lg text-white ${
                isLoading || hasValidationErrors
                  ? 'bg-orange-300 cursor-not-allowed' 
                  : 'bg-orange-400 hover:bg-orange-500'
              }`}
            >
              {hasValidationErrors ? '入力エラーを修正してください' : '見積もりを表示'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
