"use client"

import React, { useState } from 'react'
import CustomerInfoForm from '../CustomerInfoForm'
import type { CustomerInfoFormData } from '@/types/receipt'

/**
 * CustomerInfoForm使用例
 * 
 * このコンポーネントは、プロフィール情報が不足している場合に
 * 宛名情報を入力するためのフォームです。
 */
export default function CustomerInfoFormExample() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CustomerInfoFormData | null>(null)

  // 初期データの例（プロフィールから取得した情報）
  const initialData = {
    name: '山田太郎',
    companyName: '', // 不足している情報
    address: '', // 不足している情報
    phone: '03-1234-5678'
  }

  const handleSubmit = async (data: CustomerInfoFormData) => {
    setIsLoading(true)
    
    try {
      // ここで実際の領収書生成処理を行う
      console.log('領収書生成データ:', data)
      
      // 模擬的な処理時間
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setResult(data)
      alert('領収書が生成されました！')
    } catch (error) {
      console.error('領収書生成エラー:', error)
      alert('領収書の生成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    console.log('キャンセルされました')
    alert('キャンセルされました')
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">領収書生成完了</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">入力された情報:</h3>
          <ul className="space-y-1 text-green-700">
            <li><strong>名前:</strong> {result.name}</li>
            {result.companyName && <li><strong>会社名:</strong> {result.companyName}</li>}
            {result.address && <li><strong>住所:</strong> {result.address}</li>}
            {result.phone && <li><strong>電話番号:</strong> {result.phone}</li>}
          </ul>
        </div>
        <button
          onClick={() => setResult(null)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          もう一度試す
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">CustomerInfoForm 使用例</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">概要</h2>
        <p className="text-gray-600 mb-4">
          このフォームは、領収書生成時にプロフィール情報が不足している場合に、
          必要な宛名情報を入力するために使用されます。
        </p>
        
        <h3 className="text-lg font-semibold mb-2">主な機能:</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>必須フィールド（名前）のバリデーション</li>
          <li>電話番号の形式チェック</li>
          <li>入力内容の自動保存（localStorage）</li>
          <li>ローディング状態の表示</li>
          <li>エラーメッセージの表示</li>
        </ul>
      </div>

      <CustomerInfoForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}