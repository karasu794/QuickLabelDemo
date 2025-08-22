"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Loader2, AlertCircle, Save } from "lucide-react"
import type { CustomerInfoFormData, CustomerInfoFormProps } from "@/types/receipt"

// ローカルストレージのキー
const STORAGE_KEY = 'customer-info-form-data'

// バリデーションルール
interface ValidationErrors {
  name?: string
  companyName?: string
  address?: string
  phone?: string
}

export default function CustomerInfoForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: CustomerInfoFormProps) {
  const [formData, setFormData] = useState<CustomerInfoFormData>({
    name: '',
    companyName: '',
    address: '',
    phone: '',
    ...initialData
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  // コンポーネントマウント時にローカルストレージからデータを復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData) as CustomerInfoFormData
          setFormData(prev => ({
            ...prev,
            ...parsedData,
            // initialDataがある場合は優先
            ...initialData
          }))
        } catch (error) {
          console.error('保存されたフォームデータの読み込みに失敗:', error)
        }
      }
    }
  }, [initialData])

  // フォームデータの変更時にローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        setIsSaving(true)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
        setTimeout(() => setIsSaving(false), 500)
      }, 1000) // 1秒後に保存

      return () => clearTimeout(timeoutId)
    }
  }, [formData])

  // バリデーション関数
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // 名前は必須
    if (!formData.name.trim()) {
      newErrors.name = '名前は必須です'
    }

    // 電話番号の形式チェック（入力されている場合のみ）
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\d\-\(\)\+\s]+$/
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = '有効な電話番号を入力してください'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // フィールド変更ハンドラー
  const handleFieldChange = (field: keyof CustomerInfoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // エラーがある場合はクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // ローカルストレージをクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }

    onSubmit(formData)
  }

  // キャンセルハンドラー
  const handleCancel = () => {
    // ローカルストレージをクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    onCancel()
  }

  // エラーがあるかどうかをチェック
  const hasValidationErrors = Object.values(errors).some(error => error !== undefined)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          宛名情報の入力
        </CardTitle>
        <p className="text-sm text-gray-600">
          領収書に記載する宛名情報を入力してください。入力内容は自動的に保存されます。
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 名前フィールド */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              名前 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="山田太郎"
              disabled={isLoading}
              className={errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.name && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* 会社名フィールド */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
              会社名
            </Label>
            <Input
              id="companyName"
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              placeholder="株式会社サンプル"
              disabled={isLoading}
              className={errors.companyName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.companyName && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.companyName}</span>
              </div>
            )}
          </div>

          {/* 住所フィールド */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-gray-700">
              住所
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="東京都渋谷区..."
              disabled={isLoading}
              className={errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.address && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.address}</span>
              </div>
            )}
          </div>

          {/* 電話番号フィールド */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              電話番号
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="03-1234-5678"
              disabled={isLoading}
              className={errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.phone && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.phone}</span>
              </div>
            )}
          </div>

          {/* 自動保存インジケーター */}
          {isSaving && (
            <div className="flex items-center space-x-2 text-blue-600 text-sm">
              <Save className="h-4 w-4" />
              <span>自動保存中...</span>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              キャンセル
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || hasValidationErrors}
              className={`flex-1 ${
                isLoading || hasValidationErrors
                  ? 'bg-orange-300 cursor-not-allowed' 
                  : 'bg-orange-400 hover:bg-orange-500'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : hasValidationErrors ? (
                '入力エラーを修正してください'
              ) : (
                '領収書を生成'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}