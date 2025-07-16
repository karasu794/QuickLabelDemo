// src/components/GooglePlaceAutocomplete.tsx

'use client';

import React, { useCallback, useRef, useState, useEffect, useContext, createContext } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';

// 🔧 静的なlibraries配列（重複読み込み防止）
const GOOGLE_MAPS_LIBRARIES: ['places'] = ['places'];

// Google Maps 読み込み状態管理
interface GoogleMapsState {
  isLoaded: boolean;
  isLoading: boolean;
  error: boolean;
}

// Google Maps APIグローバル状態管理コンテキスト
interface GoogleMapsContextType {
  mapsReady: boolean;
  setMapsReady: (ready: boolean) => void;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  mapsReady: false,
  setMapsReady: () => {}
});

// Google Maps API状態プロバイダー
function GoogleMapsStateProvider({ children }: { children: React.ReactNode }) {
  const [mapsReady, setMapsReadyState] = useState(false);
  
  const setMapsReady = useCallback((ready: boolean) => {
    setMapsReadyState(prevState => {
      if (prevState === ready) return prevState; // 重複更新防止
      if (ready && !prevState) {
        console.log('🔄 Google Maps API loaded (global state)');
      }
      return ready;
    });
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ mapsReady, setMapsReady }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

// Google Maps API状態を使用するフック
function useGoogleMapsState() {
  return useContext(GoogleMapsContext);
}

interface GooglePlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (parsedData: ParsedAddress) => void;
  onInputChange?: () => void;
  placeholder?: string;
  customClassName?: string;
}

export interface ParsedAddress {
  countryCode: string;
  stateCode: string;
  cityName: string;
  postalCode: string;
  street: string;
  fullAddress: string;
}

// Google Maps API使用版のAutocomplete
function GoogleMapsAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onInputChange,
  placeholder,
  customClassName
}: GooglePlaceAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const placeResult = autocompleteRef.current.getPlace();
      console.log('🔍 Place selected (Japanese):', placeResult?.formatted_address);
      console.log('🔍 Place ID:', placeResult?.place_id);
      
      if (placeResult && placeResult.place_id) {
        const placeId = placeResult.place_id;
        const displayAddress = placeResult.formatted_address || '';

        // ユーザーの入力欄には日本語の住所を表示
        onChange(displayAddress);

        console.log('🔄 Starting English details fetch for place_id:', placeId);

        // place_idを使って英語で詳細情報を再取得
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails({
          placeId: placeId,
          fields: ['address_components', 'formatted_address'],
          language: 'en' // ★★★ここで英語を指定★★★
        }, (placeDetails, status) => {
          console.log('🌐 English details fetch status:', status);
          console.log('🌐 English details result:', placeDetails);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails && placeDetails.address_components) {

            // 英語の住所コンポーネントを解析
            const components: { [key: string]: string } = {};
            for (const component of placeDetails.address_components) {
                const type = component.types[0];
                console.log(`📍 Component [${type}]: ${component.long_name} (short: ${component.short_name})`);
                // 国と州はshort_name（コード）、他はlong_nameで英語名を取得
                if (type === 'country' || type === 'administrative_area_level_1') {
                  components[type] = component.short_name;
                } else {
                  components[type] = component.long_name;
                }
            }

            // 結果の英語データを構築
            const parsedData: ParsedAddress = {
              countryCode: components['country'] || '',
              stateCode: components['administrative_area_level_1'] || '',
              cityName: components['locality'] || components['administrative_area_level_2'] || '',
              postalCode: components['postal_code'] || '',
              street: components['route'] || components['sublocality'] || '',
              fullAddress: displayAddress
            };

            console.log('✅ Final parsed English data:', parsedData);
            onPlaceSelect(parsedData);
          }
        });
      }
    }
  }, [onChange, onPlaceSelect]);

  const onUnmount = useCallback(() => {
    autocompleteRef.current = null;
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (onInputChange) {
      onInputChange();
    }
  }, [onChange, onInputChange]);

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      onUnmount={onUnmount}
      options={{
        fields: ['address_components', 'formatted_address', 'name', 'place_id'],
        types: ['geocode', 'establishment'],
      }}
    >
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 h-12 text-base ${customClassName || 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
      />
    </Autocomplete>
  );
}

