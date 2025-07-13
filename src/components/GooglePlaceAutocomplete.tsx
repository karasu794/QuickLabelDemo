// src/components/GooglePlaceAutocomplete.tsx

'use client';

import React, { useCallback, useRef } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';

// 【重要】このコンポーネントからZustand関連のインポートはすべて削除します。

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

// place_idを使った2段階取得により、parseGooglePlaceResult関数は不要になりました

export function GooglePlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onInputChange,
  placeholder = "国、郵便番号、または住所を入力",
  customClassName = ""
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

            const parsedData: ParsedAddress = {
              countryCode: components.country || '',
              stateCode: components.administrative_area_level_1 || '',
              cityName: components.locality || components.administrative_area_level_2 || '',
              postalCode: components.postal_code || '',
              street: `${components.route || ''} ${components.street_number || ''}`.trim(),
              fullAddress: displayAddress // 表示用の日本語住所も渡す
            };

            console.log('✅ Final parsed English data:', parsedData);

            // 親コンポーネントに解析済みの英語データを渡す
            onPlaceSelect(parsedData);

          } else {
            console.error('❌ Failed to get place details in English:', status);
            console.error('❌ PlaceDetails object:', placeDetails);
          }
        });
      } else {
        console.warn('⚠️ No place_id available in place result');
      }
    }
  }, [onChange, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (onInputChange) {
      onInputChange();
    }
  };
  
  const onUnmount = useCallback(() => {
    autocompleteRef.current = null;
  }, []);

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

// GoogleMapsProviderは変更なし
interface GoogleMapsProviderProps {
  children: React.ReactNode;
}
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;
  if (!googleMapsApiKey) return <div>Google Maps API key is not configured</div>;
  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={['places']}
      language="ja" // 復活させる
      region="JP"   // 復活させる
    >
      {children}
    </LoadScript>
  );
} 