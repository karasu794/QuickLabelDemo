'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface GooglePlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onInputChange?: () => void; // 新しいプロパティ：入力値変更時のコールバック
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [lastSelectedValue, setLastSelectedValue] = useState<string>(''); // 最後に選択された値を追跡
  const [isComposing, setIsComposing] = useState(false); // IME入力中かどうかを追跡

  // Google Maps APIが読み込まれているかチェック
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.places?.Autocomplete) {
        console.log('Google Maps API is ready');
        setIsGoogleLoaded(true);
      } else {
        console.log('Waiting for Google Maps API...');
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
  }, []);

  // Autocompleteを初期化
  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current) return;

    try {
      console.log('Initializing Google Places Autocomplete');
      
      // 郵便番号検索を改善するため、より幅広い検索タイプを設定
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: [] }, // 全世界対象
        fields: [
          'place_id',
          'formatted_address', 
          'name',
          'address_components',
          'geometry'
        ],
        types: ['geocode', 'establishment'] // geocodeと施設の両方を含める
      });

      // place_changedイベントリスナーを追加
      const placeChangedListener = () => {
        console.log('place_changed event fired, isComposing:', isComposing);
        
        // IME入力中の場合は処理を遅延
        if (isComposing) {
          console.log('IME composing, delaying place selection');
          return;
        }
        
        const place = autocomplete.getPlace();
        console.log('Selected place:', place);
        
        if (place.formatted_address) {
          const formattedAddress = place.formatted_address;
          onChange(formattedAddress);
          setLastSelectedValue(formattedAddress); // 選択された値を記録
          onPlaceSelect(place);
        } else if (place.name) {
          // formatted_addressがない場合はnameを使用
          onChange(place.name);
          setLastSelectedValue(place.name);
          onPlaceSelect(place);
        }
      };

      autocomplete.addListener('place_changed', placeChangedListener);

      // 追加のイベントリスナーで確実にキャッチ
      const inputElement = inputRef.current;
      
      // IME入力の状態を監視
      const handleCompositionStart = () => {
        console.log('IME composition started');
        setIsComposing(true);
      };
      
      const handleCompositionEnd = () => {
        console.log('IME composition ended');
        setIsComposing(false);
        
        // IME確定後に少し遅延してplace選択をチェック
        setTimeout(() => {
          const place = autocomplete.getPlace();
          if (place && (place.formatted_address || place.name)) {
            console.log('Place selection after IME composition:', place);
            placeChangedListener();
          }
        }, 300); // IME確定後の遅延
      };
      
      // キーボードでのEnter選択をキャッチ
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !isComposing) {
          // 少し遅延を入れてplace_changedが発火する時間を確保
          setTimeout(() => {
            const place = autocomplete.getPlace();
            if (place && (place.formatted_address || place.name)) {
              console.log('Enter key triggered place selection:', place);
              placeChangedListener();
            }
          }, 100);
        }
      };

      // Autocompleteドロップダウンのクリックイベントをキャッチするため
      // documentにクリックリスナーを追加
      const handleDocumentClick = (e: MouseEvent) => {
        // pac-itemクラスを持つ要素（予測候補）がクリックされた場合
        const target = e.target as HTMLElement;
        if (target.closest('.pac-item')) {
          console.log('Dropdown item clicked, isComposing:', isComposing);
          
          // IME入力中の場合はより長い遅延を設定
          const delay = isComposing ? 500 : 200;
          
          setTimeout(() => {
            const place = autocomplete.getPlace();
            if (place && (place.formatted_address || place.name)) {
              console.log('Dropdown item clicked - place selected:', place);
              placeChangedListener();
            }
          }, delay);
        }
      };

      // イベントリスナーを追加
      inputElement.addEventListener('compositionstart', handleCompositionStart);
      inputElement.addEventListener('compositionend', handleCompositionEnd);
      inputElement.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleDocumentClick);

      autocompleteRef.current = autocomplete;

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        inputElement.removeEventListener('compositionstart', handleCompositionStart);
        inputElement.removeEventListener('compositionend', handleCompositionEnd);
        inputElement.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('click', handleDocumentClick);
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isGoogleLoaded, onChange, onPlaceSelect, isComposing]);

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

  // valueが外部から変更された場合の処理
  useEffect(() => {
    if (value === '') {
      setLastSelectedValue('');
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-lg font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 text-base ${className}`}
        required={required}
        disabled={disabled || !isGoogleLoaded}
      />
      
      {!isGoogleLoaded && (
        <div className="text-sm text-gray-500">
          Google Maps APIを読み込んでいます...
        </div>
      )}
    </div>
  );
}

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is not configured');
      console.error('Google Maps API key is not configured');
      return;
    }

    // Google Maps APIが既に読み込まれているかチェック
    if (window.google?.maps?.places) {
      console.log('Google Maps API already loaded');
      setIsLoaded(true);
      return;
    }

    console.log('Loading Google Maps API...');

    // Google Maps API Scriptを動的に読み込み
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja&region=JP`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setError('Google Maps APIの読み込みに失敗しました');
    };

    // 重複読み込みを防ぐため、既存のスクリプトをチェック
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      document.head.appendChild(script);
    }

    return () => {
      // クリーンアップ時にスクリプトを削除
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Google Maps APIを読み込んでいます...</div>
      </div>
    );
  }

  return <>{children}</>;
} 