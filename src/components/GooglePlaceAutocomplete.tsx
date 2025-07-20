'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';

// グローバルなGoogle Maps API読み込み管理
declare global {
  interface Window {
    googleMapsApiLoading?: Promise<void>;
    googleMapsApiLoaded?: boolean;
  }
}

class GoogleMapsManager {
  private static instance: GoogleMapsManager;
  private loadingPromise: Promise<void> | null = null;

  static getInstance(): GoogleMapsManager {
    if (!GoogleMapsManager.instance) {
      GoogleMapsManager.instance = new GoogleMapsManager();
    }
    return GoogleMapsManager.instance;
  }

  isLoaded(): boolean {
    return window.googleMapsApiLoaded === true && 
           typeof window.google !== 'undefined' && 
           !!window.google.maps && 
           !!window.google.maps.places;
  }

  async loadApi(): Promise<void> {
    // 既に読み込み済みの場合
    if (this.isLoaded()) {
      return Promise.resolve();
    }

    // 既に読み込み中の場合は、既存のPromiseを返す
    if (window.googleMapsApiLoading) {
      return window.googleMapsApiLoading;
    }

    // 新しい読み込みを開始
    const loadingPromise = new Promise<void>((resolve, reject) => {
      // スクリプトが既に存在するかチェック
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // 既存のスクリプトが読み込み完了を待つ
        const checkLoaded = () => {
          if (this.isLoaded()) {
            window.googleMapsApiLoaded = true;
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // 新しいスクリプトを作成
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=ja&region=JP&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // グローバルコールバック関数を設定
      (window as any).initGoogleMaps = () => {
        window.googleMapsApiLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Google Maps script loading failed'));
      };

      // タイムアウト設定
      setTimeout(() => {
        if (!this.isLoaded()) {
          reject(new Error('Google Maps API loading timeout'));
        }
      }, 15000);

      document.head.appendChild(script);
    });

    window.googleMapsApiLoading = loadingPromise;
    return loadingPromise;
  }
}

export interface ParsedAddress {
  countryCode: string;
  stateCode: string;
  cityName: string;
  postalCode: string;
  street: string;
  fullAddress: string; // 表示用の日本語フル住所
  postalCodeMissing?: boolean; // 郵便番号が取得できなかった場合のフラグ
}

// 入力内容から国を推測する関数
function detectCountryFromInput(displayAddress: string): string | null {
  const address = displayAddress.toLowerCase();
  
  // 中国関連キーワード（拡張版）
  if (address.includes('china') || address.includes('中国') || address.includes('中華人民共和国') ||
      address.includes('shanghai') || address.includes('上海') || address.includes('shang hai') ||
      address.includes('beijing') || address.includes('北京') || address.includes('bei jing') ||
      address.includes('guangzhou') || address.includes('广州') || address.includes('guang zhou') ||
      address.includes('shenzhen') || address.includes('深圳') || address.includes('shen zhen') ||
      address.includes('hong kou') || address.includes('虹口') ||
      address.includes('pu dong') || address.includes('浦东') || address.includes('pudong') ||
      address.includes('黄浦') || address.includes('huang pu') ||
      address.includes('徐汇') || address.includes('xu hui') ||
      address.includes('长宁') || address.includes('chang ning') ||
      address.includes('静安') || address.includes('jing an') ||
      address.includes('普陀') || address.includes('pu tuo') ||
      address.includes('杨浦') || address.includes('yang pu') ||
      address.includes('闵行') || address.includes('min hang') ||
      address.includes('宝山') || address.includes('bao shan') ||
      address.includes('嘉定') || address.includes('jia ding') ||
      address.includes('金山') || address.includes('jin shan') ||
      address.includes('松江') || address.includes('song jiang') ||
      address.includes('青浦') || address.includes('qing pu') ||
      address.includes('奉贤') || address.includes('feng xian') ||
      address.includes('崇明') || address.includes('chong ming')) {
    return 'CN';
  }
  
  // 韓国関連キーワード
  if (address.includes('korea') || address.includes('韓国') || address.includes('한국') ||
      address.includes('seoul') || address.includes('ソウル') || address.includes('서울') ||
      address.includes('busan') || address.includes('釜山') || address.includes('부산')) {
    return 'KR';
  }
  
  // 台湾関連キーワード
  if (address.includes('taiwan') || address.includes('台湾') || address.includes('臺灣') ||
      address.includes('taipei') || address.includes('台北') ||
      address.includes('kaohsiung') || address.includes('高雄')) {
    return 'TW';
  }
  
  // 香港関連キーワード
  if (address.includes('hong kong') || address.includes('香港') ||
      address.includes('hk') || address.includes('central') || address.includes('tsim sha tsui')) {
    return 'HK';
  }
  
  // シンガポール関連キーワード  
  if (address.includes('singapore') || address.includes('シンガポール') ||
      address.includes('orchard') || address.includes('marina')) {
    return 'SG';
  }
  
  // タイ関連キーワード
  if (address.includes('thailand') || address.includes('タイ') || address.includes('ไทย') ||
      address.includes('bangkok') || address.includes('バンコク') ||
      address.includes('chiang mai') || address.includes('チェンマイ')) {
    return 'TH';
  }
  
  // ベトナム関連キーワード
  if (address.includes('vietnam') || address.includes('ベトナム') || address.includes('việt nam') ||
      address.includes('ho chi minh') || address.includes('ホーチミン') ||
      address.includes('hanoi') || address.includes('ハノイ')) {
    return 'VN';
  }
  
  // アメリカ関連キーワード
  if (address.includes('united states') || address.includes('アメリカ') || address.includes('usa') ||
      address.includes('new york') || address.includes('ニューヨーク') ||
      address.includes('california') || address.includes('カリフォルニア')) {
    return 'US';
  }
  
  // その他の主要国も追加可能
  return null;
}

// GooglePlaceAutocomplete.tsx 内の parseGooglePlaceResult 関数（最終版）
export function parseGooglePlaceResult(
  placeDetails: google.maps.places.PlaceResult,
  displayAddress: string // 表示用の日本語住所
): ParsedAddress {
  const components: { [key: string]: { long_name: string, short_name: string } } = {};
  if (placeDetails.address_components) {
    for (const component of placeDetails.address_components) {
      const type = component.types[0];
      components[type] = {
        long_name: component.long_name,
        short_name: component.short_name
      };
    }
  }

  // 'street_number' (番地) と 'route' (通り名) を結合して 'street' を作成
  const streetNumber = components.street_number?.long_name || '';
  const route = components.route?.long_name || '';
  let street = `${streetNumber} ${route}`.trim();
  
  // streetが空の場合、国と都市に応じて英語住所を生成
  const countryCode = components.country?.short_name || '';
  
  // cityNameの堅牢な取得処理
  let cityName = components.locality?.long_name || 
                 components.administrative_area_level_2?.long_name || 
                 components.administrative_area_level_3?.long_name || 
                 '';
  
  // cityNameが空の場合のフォールバック処理
  if (!cityName) {
    const stateLevel1 = components.administrative_area_level_1?.long_name || '';
    
    if (countryCode === 'CN' && stateLevel1) {
      // 中国の場合：「Shang Hai Shi」→「Shanghai」のように変換
      if (stateLevel1.includes('Shang Hai') || stateLevel1.includes('Shanghai')) {
        cityName = 'Shanghai';
      } else if (stateLevel1.includes('Bei Jing') || stateLevel1.includes('Beijing')) {
        cityName = 'Beijing';
      } else if (stateLevel1.includes('Guang Zhou') || stateLevel1.includes('Guangzhou')) {
        cityName = 'Guangzhou';
      } else if (stateLevel1.includes('Shen Zhen') || stateLevel1.includes('Shenzhen')) {
        cityName = 'Shenzhen';
      } else {
        // その他の場合は「Shi」を削除して都市名を抽出
        cityName = stateLevel1.replace(/\s?Shi$/i, '').replace(/\s?市$/i, '').trim();
      }
      console.log(`🏙️ Extracted Chinese city name from state: ${stateLevel1} → ${cityName}`);
    } else if (countryCode === 'KR' && stateLevel1) {
      // 韓国の場合：Seoul, Busan等を適切に処理
      if (stateLevel1.includes('Seoul') || stateLevel1.includes('서울')) {
        cityName = 'Seoul';
      } else if (stateLevel1.includes('Busan') || stateLevel1.includes('부산')) {
        cityName = 'Busan';
      } else {
        cityName = stateLevel1;
      }
      console.log(`🏙️ Extracted Korean city name from state: ${stateLevel1} → ${cityName}`);
    } else if (countryCode === 'TW' && stateLevel1) {
      // 台湾の場合：Taipei, Kaohsiung等を適切に処理
      if (stateLevel1.includes('Taipei') || stateLevel1.includes('台北')) {
        cityName = 'Taipei';
      } else if (stateLevel1.includes('Kaohsiung') || stateLevel1.includes('高雄')) {
        cityName = 'Kaohsiung';
      } else {
        cityName = stateLevel1;
      }
      console.log(`🏙️ Extracted Taiwanese city name from state: ${stateLevel1} → ${cityName}`);
    } else if (countryCode === 'TH' && stateLevel1) {
      // タイの場合：Bangkok等を適切に処理
      if (stateLevel1.includes('Bangkok') || stateLevel1.includes('กรุงเทพ')) {
        cityName = 'Bangkok';
      } else {
        cityName = stateLevel1;
      }
      console.log(`🏙️ Extracted Thai city name from state: ${stateLevel1} → ${cityName}`);
    } else if (countryCode === 'VN' && stateLevel1) {
      // ベトナムの場合：Ho Chi Minh City, Hanoi等を適切に処理
      if (stateLevel1.includes('Ho Chi Minh') || stateLevel1.includes('Hồ Chí Minh')) {
        cityName = 'Ho Chi Minh City';
      } else if (stateLevel1.includes('Hanoi') || stateLevel1.includes('Hà Nội')) {
        cityName = 'Hanoi';
      } else {
        cityName = stateLevel1;
      }
      console.log(`🏙️ Extracted Vietnamese city name from state: ${stateLevel1} → ${cityName}`);
    } else if (stateLevel1) {
      // その他の国の場合、そのまま使用
      cityName = stateLevel1;
      console.log(`🏙️ Using administrative_area_level_1 as city name: ${cityName}`);
    }
  }
  
  if (!street && countryCode === 'JP') {
    // 日本の場合、都市名に基づいて英語住所を生成
    if (cityName === 'Toyokawa') {
      street = '1 Chome Honohara'; // 豊川市穂ノ原の英語表記
      console.log('🏠 Generated English street for Toyokawa:', street);
    } else if (cityName) {
      street = `${cityName} District`; // 他の都市の場合
      console.log('🏠 Generated English street for', cityName, ':', street);
    } else {
      street = 'Japan Address'; // フォールバック
      console.log('🏠 Using Japan fallback address');
    }
  } else if (!street && countryCode === 'US') {
    // アメリカの場合、address_componentsから住所を構築
    const subpremise = components.subpremise?.long_name || '';
    const premise = components.premise?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const sublocality = components.sublocality?.long_name || '';
    
    // 住所構成要素を組み合わせ
    const addressParts = [subpremise, premise, neighborhood, sublocality].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🏢 Built US street address from components:', street);
    } else {
      // address_componentsから情報が取得できない場合は、郵便番号エリアを使用
      const postalCode = components.postal_code?.long_name || '';
      street = postalCode ? `${postalCode} Area` : 'US Address';
      console.log('🔄 Using postal code area for US address:', street);
    }
  } else if (!street && countryCode === 'CA') {
    // カナダの場合、アメリカと同様の処理
    const subpremise = components.subpremise?.long_name || '';
    const premise = components.premise?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const sublocality = components.sublocality?.long_name || '';
    
    const addressParts = [subpremise, premise, neighborhood, sublocality].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🍁 Built Canadian street address from components:', street);
    } else {
      const postalCode = components.postal_code?.long_name || '';
      street = postalCode ? `${postalCode} Area` : 'Canadian Address';
      console.log('🔄 Using postal code area for Canadian address:', street);
    }
  } else if (!street && (countryCode === 'GB' || countryCode === 'UK')) {
    // イギリスの場合
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇬🇧 Built UK street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for UK address:', street);
    } else {
      street = 'UK Address';
    }
  } else if (!street && countryCode === 'DE') {
    // ドイツの場合
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇩🇪 Built German street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for German address:', street);
    } else {
      street = 'German Address';
    }
  } else if (!street && countryCode === 'AU') {
    // オーストラリアの場合
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇦🇺 Built Australian street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Australian address:', street);
    } else {
      street = 'Australian Address';
    }
  } else if (!street && countryCode === 'FR') {
    // フランスの場合
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇫🇷 Built French street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for French address:', street);
    } else {
      street = 'French Address';
    }
  } else if (!street && countryCode === 'CN') {
    // 中国の場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const sublocalityLevel2 = components.sublocality_level_2?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocalityLevel2, sublocalityLevel1, sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇨🇳 Built Chinese street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Chinese address:', street);
    } else {
      street = 'Chinese Address';
    }
  } else if (!street && countryCode === 'KR') {
    // 韓国の場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const sublocalityLevel2 = components.sublocality_level_2?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocalityLevel2, sublocalityLevel1, sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇰🇷 Built Korean street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Korean address:', street);
    } else {
      street = 'Korean Address';
    }
  } else if (!street && countryCode === 'TW') {
    // 台湾の場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const sublocalityLevel2 = components.sublocality_level_2?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocalityLevel2, sublocalityLevel1, sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇹🇼 Built Taiwanese street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Taiwanese address:', street);
    } else {
      street = 'Taiwanese Address';
    }
  } else if (!street && countryCode === 'HK') {
    // 香港の場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const premise = components.premise?.long_name || '';
    
    const addressParts = [premise, neighborhood, sublocalityLevel1, sublocality].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇭🇰 Built Hong Kong street address from components:', street);
    } else {
      street = 'Hong Kong Address';
    }
  } else if (!street && countryCode === 'SG') {
    // シンガポールの場合
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const premise = components.premise?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [premise, neighborhood, sublocality].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇸🇬 Built Singapore street address from components:', street);
    } else if (postalCode) {
      street = `Singapore ${postalCode}`;
      console.log('🔄 Using postal code for Singapore address:', street);
    } else {
      street = 'Singapore Address';
    }
  } else if (!street && countryCode === 'TH') {
    // タイの場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const sublocalityLevel2 = components.sublocality_level_2?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocalityLevel2, sublocalityLevel1, sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇹🇭 Built Thai street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Thai address:', street);
    } else {
      street = 'Thai Address';
    }
  } else if (!street && countryCode === 'VN') {
    // ベトナムの場合
    const sublocality = components.sublocality?.long_name || '';
    const sublocalityLevel1 = components.sublocality_level_1?.long_name || '';
    const sublocalityLevel2 = components.sublocality_level_2?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    const postalCode = components.postal_code?.long_name || '';
    
    const addressParts = [sublocalityLevel2, sublocalityLevel1, sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🇻🇳 Built Vietnamese street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for Vietnamese address:', street);
    } else {
      street = 'Vietnamese Address';
    }
  } else if (!street) {
    // その他の国の場合
    const postalCode = components.postal_code?.long_name || '';
    const sublocality = components.sublocality?.long_name || '';
    const neighborhood = components.neighborhood?.long_name || '';
    
    const addressParts = [sublocality, neighborhood].filter(Boolean);
    
    if (addressParts.length > 0) {
      street = addressParts.join(' ');
      console.log('🌍 Built international street address from components:', street);
    } else if (postalCode) {
      street = `${postalCode} Area`;
      console.log('🔄 Using postal code area for international address:', street);
    } else {
      street = 'International Address';
      console.log('🌍 Using international fallback address');
    }
  }

  return {
    countryCode: countryCode,
    stateCode: components.administrative_area_level_1?.short_name || '',
    cityName: cityName,
    postalCode: components.postal_code?.long_name || '',
    street: street, // 生成または抽出した英語住所
    fullAddress: displayAddress,
  };
}

