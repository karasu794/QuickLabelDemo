// src/app/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import QuoteFormComponent, { Package, QuoteParams } from '@/components/QuoteFormComponent'
import QuoteResultsComponent, { Rate } from '@/components/QuoteResultsComponent'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'
import AddressAutocomplete from '@/components/AddressAutocomplete'

export default function HomePage() {
  // ユーザー認証関連の状態
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // ===== 1. 状態管理 =====
  // 見積もりパラメータの状態管理
  const [quoteParams, setQuoteParams] = useState<QuoteParams>({
    originCountry: "JP",
    originPostalCode: "",
    destinationCountry: "US",
    destinationPostalCode: "",
    shipDate: "",
    isResidential: false,
    higherInsurance: false
  })

  // 荷物情報の状態管理
  const [packages, setPackages] = useState<Package[]>([{ 
    id: 1, 
    packagingType: "",
    weight: "", 
    length: "", 
    width: "", 
    height: "" 
  }])

  // API関連の状態管理
  const [isLoading, setIsLoading] = useState(false)
  const [rates, setRates] = useState<Rate[]>([])
  const [error, setError] = useState<string>("")

  // 料金選択関連の状態管理
  const [selectedRateId, setSelectedRateId] = useState<string>("")
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null)

  // ユーザーデータの初期化
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('ユーザーデータ読み込み開始')
        const { user } = await getCurrentUser()
        console.log('取得したユーザー:', user ? 'ログイン済み' : '未ログイン')
        setUser(user)
        
        if (user) {
          console.log('プロフィール情報取得開始')
          const { profile } = await getUserProfile(user.id)
          console.log('取得したプロフィール:', profile ? '存在' : '未作成')
          setProfile(profile)
        }
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error)
        // エラーが発生してもアプリケーションを継続
        setUser(null)
        setProfile(null)
      } finally {
        console.log('ユーザーデータ読み込み完了')
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  // ===== 2. イベントハンドラ =====
  // 見積もりパラメータの更新
  const handleInputChange = (field: keyof QuoteParams, value: string | boolean) => {
    setQuoteParams(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 荷物情報の更新
  const handlePackageChange = (id: number, field: keyof Package, value: string) => {
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === id ? { ...pkg, [field]: value } : pkg
      )
    )
  }

  // 荷物の追加
  const addPackage = () => {
    const newId = Math.max(...packages.map(p => p.id)) + 1
    setPackages(prev => [...prev, { 
      id: newId, 
      packagingType: "",
      weight: "", 
      length: "", 
      width: "", 
      height: "" 
    }])
  }

  // 荷物の削除
  const removePackage = (id: number) => {
    if (packages.length > 1) {
      setPackages(prev => prev.filter(p => p.id !== id))
    }
  }

  // ===== 3. AddressAutocompleteコンポーネントの作成 =====
  
  // 出荷地の住所入力
  const originAutocompleteElement = (
    <AddressAutocomplete
      value={quoteParams.originPostalCode}
      onChange={(value) => handleInputChange('originPostalCode', value)}
      placeholder="例: 東京都渋谷区渋谷1-1-1"
      className="h-12 text-base"
      countryCode={quoteParams.originCountry}
      onAddressSelect={(address) => {
        console.log('出荷地住所選択:', address)
      }}
    />
  )

  // 仕向地の住所入力
  const destinationAutocompleteElement = (
    <AddressAutocomplete
      value={quoteParams.destinationPostalCode}
      onChange={(value) => handleInputChange('destinationPostalCode', value)}
      placeholder="例: 123 Main St, New York, NY"
      className="h-12 text-base"
      countryCode={quoteParams.destinationCountry}
      onAddressSelect={(address) => {
        console.log('仕向地住所選択:', address)
      }}
    />
  )

  // ===== 4. API処理 =====

  // 見積もり取得
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            country: quoteParams.originCountry,
            postalCode: quoteParams.originPostalCode,
          },
          destination: {
            country: quoteParams.destinationCountry,
            postalCode: quoteParams.destinationPostalCode,
          },
          shipDate: quoteParams.shipDate,
          isResidential: quoteParams.isResidential,
          higherInsurance: quoteParams.higherInsurance,
          packages: packages.map(pkg => ({
            packagingType: pkg.packagingType,
            weight: Number.parseFloat(pkg.weight) || 0,
            length: Number.parseFloat(pkg.length) || 0,
            width: Number.parseFloat(pkg.width) || 0,
            height: Number.parseFloat(pkg.height) || 0,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('見積もり取得に失敗しました')
      }

      const data = await response.json()
      setRates(data.rates)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 料金選択
  const handleRateSelect = (rate: Rate) => {
    setSelectedRateId(rate.serviceId)
  }

  // 次のステップへ
  const handleContinue = () => {
    console.log("選択された料金:", selectedRateId)
    // 次のステップの処理をここに追加
  }

  // ===== 5. レンダリング =====

  return (
    <div className="min-h-screen bg-gray-100">
      {rates.length === 0 ? (
        <QuoteFormComponent
          quoteParams={quoteParams}
          packages={packages}
          isLoading={isLoading}
          error={error}
          onQuoteParamsChange={handleInputChange}
          onPackageChange={handlePackageChange}
          onAddPackage={addPackage}
          onRemovePackage={removePackage}
          onSubmit={handleSubmit}
          originAutocomplete={originAutocompleteElement}
          destinationAutocomplete={destinationAutocompleteElement}
        />
      ) : (
        <QuoteResultsComponent
          rates={rates}
          selectedRateId={selectedRateId}
          onRateSelect={handleRateSelect}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}