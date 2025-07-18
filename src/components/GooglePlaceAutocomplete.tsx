'use client';

import React, { useCallback, useRef } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES: ['places'] = ['places'];

export interface ParsedAddress {
  countryCode: string;
  stateCode: string;
  cityName: string;
  postalCode: string;
  street: string;
  fullAddress: string; // 表示用の日本語フル住所
}

// GooglePlaceAutocomplete.tsx 内の parseGooglePlaceResult 関数
export function parseGooglePlaceResult(place: google.maps.places.PlaceResult): ParsedAddress {
  const components: { [key: string]: { long_name: string, short_name: string } } = {};
  if (place.address_components) {
    for (const component of place.address_components) {
      const type = component.types[0];
      components[type] = {
        long_name: component.long_name,
        short_name: component.short_name
      };
      console.log(`📍 Component [${type}]: ${component.long_name} (short: ${component.short_name})`);
    }
  }

  // 日本の住所構造に特化した包括的な住所解析ロジック
  const streetParts = [];
  
  // 日本の住所かどうかを判定
  const isJapaneseAddress = components.country?.short_name === 'JP';
  
  if (isJapaneseAddress) {
    // 日本の住所構造: 地区名 + 丁目 + 番地を順番に組み立て
    
    // 地区名（穂ノ原など）- sublocality_level_1
    if (components.sublocality_level_1?.long_name) {
      streetParts.push(components.sublocality_level_1.long_name);
    }
    
    // 丁目・番地（１丁目など）- sublocality_level_2
    if (components.sublocality_level_2?.long_name) {
      streetParts.push(components.sublocality_level_2.long_name);
    }
    
    // さらに詳細な地区情報があれば追加
    if (components.sublocality_level_3?.long_name) {
      streetParts.push(components.sublocality_level_3.long_name);
    }
    
    // 番地・建物番号（１７−２など）- premise または street_number
    if (components.premise?.long_name) {
      streetParts.push(components.premise.long_name);
    } else if (components.street_number?.long_name) {
      streetParts.push(components.street_number.long_name);
    }
    
    // 通り名があれば追加
    if (components.route?.long_name) {
      streetParts.push(components.route.long_name);
    }
  } else {
    // 欧米形式の住所構造
    
    // 優先順位1: street_number + route の組み合わせ（欧米形式）
    if (components.street_number?.long_name && components.route?.long_name) {
      streetParts.push(components.street_number.long_name);
      streetParts.push(components.route.long_name);
    }
    // 優先順位2: premise（建物番号や番地）
    else if (components.premise?.long_name) {
      streetParts.push(components.premise.long_name);
    }
    // 優先順位3: sublocality_level_1
    else if (components.sublocality_level_1?.long_name) {
      streetParts.push(components.sublocality_level_1.long_name);
    }
    // 優先順位4: sublocality
    else if (components.sublocality?.long_name) {
      streetParts.push(components.sublocality.long_name);
    }
    // 優先順位5: route のみ
    else if (components.route?.long_name) {
      streetParts.push(components.route.long_name);
    }
  }

  const street = streetParts.join(' ').trim();
  
  console.log('🏠 Enhanced Japanese address construction details:', {
    country: components.country?.short_name,
    isJapanese: components.country?.short_name === 'JP',
    streetNumber: components.street_number?.long_name,
    route: components.route?.long_name,
    premise: components.premise?.long_name,
    sublocalityLevel1: components.sublocality_level_1?.long_name,
    sublocalityLevel2: components.sublocality_level_2?.long_name,
    sublocalityLevel3: components.sublocality_level_3?.long_name,
    sublocality: components.sublocality?.long_name,
    streetParts,
    finalStreet: street
  });

  // fullAddressの生成 - より堅牢なフォールバック処理
  let fullAddress = place.formatted_address || '';
  
  // fullAddressが空の場合、主要コンポーネントから構築
  if (!fullAddress) {
    const addressParts = [];
    if (street) addressParts.push(street);
    if (components.locality?.long_name) addressParts.push(components.locality.long_name);
    if (components.administrative_area_level_1?.short_name) addressParts.push(components.administrative_area_level_1.short_name);
    if (components.postal_code?.long_name) addressParts.push(components.postal_code.long_name);
    if (components.country?.long_name) addressParts.push(components.country.long_name);
    fullAddress = addressParts.join(', ');
  }

  return {
    countryCode: components.country?.short_name || '',
    stateCode: components.administrative_area_level_1?.short_name || '',
    cityName: components.locality?.long_name || components.administrative_area_level_2?.long_name || components.sublocality_level_1?.long_name || '',
    postalCode: components.postal_code?.long_name || '',
    street: street, // 包括的なロジックで構築したstreet
    fullAddress: fullAddress,
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

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const placeResult = autocompleteRef.current.getPlace();
    if (!placeResult || !placeResult.place_id) return;

    const placeId = placeResult.place_id;
    const displayAddress = placeResult.formatted_address || '';
    console.log('🔍 Place selected (Japanese):', displayAddress);
    console.log('🔍 Place ID:', placeId);
    
    onChange(displayAddress);

    console.log('🔄 Starting English details fetch for place_id:', placeId);
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    placesService.getDetails({
      placeId,
      fields: ['address_components', 'formatted_address'], // formatted_addressも取得
      language: 'en', // 英語で詳細情報を取得
    }, (placeDetails, status) => {
      console.log('🌐 English details fetch status:', status);
      console.log('🌐 English details result:', placeDetails);
      
      if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails?.address_components) {
        // 全コンポーネントの詳細ログ
        console.log('🔍 ALL ADDRESS COMPONENTS:');
        placeDetails.address_components.forEach((component, index) => {
          console.log(`  ${index}: [${component.types.join(', ')}] = "${component.long_name}" (short: "${component.short_name}")`);
        });
        
        // 新しいparseGooglePlaceResult関数を使用（日本語の表示住所を渡す）
        const parsedData = parseGooglePlaceResult(placeDetails);
        // fullAddressが空の場合は、元の日本語住所を使用
        if (!parsedData.fullAddress) {
          parsedData.fullAddress = displayAddress;
        }
        
        console.log('🏠 Enhanced street construction with new parser:', {
          originalStreet: parsedData.street,
          fullAddress: parsedData.fullAddress,
          countryCode: parsedData.countryCode,
          stateCode: parsedData.stateCode,
          cityName: parsedData.cityName,
          postalCode: parsedData.postalCode
        });

        console.log('✅ Final parsed English data:', parsedData);
        console.log('🚀 Calling onPlaceSelect with data:', JSON.stringify(parsedData, null, 2));
        console.log('📧 FullAddress value check:', {
          originalFormattedAddress: placeDetails.formatted_address,
          displayAddress: displayAddress,
          finalFullAddress: parsedData.fullAddress,
          isEmpty: !parsedData.fullAddress
        });
        onPlaceSelect(parsedData);
      }
    });
  }, [onChange, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (onInputChange) {
      onInputChange();
    }
  };

  return (
    <LoadScript 
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} 
      libraries={GOOGLE_MAPS_LIBRARIES} 
      language="ja" 
      region="JP"
    >
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{ 
          fields: ['place_id', 'formatted_address'],
          componentRestrictions: { country: ['jp', 'us', 'ca'] }
        }}
      >
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 text-base"
        />
      </Autocomplete>
    </LoadScript>
  );
} 