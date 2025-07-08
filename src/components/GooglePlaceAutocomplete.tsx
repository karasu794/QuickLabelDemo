'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface GooglePlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onInputChange?: () => void; // 入力値変更時のコールバック
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface PlaceComponentType {
  country?: string;
  administrative_area_level_1?: string; // 州・県
  locality?: string; // 市区町村
  sublocality_level_1?: string; // 区・町・村
  postal_code?: string;
  route?: string; // 通り名
  street_number?: string; // 番地
}

export function parseGooglePlaceResult(place: google.maps.places.PlaceResult) {
  const components: PlaceComponentType = {};
  
  if (place.address_components) {
    place.address_components.forEach(component => {
      const types = component.types;
      
      if (types.includes('country')) {
        components.country = component.short_name;
      }
      if (types.includes('administrative_area_level_1')) {
        components.administrative_area_level_1 = component.short_name;
      }
      if (types.includes('locality')) {
        components.locality = component.long_name;
      }
      if (types.includes('sublocality_level_1')) {
        components.sublocality_level_1 = component.long_name;
      }
      if (types.includes('postal_code')) {
        components.postal_code = component.long_name;
      }
      if (types.includes('route')) {
        components.route = component.long_name;
      }
      if (types.includes('street_number')) {
        components.street_number = component.long_name;
      }
    });
  }

  return {
    placeId: place.place_id,
    formattedAddress: place.formatted_address,
    name: place.name,
    components,
    geometry: place.geometry
  };
}

export function GooglePlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onInputChange,
  placeholder = "国、郵便番号、または住所を入力",
  label,
  required = false,
  disabled = false,
  className = ""
}: GooglePlaceAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [lastSelectedValue, setLastSelectedValue] = useState<string>(''); // 最後に選択された値を追跡

  // Autocompleteインスタンスがロードされた時にrefに保存
  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    console.log('Autocomplete loaded and stored in ref');
    autocompleteRef.current = autocomplete;
  }, []);

  // 場所が変更された時の処理
  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      console.log('onPlaceChanged triggered');
      
      // Autocompleteインスタンスから選択された場所を取得
      const place = autocompleteRef.current.getPlace();
      console.log('Selected place from ref:', place);
      
      if (place && (place.formatted_address || place.name)) {
        // 表示用のテキストを決定
        const displayText = place.formatted_address || place.name || '';
        
        console.log('Updating input text to:', displayText);
        
        // 入力欄のテキストを更新
        onChange(displayText);
        
        // 最後に選択された値を記録
        setLastSelectedValue(displayText);
        
        // 親コンポーネントの更新関数を呼び出して全ての関連stateを一度に更新
        onPlaceSelect(place);
        
        console.log('All state updates completed in single call');
      } else {
        console.warn('Place object is missing formatted_address and name');
      }
    } else {
      console.error('Autocomplete ref is null in onPlaceChanged');
    }
  }, [onChange, onPlaceSelect]);

  // 入力値の変更をハンドル
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // 入力値が最後に選択された値と異なる場合、選択状態をリセット
    if (newValue !== lastSelectedValue && onInputChange) {
      console.log('Input changed from selected value, resetting selection');
      onInputChange();
    }
  }, [onChange, onInputChange, lastSelectedValue]);

  // Autocompleteコンポーネントのアンマウント時のクリーンアップ
  const onUnmount = useCallback(() => {
    console.log('Autocomplete unmounted, clearing ref');
    autocompleteRef.current = null;
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-lg font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        onUnmount={onUnmount}
        options={{
          componentRestrictions: { country: [] }, // 全世界対象
          fields: [
            'place_id',
            'formatted_address', 
            'name',
            'address_components',
            'geometry'
          ],
          types: ['geocode', 'establishment'] // geocodeと施設の両方を含める
        }}
      >
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 text-base ${className}`}
          required={required}
          disabled={disabled}
        />
      </Autocomplete>
    </div>
  );
}

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is not configured');
    return <div className="text-red-500">Google Maps API key is not configured</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={['places']}
      language="ja"
      region="JP"
      loadingElement={
        <div className="flex items-center justify-center p-4">
          <div className="text-gray-600">Google Maps APIを読み込んでいます...</div>
        </div>
      }
    >
      {children}
    </LoadScript>
  );
} 