interface GooglePlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (parsedData: ParsedAddress) => void;
  onInputChange?: () => void;
  placeholder?: string;
}

export function GooglePlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onInputChange,
  placeholder,
}: GooglePlaceAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const managerRef = useRef(GoogleMapsManager.getInstance());

  // Google Maps APIの読み込み管理
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        console.log('🔄 Loading Google Maps API...');
        await managerRef.current.loadApi();
        console.log('✅ Google Maps API loaded successfully');
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to load Google Maps API:', error);
        setIsLoading(false);
        // エラー時は5秒後にリトライ
        setTimeout(() => {
          setIsLoading(true);
          initializeGoogleMaps();
        }, 5000);
      }
    };

    if (managerRef.current.isLoaded()) {
      console.log('🚀 Google Maps API already loaded');
      setIsReady(true);
      setIsLoading(false);
    } else {
      initializeGoogleMaps();
    }
  }, []);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    console.log('📍 Autocomplete component loaded');
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const placeResult = autocompleteRef.current.getPlace();
    if (!placeResult || !placeResult.place_id) return;

    const placeId = placeResult.place_id;
    const displayAddress = placeResult.formatted_address || '';
    onChange(displayAddress);

    // 入力内容から国を推測して適切なregionを設定
    const detectedCountry = detectCountryFromInput(displayAddress);
    const regionParam = detectedCountry || 'JP'; // デフォルトは日本
    
    console.log(`🌍 Detected country: ${detectedCountry}, using region: ${regionParam} for address: ${displayAddress}`);

    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    placesService.getDetails({
      placeId,
      fields: ['address_components'],
      language: 'en', // 英語で詳細情報を取得
      region: regionParam, // 動的にregionを設定
    }, (placeDetails, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
        const parsedData = parseGooglePlaceResult(placeDetails, displayAddress);
        
        // 郵便番号が取得できない場合のフォールバック処理
        const countryCode = parsedData.countryCode || detectedCountry;
        const needsPostalCode = ['CN', 'KR', 'TW', 'TH', 'VN', 'US', 'CA', 'GB', 'DE', 'FR', 'AU'];
        
        if (!parsedData.postalCode && countryCode && needsPostalCode.includes(countryCode)) {
          console.log(`⚠️ Postal code missing for ${countryCode}. Flagging for manual input.`);
          parsedData.postalCodeMissing = true;
        }
        
        console.log('✅ Parsed address data:', parsedData);
        onPlaceSelect(parsedData);
      } else {
        console.error(`❌ Failed to get place details: ${status}`);
        // API呼び出し失敗時のフォールバック
        const needsPostalCode = ['CN', 'KR', 'TW', 'TH', 'VN', 'US', 'CA', 'GB', 'DE', 'FR', 'AU'];
        const fallbackData: ParsedAddress = {
          countryCode: detectedCountry || '',
          stateCode: '',
          cityName: '',
          postalCode: '',
          street: '',
          fullAddress: displayAddress,
          postalCodeMissing: detectedCountry ? needsPostalCode.includes(detectedCountry) : false
        };
        console.log('🔄 Using fallback data due to API failure:', fallbackData);
        onPlaceSelect(fallbackData);
      }
    });
  }, [onChange, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (onInputChange) {
      onInputChange();
    }
  };

  // 読み込み中の表示
  if (isLoading) {
    return (
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder="住所検索を準備中..."
        disabled
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 h-12 text-base"
      />
    );
  }

  // エラー状態の表示
  if (!isReady) {
    return (
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder="住所検索でエラーが発生しました（手動入力可能）"
        className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 h-12 text-base"
      />
    );
  }

  // Google Maps APIが準備完了
  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ fields: ['place_id', 'formatted_address'] }}
    >
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 text-base"
      />
    </Autocomplete>
  );
} 