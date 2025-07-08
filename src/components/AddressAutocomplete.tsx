"use client"

import React, { useEffect } from 'react'
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete'
import { Input } from './ui/input'
import { X } from 'lucide-react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (address: string, lat?: number, lng?: number) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
  countryCode?: string // 国コードを指定して検索範囲を制限
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = '住所を入力してください',
  className = '',
  required = false,
  id,
  countryCode,
}: AddressAutocompleteProps) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: countryCode ? { country: countryCode.toLowerCase() } : undefined,
      language: 'ja', // 日本語で結果を返す
    },
    debounce: 300, // 300ms のデバウンス
  })

  // 外部からの値の変更を反映
  useEffect(() => {
    setValue(value, false)
  }, [value, setValue])

  // 入力値が変更されたとき
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange(newValue)
  }

  // 候補から選択したとき
  const handleSelect = async (description: string) => {
    setValue(description, false)
    clearSuggestions()
    onChange(description)

    // 選択された住所の詳細情報を取得
    try {
      const results = await getGeocode({ address: description })
      const { lat, lng } = await getLatLng(results[0])
      
      if (onAddressSelect) {
        onAddressSelect(description, lat, lng)
      }
    } catch (error) {
      console.error('Error getting geocode:', error)
      if (onAddressSelect) {
        onAddressSelect(description)
      }
    }
  }

  // クリアボタンクリック時
  const handleClear = () => {
    setValue('', false)
    clearSuggestions()
    onChange('')
  }

  // Google Maps APIが読み込まれていない場合は通常のInputを表示
  if (!ready) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        required={required}
      />
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          id={id}
          value={inputValue}
          onChange={handleInput}
          placeholder={placeholder}
          className={`${className} pr-8`}
          required={required}
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 住所候補のドロップダウン */}
      {status === "OK" && data.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
              description,
            } = suggestion

            return (
              <button
                key={place_id}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                onClick={() => handleSelect(description)}
              >
                <div className="font-medium">{main_text}</div>
                <div className="text-sm text-gray-500">{secondary_text}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
} 