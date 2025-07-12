'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Search, Check, AlertCircle } from 'lucide-react'

// HSコード候補の型定義
interface HSCodeSuggestion {
  code: string
  description: string
}

interface HSCodeAutocompleteProps {
  // 現在の品名
  description: string
  // 現在のHSコード
  hsCode: string
  // 仕向地の国コード
  destinationCountryCode: string
  // 品名変更時のコールバック
  onDescriptionChange: (description: string) => void
  // HSコード変更時のコールバック
  onHSCodeChange: (hsCode: string) => void
  // ラベル
  label?: string
  // プレースホルダー
  placeholder?: string
  // 必須項目かどうか
  required?: boolean
  // 無効化フラグ
  disabled?: boolean
}

export default function HSCodeAutocomplete({
  description,
  hsCode,
  destinationCountryCode,
  onDescriptionChange,
  onHSCodeChange,
  label = '品名・説明',
  placeholder = '例：コットンTシャツ、電子機器、書籍など',
  required = false,
  disabled = false
}: HSCodeAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<HSCodeSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  // デバウンス用のタイマー
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // HSコード検索関数
  const searchHSCodes = async (searchText: string) => {
    if (!searchText || searchText.length < 2 || !destinationCountryCode) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/shipments/hs-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchText: searchText,
          destinationCountryCode: destinationCountryCode
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'HSコード検索に失敗しました')
      }

      const suggestions: HSCodeSuggestion[] = await response.json()
      setSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
      setSelectedIndex(-1)

    } catch (error) {
      console.error('HSコード検索エラー:', error)
      setError(error instanceof Error ? error.message : 'HSコード検索に失敗しました')
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 品名変更時の処理（デバウンス付き）
  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(value)

    // 既存のタイマーをクリア
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // 新しいタイマーを設定（500ms後に検索実行）
    debounceTimer.current = setTimeout(() => {
      searchHSCodes(value)
    }, 500)
  }

  // HSコード候補選択時の処理
  const handleSuggestionSelect = (suggestion: HSCodeSuggestion) => {
    onHSCodeChange(suggestion.code)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setError(null)
    
    // フォーカスを品名入力に戻す
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // キーボード操作の処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // 外部クリック時の処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return (
    <div className="space-y-2 relative">
      {/* 品名入力フィールド */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="w-full min-h-[80px] p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          {isLoading && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && description.length >= 2 && (
            <div className="absolute right-3 top-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* HSコード候補リスト */}
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="relative">
          <Card className="absolute z-50 w-full max-h-60 overflow-y-auto border border-gray-200 shadow-lg">
            <CardContent className="p-0">
              <div className="p-2 bg-gray-50 border-b">
                <p className="text-xs text-gray-600 flex items-center">
                  <Search className="h-3 w-3 mr-1" />
                  HSコード候補 ({suggestions.length}件)
                </p>
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.code}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                    selectedIndex === index ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {suggestion.code}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                    {selectedIndex === index && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* HSコード入力フィールド */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          HSコード
        </label>
        <Input
          type="text"
          value={hsCode}
          onChange={(e) => onHSCodeChange(e.target.value)}
          placeholder="例：6109.10.00"
          disabled={disabled}
          className="font-mono"
        />
        <p className="text-xs text-gray-500">
          品名を入力すると自動で候補が表示されます。不明な場合は空欄でも構いません。
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 検索結果なしの表示 */}
      {!isLoading && description.length >= 2 && suggestions.length === 0 && !error && (
        <div className="text-xs text-gray-500">
          「{description}」に関するHSコードが見つかりませんでした。手動でHSコードを入力してください。
        </div>
      )}
    </div>
  )
} 