// フォールバック用の通常のテキスト入力
function FallbackTextInput({
  value,
  onChange,
  placeholder,
  customClassName
}: GooglePlaceAutocompleteProps) {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 h-12 text-base ${customClassName || 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
      />
      <p className="text-xs text-amber-600 mt-1">
        ⚠️ Google Maps API利用不可 - 手動で住所を入力してください
      </p>
    </div>
  );
}

// メインのGooglePlaceAutocompleteコンポーネント
export function GooglePlaceAutocomplete(props: GooglePlaceAutocompleteProps) {
  const { mapsReady } = useGoogleMapsState();

  // Google Maps APIが利用可能な場合
  if (mapsReady) {
    return <GoogleMapsAutocomplete {...props} />;
  }

  // フォールバック（通常のテキスト入力）
  return <FallbackTextInput {...props} />;
}

// GoogleMapsProviderの改良版（エラー処理とフォールバック強化）
interface GoogleMapsProviderProps {
  children: React.ReactNode;
}
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <GoogleMapsStateProvider>
      <GoogleMapsProviderInternal>
        {children}
      </GoogleMapsProviderInternal>
    </GoogleMapsStateProvider>
  );
}

function GoogleMapsProviderInternal({ children }: GoogleMapsProviderProps) {
  const [mapsState, setMapsState] = useState<GoogleMapsState>({
    isLoaded: false,
    isLoading: true,
    error: false
  });
  
  const { setMapsReady } = useGoogleMapsState();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;
  
  // Google Maps API がすでに読み込まれているかチェック
  useEffect(() => {
    const checkIfAlreadyLoaded = () => {
      if (typeof window !== 'undefined' && 
          (window as any).google && 
          (window as any).google.maps && 
          (window as any).google.maps.places) {
        console.log('🔄 Google Maps API already loaded');
        setMapsState({
          isLoaded: true,
          isLoading: false,
          error: false
        });
        setMapsReady(true);
        return true;
      }
      return false;
    };

    // 初期チェック
    if (checkIfAlreadyLoaded()) {
      return;
    }

    // タイムアウト設定（10秒に延長し、API読み込み完了を待つ）
    const timeout = setTimeout(() => {
      console.warn('⚠️ Google Maps API load timeout - using fallback mode');
      setMapsState({
        isLoaded: false,
        isLoading: false,
        error: false // エラーではなくフォールバック
      });
      setMapsReady(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [setMapsReady]);

  if (!googleMapsApiKey) {
    console.error('🚨 Google Maps API key is not configured');
    return <div>{children}</div>; // APIキーなしでもフォールバック表示
  }

  const handleLoad = useCallback(() => {
    console.log('✅ Google Maps API loaded successfully');
    setMapsState({
      isLoaded: true,
      isLoading: false,
      error: false
    });
    setMapsReady(true);
  }, [setMapsReady]);

  const handleError = useCallback((error: Error) => {
    console.error('❌ Google Maps API load error:', error);
    console.log('🔄 Switching to fallback mode');
    setMapsState({
      isLoaded: false,
      isLoading: false,
      error: false // エラーではなくフォールバック
    });
    setMapsReady(false);
  }, [setMapsReady]);

  // Loading state（短時間のみ）
  if (mapsState.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Google Maps読み込み中...</span>
      </div>
    );
  }

  // Google Maps APIが利用可能または失敗した場合、両方でchildrenを表示
  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={GOOGLE_MAPS_LIBRARIES}
      language="ja"
      region="JP"
      preventGoogleFontsLoading={true}
      onLoad={handleLoad}
      onError={handleError}
    >
      {children}
    </LoadScript>
  );
} 