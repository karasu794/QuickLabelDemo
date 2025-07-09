"use client"

import React, { useState, useCallback } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Plus, X, Loader2, MapPin, CheckCircle } from "lucide-react"
import { GooglePlaceAutocomplete, parseGooglePlaceResult } from "./GooglePlaceAutocomplete"

export interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
}

export interface QuoteParams {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  declaredValue: string // 保険の申告金額を追加
}

// 拡張された見積もりパラメータの型
export interface ExtendedQuoteParams extends QuoteParams {
  originStateCode: string
  originCityName: string
  destinationStateCode: string
  destinationCityName: string
  // 新しいフィールド
  originAddressInput: string
  destinationAddressInput: string
  originSelected: boolean
  destinationSelected: boolean
}

interface StateOption {
  code: string
  name: string
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
  originStateOptions?: StateOption[]
  destinationStateOptions?: StateOption[]
  postalCodeNotRequiredCountries?: string[]
}

// 日本語の都市名・地名をローマ字に変換するヘルパー関数
function convertJapaneseToRomaji(text: string): string {
  const conversionMap: { [key: string]: string } = {
    // 都道府県
    '北海道': 'Hokkaido',
    '青森県': 'Aomori',
    '岩手県': 'Iwate',
    '宮城県': 'Miyagi',
    '秋田県': 'Akita',
    '山形県': 'Yamagata',
    '福島県': 'Fukushima',
    '茨城県': 'Ibaraki',
    '栃木県': 'Tochigi',
    '群馬県': 'Gunma',
    '埼玉県': 'Saitama',
    '千葉県': 'Chiba',
    '東京都': 'Tokyo',
    '神奈川県': 'Kanagawa',
    '新潟県': 'Niigata',
    '富山県': 'Toyama',
    '石川県': 'Ishikawa',
    '福井県': 'Fukui',
    '山梨県': 'Yamanashi',
    '長野県': 'Nagano',
    '岐阜県': 'Gifu',
    '静岡県': 'Shizuoka',
    '愛知県': 'Aichi',
    '三重県': 'Mie',
    '滋賀県': 'Shiga',
    '京都府': 'Kyoto',
    '大阪府': 'Osaka',
    '兵庫県': 'Hyogo',
    '奈良県': 'Nara',
    '和歌山県': 'Wakayama',
    '鳥取県': 'Tottori',
    '島根県': 'Shimane',
    '岡山県': 'Okayama',
    '広島県': 'Hiroshima',
    '山口県': 'Yamaguchi',
    '徳島県': 'Tokushima',
    '香川県': 'Kagawa',
    '愛媛県': 'Ehime',
    '高知県': 'Kochi',
    '福岡県': 'Fukuoka',
    '佐賀県': 'Saga',
    '長崎県': 'Nagasaki',
    '熊本県': 'Kumamoto',
    '大分県': 'Oita',
    '宮崎県': 'Miyazaki',
    '鹿児島県': 'Kagoshima',
    '沖縄県': 'Okinawa',
    
    // 主要都市
    '札幌市': 'Sapporo',
    '仙台市': 'Sendai',
    '横浜市': 'Yokohama',
    '川崎市': 'Kawasaki',
    '名古屋市': 'Nagoya',
    '京都市': 'Kyoto',
    '大阪市': 'Osaka',
    '神戸市': 'Kobe',
    '広島市': 'Hiroshima',
    '福岡市': 'Fukuoka',
    
    // 区・市
    '千代田区': 'Chiyoda-ku',
    '中央区': 'Chuo-ku',
    '港区': 'Minato-ku',
    '新宿区': 'Shinjuku-ku',
    '文京区': 'Bunkyo-ku',
    '台東区': 'Taito-ku',
    '墨田区': 'Sumida-ku',
    '江東区': 'Koto-ku',
    '品川区': 'Shinagawa-ku',
    '目黒区': 'Meguro-ku',
    '大田区': 'Ota-ku',
    '世田谷区': 'Setagaya-ku',
    '渋谷区': 'Shibuya-ku',
    '中野区': 'Nakano-ku',
    '杉並区': 'Suginami-ku',
    '豊島区': 'Toshima-ku',
    '北区': 'Kita-ku',
    '荒川区': 'Arakawa-ku',
    '板橋区': 'Itabashi-ku',
    '練馬区': 'Nerima-ku',
    '足立区': 'Adachi-ku',
    '葛飾区': 'Katsushika-ku',
    '江戸川区': 'Edogawa-ku'
  };

  // 完全一致で変換を試行
  for (const [japanese, romaji] of Object.entries(conversionMap)) {
    if (text.includes(japanese)) {
      text = text.replace(japanese, romaji);
    }
  }

  return text;
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
  onSubmit,
  originStateOptions = [],
  destinationStateOptions = [],
  postalCodeNotRequiredCountries = []
}: QuoteFormProps) {

  // 住所選択時の処理
  const handleOriginPlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    const parsed = parseGooglePlaceResult(place);
    console.log('Origin place selected:', parsed);

    // 国コードを設定
    if (parsed.components.country) {
      onQuoteParamsChange('originCountry', parsed.components.country);
    }

    // 郵便番号を設定
    if (parsed.components.postal_code) {
      onQuoteParamsChange('originPostalCode', parsed.components.postal_code);
    }

    // 州・県を設定（US、CAの場合）
    if (parsed.components.administrative_area_level_1) {
      onQuoteParamsChange('originStateCode', parsed.components.administrative_area_level_1);
    }

    // 都市名を設定（ローマ字変換）
    let cityName = parsed.components.locality || parsed.components.sublocality_level_1 || '';
    if (cityName && parsed.components.country === 'JP') {
      cityName = convertJapaneseToRomaji(cityName);
    }
    if (cityName) {
      onQuoteParamsChange('originCityName', cityName);
    }

    // 住所選択完了フラグを設定
    onQuoteParamsChange('originSelected', true);
  }, [onQuoteParamsChange]);

  const handleDestinationPlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    const parsed = parseGooglePlaceResult(place);
    console.log('Destination place selected:', parsed);

    // 国コードを設定
    if (parsed.components.country) {
      onQuoteParamsChange('destinationCountry', parsed.components.country);
    }

    // 郵便番号を設定
    if (parsed.components.postal_code) {
      onQuoteParamsChange('destinationPostalCode', parsed.components.postal_code);
    }

    // 州・県を設定（US、CAの場合）
    if (parsed.components.administrative_area_level_1) {
      onQuoteParamsChange('destinationStateCode', parsed.components.administrative_area_level_1);
    }

    // 都市名を設定（ローマ字変換）
    let cityName = parsed.components.locality || parsed.components.sublocality_level_1 || '';
    if (cityName && parsed.components.country === 'JP') {
      cityName = convertJapaneseToRomaji(cityName);
    }
    if (cityName) {
      onQuoteParamsChange('destinationCityName', cityName);
    }

    // 住所選択完了フラグを設定
    onQuoteParamsChange('destinationSelected', true);
  }, [onQuoteParamsChange]);

  // 出荷地入力値変更時の処理（選択状態をリセット）
  const handleOriginInputChange = useCallback(() => {
    console.log('Origin input changed, resetting selection');
    onQuoteParamsChange('originSelected', false);
    // 詳細情報もリセット
    onQuoteParamsChange('originCountry', 'JP');
    onQuoteParamsChange('originPostalCode', '');
    onQuoteParamsChange('originStateCode', '');
    onQuoteParamsChange('originCityName', '');
  }, [onQuoteParamsChange]);

  // 仕向地入力値変更時の処理（選択状態をリセット）
  const handleDestinationInputChange = useCallback(() => {
    console.log('Destination input changed, resetting selection');
    onQuoteParamsChange('destinationSelected', false);
    // 詳細情報もリセット
    onQuoteParamsChange('destinationCountry', 'US');
    onQuoteParamsChange('destinationPostalCode', '');
    onQuoteParamsChange('destinationStateCode', '');
    onQuoteParamsChange('destinationCityName', '');
  }, [onQuoteParamsChange]);

  const getTotalWeight = () => {
    return packages
      .reduce((total, pkg) => {
        const weight = Number.parseFloat(pkg.weight) || 0
        return total + weight
      }, 0)
      .toFixed(1)
  }

  // 国別の表示ロジック
  const shouldShowOriginPostalCode = quoteParams.originSelected && !postalCodeNotRequiredCountries.includes(quoteParams.originCountry)
  const shouldShowOriginState = quoteParams.originSelected && (quoteParams.originCountry === 'US' || quoteParams.originCountry === 'CA')
  const shouldShowOriginCity = quoteParams.originSelected

  const shouldShowDestinationPostalCode = quoteParams.destinationSelected && !postalCodeNotRequiredCountries.includes(quoteParams.destinationCountry)
  const shouldShowDestinationState = quoteParams.destinationSelected && (quoteParams.destinationCountry === 'US' || quoteParams.destinationCountry === 'CA')
  const shouldShowDestinationCity = quoteParams.destinationSelected

  // 国名の表示用マッピング（包括的な日本語対応）
  const getCountryName = (code: string) => {
    const countryNames: { [key: string]: string } = {
      // アジア・太平洋
      'JP': '日本',
      'CN': '中国',
      'KR': '韓国',
      'HK': '香港',
      'TW': '台湾',
      'SG': 'シンガポール',
      'MY': 'マレーシア',
      'TH': 'タイ',
      'VN': 'ベトナム',
      'PH': 'フィリピン',
      'ID': 'インドネシア',
      'IN': 'インド',
      'AU': 'オーストラリア',
      'NZ': 'ニュージーランド',
      'BD': 'バングラデシュ',
      'LK': 'スリランカ',
      'MM': 'ミャンマー',
      'LA': 'ラオス',
      'KH': 'カンボジア',
      'BN': 'ブルネイ',
      'MN': 'モンゴル',
      
      // 北米
      'US': 'アメリカ',
      'CA': 'カナダ',
      'MX': 'メキシコ',
      
      // 南米
      'BR': 'ブラジル',
      'AR': 'アルゼンチン',
      'CL': 'チリ',
      'PE': 'ペルー',
      'CO': 'コロンビア',
      'VE': 'ベネズエラ',
      'EC': 'エクアドル',
      'UY': 'ウルグアイ',
      'PY': 'パラグアイ',
      'BO': 'ボリビア',
      
      // ヨーロッパ
      'GB': 'イギリス',
      'DE': 'ドイツ',
      'FR': 'フランス',
      'IT': 'イタリア',
      'ES': 'スペイン',
      'NL': 'オランダ',
      'BE': 'ベルギー',
      'CH': 'スイス',
      'AT': 'オーストリア',
      'SE': 'スウェーデン',
      'NO': 'ノルウェー',
      'DK': 'デンマーク',
      'FI': 'フィンランド',
      'IE': 'アイルランド',
      'PT': 'ポルトガル',
      'GR': 'ギリシャ',
      'PL': 'ポーランド',
      'CZ': 'チェコ',
      'HU': 'ハンガリー',
      'RO': 'ルーマニア',
      'BG': 'ブルガリア',
      'HR': 'クロアチア',
      'SI': 'スロベニア',
      'SK': 'スロバキア',
      'EE': 'エストニア',
      'LV': 'ラトビア',
      'LT': 'リトアニア',
      'LU': 'ルクセンブルク',
      'MT': 'マルタ',
      'CY': 'キプロス',
      'IS': 'アイスランド',
      'RU': 'ロシア',
      'UA': 'ウクライナ',
      'BY': 'ベラルーシ',
      'MD': 'モルドバ',
      
      // 中東・アフリカ
      'AE': 'アラブ首長国連邦',
      'SA': 'サウジアラビア',
      'QA': 'カタール',
      'KW': 'クウェート',
      'BH': 'バーレーン',
      'OM': 'オマーン',
      'JO': 'ヨルダン',
      'LB': 'レバノン',
      'IL': 'イスラエル',
      'TR': 'トルコ',
      'IR': 'イラン',
      'IQ': 'イラク',
      'SY': 'シリア',
      'YE': 'イエメン',
      'EG': 'エジプト',
      'ZA': '南アフリカ',
      'NG': 'ナイジェリア',
      'KE': 'ケニア',
      'ET': 'エチオピア',
      'GH': 'ガーナ',
      'MA': 'モロッコ',
      'TN': 'チュニジア',
      'DZ': 'アルジェリア',
      'LY': 'リビア',
      'SD': 'スーダン',
      
      // オセアニア
      'FJ': 'フィジー',
      'PG': 'パプアニューギニア',
      'NC': 'ニューカレドニア',
      'PF': 'フランス領ポリネシア',
      
      // カリブ海・中米
      'JM': 'ジャマイカ',
      'CU': 'キューバ',
      'DO': 'ドミニカ共和国',
      'HT': 'ハイチ',
      'TT': 'トリニダード・トバゴ',
      'BB': 'バルバドス',
      'BS': 'バハマ',
      'BZ': 'ベリーズ',
      'GT': 'グアテマラ',
      'HN': 'ホンジュラス',
      'SV': 'エルサルバドル',
      'NI': 'ニカラグア',
      'CR': 'コスタリカ',
      'PA': 'パナマ'
    };
    
    return countryNames[code] || `${code}（国名未登録）`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Title */}
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">フェデックス運送料金の計算</h1>

        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            <form onSubmit={onSubmit}>
              {/* Address Selection Section */}
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">出荷地と仕向地を入力してください</h2>
                  <p className="text-gray-600">住所を入力すると、自動的に候補が表示されます</p>
                </div>

                {/* Origin Address Input */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-medium text-gray-900">出荷地</span>
                    {quoteParams.originSelected && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  
                  <GooglePlaceAutocomplete
                    value={quoteParams.originAddressInput}
                    onChange={(value) => onQuoteParamsChange('originAddressInput', value)}
                    onPlaceSelect={handleOriginPlaceSelect}
                    onInputChange={handleOriginInputChange}
                    placeholder="国、郵便番号、または住所を入力"
                    className="border-2 border-blue-200 focus:border-blue-500"
                  />

                  {/* 出荷地の詳細情報（住所選択後に表示） */}
                  {quoteParams.originSelected && (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <h3 className="font-medium text-blue-900">出荷地詳細</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-blue-800">国</Label>
                          <div className="mt-1 text-blue-900">{getCountryName(quoteParams.originCountry)}</div>
                        </div>
                        
                        {shouldShowOriginPostalCode && (
                          <div>
                            <Label className="text-sm font-medium text-blue-800">郵便番号</Label>
                            <Input
                              value={quoteParams.originPostalCode}
                              onChange={(e) => onQuoteParamsChange('originPostalCode', e.target.value)}
                              className="mt-1"
                              required
                            />
                          </div>
                        )}

                        {shouldShowOriginState && (
                          <div>
                            <Label className="text-sm font-medium text-blue-800">州・県 <span className="text-red-500">*</span></Label>
                            <Select 
                              value={quoteParams.originStateCode} 
                              onValueChange={(value: string) => onQuoteParamsChange("originStateCode", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="州・県を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {originStateOptions.map(state => (
                                  <SelectItem key={state.code} value={state.code}>
                                    {state.name} ({state.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {shouldShowOriginCity && (
                          <div>
                            <Label className="text-sm font-medium text-blue-800">都市名</Label>
                            <Input
                              value={quoteParams.originCityName}
                              onChange={(e) => onQuoteParamsChange('originCityName', e.target.value)}
                              className="mt-1"
                              required={postalCodeNotRequiredCountries.includes(quoteParams.originCountry)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Destination Address Input */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-medium text-gray-900">仕向地</span>
                    {quoteParams.destinationSelected && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  
                  <GooglePlaceAutocomplete
                    value={quoteParams.destinationAddressInput}
                    onChange={(value) => onQuoteParamsChange('destinationAddressInput', value)}
                    onPlaceSelect={handleDestinationPlaceSelect}
                    onInputChange={handleDestinationInputChange}
                    placeholder="国、郵便番号、または住所を入力"
                    className="border-2 border-green-200 focus:border-green-500"
                  />

                  {/* 仕向地の詳細情報（住所選択後に表示） */}
                  {quoteParams.destinationSelected && (
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <h3 className="font-medium text-green-900">仕向地詳細</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-green-800">国</Label>
                          <div className="mt-1 text-green-900">{getCountryName(quoteParams.destinationCountry)}</div>
                        </div>
                        
                        {shouldShowDestinationPostalCode && (
                          <div>
                            <Label className="text-sm font-medium text-green-800">郵便番号</Label>
                            <Input
                              value={quoteParams.destinationPostalCode}
                              onChange={(e) => onQuoteParamsChange('destinationPostalCode', e.target.value)}
                              className="mt-1"
                              required
                            />
                          </div>
                        )}

                        {shouldShowDestinationState && (
                          <div>
                            <Label className="text-sm font-medium text-green-800">州・県 <span className="text-red-500">*</span></Label>
                            <Select 
                              value={quoteParams.destinationStateCode} 
                              onValueChange={(value: string) => onQuoteParamsChange("destinationStateCode", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="州・県を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {destinationStateOptions.map(state => (
                                  <SelectItem key={state.code} value={state.code}>
                                    {state.name} ({state.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {shouldShowDestinationCity && (
                          <div>
                            <Label className="text-sm font-medium text-green-800">都市名</Label>
                            <Input
                              value={quoteParams.destinationCityName}
                              onChange={(e) => onQuoteParamsChange('destinationCityName', e.target.value)}
                              className="mt-1"
                              required={postalCodeNotRequiredCountries.includes(quoteParams.destinationCountry)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="residential"
                    checked={quoteParams.isResidential}
                    onCheckedChange={(checked: boolean) => onQuoteParamsChange("isResidential", checked)}
                  />
                  <Label htmlFor="residential" className="text-base">
                    個人宅住所への出荷
                  </Label>
                </div>
              </div>

              {/* Shipment Details Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">お客様の貨物詳細を教えてください</h2>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={quoteParams.higherInsurance}
                      onCheckedChange={(checked: boolean) => onQuoteParamsChange("higherInsurance", checked)}
                    />
                    <Label htmlFor="insurance" className="text-base">
                      より高額な賠償責任補償を利用する
                    </Label>
                  </div>

                  {/* 保険の申告金額フィールド（チェックボックスがONの場合のみ表示） */}
                  {quoteParams.higherInsurance && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="declared-value" className="text-base font-medium">
                        保険の申告金額 (円)
                      </Label>
                      <Input
                        id="declared-value"
                        type="number"
                        step="1000"
                        min="0"
                        placeholder="100000"
                        value={quoteParams.declaredValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQuoteParamsChange("declaredValue", e.target.value)}
                        className="h-12 text-base max-w-xs"
                      />
                      <p className="text-sm text-gray-600">
                        より高額な賠償責任補償を適用する場合の、荷物の申告価値を入力してください。
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Packages Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">パッケージ情報</h2>

                <div className="space-y-4">
                  {packages.map((pkg, index) => (
                    <Card key={pkg.id} className="border-2 border-gray-200">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">パッケージ {index + 1}</CardTitle>
                          {packages.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemovePackage(pkg.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`packaging-${pkg.id}`} className="text-base font-medium">
                            梱包材
                          </Label>
                          <Select 
                            value={pkg.packagingType} 
                            onValueChange={(value: string) => onPackageChange(pkg.id, "packagingType", value)}
                          >
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="梱包材を選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">お客様ご用意の梱包材</SelectItem>
                              <SelectItem value="FEDEX_ENVELOPE">FedEx Envelope</SelectItem>
                              <SelectItem value="FEDEX_PAK">FedEx Pak</SelectItem>
                              <SelectItem value="FEDEX_TUBE">FedEx Tube</SelectItem>
                              <SelectItem value="FEDEX_10KG_BOX">FedEx 10kg Box</SelectItem>
                              <SelectItem value="FEDEX_25KG_BOX">FedEx 25kg Box</SelectItem>
                              <SelectItem value="FEDEX_BOX">FedEx Box</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`weight-${pkg.id}`} className="text-base font-medium">
                            パッケージ重量 (kg)
                          </Label>
                          <Input
                            id={`weight-${pkg.id}`}
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={pkg.weight}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "weight", e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>

                        {pkg.packagingType === "customer" && (
                          <div className="space-y-2">
                            <Label className="text-base font-medium">寸法 L x W x H (cm)</Label>
                            <div className="grid grid-cols-3 gap-3">
                              <Input
                                type="number"
                                placeholder="長さ"
                                value={pkg.length}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "length", e.target.value)}
                                className="h-12 text-base"
                              />
                              <Input
                                type="number"
                                placeholder="幅"
                                value={pkg.width}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "width", e.target.value)}
                                className="h-12 text-base"
                              />
                              <Input
                                type="number"
                                placeholder="高さ"
                                value={pkg.height}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "height", e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onAddPackage}
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    別のパッケージを追加
                  </Button>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold">総重量: {getTotalWeight()} kg</div>
                  </div>
                </div>
              </div>

              {/* Ship Date Section */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">希望出荷日はいつですか？</h2>
                <div className="space-y-2">
                  <Label htmlFor="ship-date" className="text-lg font-medium">
                    出荷日
                  </Label>
                  <Input 
                    id="ship-date" 
                    type="date" 
                    className="h-12 text-base max-w-xs"
                    value={quoteParams.shipDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQuoteParamsChange("shipDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">エラーが発生しました</div>
                  <div className="text-red-600">{error}</div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit"
                  disabled={isLoading || !quoteParams.originSelected || !quoteParams.destinationSelected}
                  className="w-full h-14 text-lg font-semibold text-white" 
                  style={{ backgroundColor: "#FF6600" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      見積もり中...
                    </>
                  ) : (
                    "料金を表示"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
