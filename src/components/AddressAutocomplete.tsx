'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  // 郵便番号専用入力フィールドかどうか
  isPostalCodeField?: boolean;
  // 英語モード（FedEx API用）
  englishMode?: boolean;
}

// 住所情報を構造化して返すための型
export interface ParsedAddress {
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  streetAddress: string;
  building: string;
  fullAddress: string;
  formattedAddress: string;
  // 英語版の住所情報
  prefectureEn?: string;
  cityEn?: string;
  townEn?: string;
  streetAddressEn?: string;
  buildingEn?: string;
  fullAddressEn?: string;
  formattedAddressEn?: string;
}

// 住所コンポーネントから情報を抽出するヘルパー関数
export function parseAddressComponents(place: google.maps.places.PlaceResult, englishMode: boolean = false): ParsedAddress {
  const components = place.address_components || [];
  const parsed: ParsedAddress = {
    postalCode: '',
    prefecture: '',
    city: '',
    town: '',
    streetAddress: '',
    building: '',
    fullAddress: place.formatted_address || '',
    formattedAddress: place.formatted_address || ''
  };

  // 英語版の住所を name から取得（可能な場合）
  if (place.name) {
    parsed.formattedAddressEn = place.name;
  }

  components.forEach(component => {
    const types = component.types;
    
    if (types.includes('postal_code')) {
      parsed.postalCode = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      if (englishMode) {
        parsed.prefectureEn = component.long_name;
        parsed.prefecture = component.short_name || component.long_name;
      } else {
        parsed.prefecture = component.long_name;
      }
    }
    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
      if (englishMode) {
        parsed.cityEn = component.long_name;
        parsed.city = component.short_name || component.long_name;
      } else {
        parsed.city = component.long_name;
      }
    }
    if (types.includes('sublocality_level_1') || types.includes('sublocality_level_2')) {
      if (englishMode) {
        parsed.townEn = component.long_name;
        parsed.town = component.short_name || component.long_name;
      } else {
        parsed.town = component.long_name;
      }
    }
    if (types.includes('premise')) {
      if (englishMode) {
        parsed.buildingEn = component.long_name;
        parsed.building = component.short_name || component.long_name;
      } else {
        parsed.building = component.long_name;
      }
    }
    if (types.includes('street_number')) {
      const streetNum = component.long_name;
      if (englishMode) {
        parsed.streetAddressEn = streetNum + (parsed.streetAddressEn || '');
      } else {
        parsed.streetAddress = streetNum + parsed.streetAddress;
      }
    }
    if (types.includes('route')) {
      const route = component.long_name;
      if (englishMode) {
        parsed.streetAddressEn = (parsed.streetAddressEn || '') + ' ' + route;
      } else {
        parsed.streetAddress = parsed.streetAddress + route;
      }
    }
  });

  // 英語モードの場合、フォーマット済み住所も英語版を作成
  if (englishMode && place.formatted_address) {
    // "Japan" を除去し、順序を逆にする（西洋式の住所形式）
    const cleanAddress = place.formatted_address.replace(/^日本、|Japan,?\s*/i, '');
    parsed.formattedAddressEn = cleanAddress;
    
    // 全住所を英語形式で組み立て
    const parts = [];
    if (parsed.buildingEn) parts.push(parsed.buildingEn);
    if (parsed.streetAddressEn) parts.push(parsed.streetAddressEn);
    if (parsed.townEn) parts.push(parsed.townEn);
    if (parsed.cityEn) parts.push(parsed.cityEn);
    if (parsed.prefectureEn) parts.push(parsed.prefectureEn);
    if (parsed.postalCode) parts.push(parsed.postalCode);
    
    parsed.fullAddressEn = parts.join(', ');
  }

  return parsed;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  label,
  isPostalCodeField = false,
  englishMode = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.places) {
        console.log('Google Maps API is ready');
        setIsGoogleLoaded(true);
      } else {
        console.log('Waiting for Google Maps API...');
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
  }, []);

  // Initialize services when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleLoaded) return;

    try {
      console.log('Initializing AutocompleteService and PlacesService');
      
      // Create a session token for billing optimization
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      
      // Initialize AutocompleteService
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
      
      console.log('Google services initialized successfully');
    } catch (error) {
      console.error('Error initializing Google services:', error);
      setApiError('Google Maps APIの初期化に失敗しました。APIが有効化されているか確認してください。');
    }
  }, [isGoogleLoaded]);

  // 郵便番号パターンを検出
  const isPostalCode = (input: string): boolean => {
    // 日本の郵便番号パターン（XXX-XXXX または XXXXXXX）
    const japanesePostalPattern = /^\d{3}-?\d{0,4}$/;
    return japanesePostalPattern.test(input);
  };

  // 郵便番号をフォーマット
  const formatPostalCode = (code: string): string => {
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 3) + '-' + cleaned.slice(3, 7);
    }
    return cleaned;
  };

  // Place選択時の処理
  const handlePlaceSelection = useCallback((place: google.maps.places.PlaceResult) => {
    // フォーマットされた住所を設定
    if (isPostalCodeField) {
      // 郵便番号フィールドの場合は郵便番号のみを設定
      const parsed = parseAddressComponents(place, englishMode);
      if (parsed.postalCode) {
        onChange(parsed.postalCode);
      }
    } else {
      // 住所フィールドの場合は住所を設定
      const address = place.formatted_address || '';
      // 「日本、」または "Japan," を削除
      const cleanAddress = address.replace(/^(日本、|Japan,?\s*)/i, '');
      onChange(cleanAddress);
    }
    
    // 親コンポーネントにplace全体を渡す
    if (onAddressSelect) {
      onAddressSelect(place);
    }
    
    setShowSuggestions(false);
    setApiError('');
    
    // セッショントークンをリセット（課金最適化）
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  }, [onChange, onAddressSelect, isPostalCodeField, englishMode]);

  // Handle input change and fetch suggestions
  const handleInputChange = useCallback(async (inputValue: string) => {
    onChange(inputValue);

    if (!isGoogleLoaded || !inputValue || inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setApiError('');
      return;
    }

    if (!autocompleteServiceRef.current) {
      console.error('AutocompleteService is not initialized');
      setApiError('AutocompleteServiceが初期化されていません');
      return;
    }

    // 郵便番号の場合は別の検索戦略を使用
    const isPostal = isPostalCode(inputValue);
    
    const request: google.maps.places.AutocompletionRequest = {
      input: inputValue,
      componentRestrictions: { country: 'jp' },
      language: englishMode ? 'en' : 'ja',
      sessionToken: sessionTokenRef.current || undefined,
      types: isPostal ? ['geocode'] : isPostalCodeField ? ['geocode'] : ['address']
    };

    console.log('Using AutocompleteService with request:', request);

    autocompleteServiceRef.current.getPlacePredictions(
      request, 
      (
        predictions: google.maps.places.AutocompletePrediction[] | null, 
        status: google.maps.places.PlacesServiceStatus
      ) => {
        console.log('AutocompleteService response:', { status, predictions });
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
          setApiError('');
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          
          // エラーメッセージを設定
          const errorMessages: { [key: string]: string } = {
            'ZERO_RESULTS': isPostal ? 
              (englishMode ? 'Postal code not found' : '該当する郵便番号が見つかりませんでした') : 
              (englishMode ? 'No results found' : '検索結果が見つかりませんでした'),
            'OVER_QUERY_LIMIT': englishMode ? 'API quota exceeded' : 'APIクォータを超過しました',
            'REQUEST_DENIED': englishMode ? 'Request denied. Please check API key' : 'リクエストが拒否されました。APIキーを確認してください',
            'INVALID_REQUEST': englishMode ? 'Invalid request' : '無効なリクエストです',
            'NOT_FOUND': englishMode ? 'Location not found' : '場所が見つかりませんでした',
            'UNKNOWN_ERROR': englishMode ? 'Unknown error' : '不明なエラーが発生しました'
          };
          
          if (status === 'ZERO_RESULTS' && isPostal && inputValue.length >= 7) {
            setApiError(englishMode ? 'Postal code not found. Please check the number.' : '郵便番号が見つかりません。番号を確認してください。');
          } else if (status === 'ZERO_RESULTS' && !isPostal) {
            setApiError('');
          } else {
            setApiError(errorMessages[status] || `${englishMode ? 'Error' : 'エラー'}: ${status}`);
          }
        }
      }
    );
  }, [isGoogleLoaded, onChange, isPostalCodeField, englishMode]);

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((placeId: string) => {
    if (!placesServiceRef.current) {
      console.error('PlacesService is not initialized');
      return;
    }

    const request = {
      placeId: placeId,
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
      language: englishMode ? 'en' : 'ja'
    };

    placesServiceRef.current.getDetails(
      request, 
      (
        place: google.maps.places.PlaceResult | null, 
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          handlePlaceSelection(place);
        } else {
          console.error('PlacesService getDetails error:', status);
        }
      }
    );
  }, [handlePlaceSelection, englishMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder || (
          isPostalCodeField ? 
            (englishMode ? "Enter postal code" : "郵便番号を入力") : 
            (englishMode ? "Enter address" : "住所を入力")
        )}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        disabled={disabled || !isGoogleLoaded}
        required={required}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleSuggestionClick(suggestion.place_id)}
            >
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <div className="font-medium">
                  {suggestion.structured_formatting.main_text}
                </div>
                {suggestion.structured_formatting.secondary_text && (
                  <div className="text-sm text-gray-600">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {apiError && (
        <div className="text-sm text-red-500 mt-1">
          {apiError}
        </div>
      )}

      {!isGoogleLoaded && (
        <div className="text-sm text-gray-500 mt-1">
          {englishMode ? 'Loading Google Maps API...' : 'Google Maps APIを読み込んでいます...'}
        </div>
      )}

      {/* ヒント表示 */}
      {!apiError && !showSuggestions && value.length > 0 && isPostalCode(value) && !isPostalCodeField && (
        <div className="text-sm text-gray-500 mt-1">
          💡 {englishMode ? 
            'Hint: If postal code is not found, try entering the address instead' : 
            'ヒント: 郵便番号の候補が見つからない場合は、住所を入力してみてください'}
        </div>
      )}
    </div>
  );
} 