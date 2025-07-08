'use client'

import React, { useState } from 'react'
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk'

interface SquarePaymentFormProps {
  amount: number // 決済金額（表示用）
  onTokenReceived?: (token: string) => void // トークン取得時のコールバック
  onPaymentError?: (error: string) => void // エラー時のコールバック
}

export default function SquarePaymentForm({ 
  amount, 
  onTokenReceived,
  onPaymentError 
}: SquarePaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // 環境変数から設定値を取得
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

  // 環境変数の確認
  if (!applicationId || !locationId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">
          Square設定が不完全です。NEXT_PUBLIC_SQUARE_APPLICATION_IDとNEXT_PUBLIC_SQUARE_LOCATION_IDを設定してください。
        </p>
      </div>
    )
  }

  // カード情報がトークン化された際の処理
  const cardTokenizeResponseReceived = async (token: any, buyer: any) => {
    console.log('Received token:', token)
    console.log('Buyer info:', buyer)
    
    setIsProcessing(true)
    
    try {
      // トークンをコールバックで返す（決済処理はバックエンドで実行）
      if (onTokenReceived && token.token) {
        await onTokenReceived(token.token)
      }
      
    } catch (error) {
      console.error('Token processing failed:', error)
      
      // エラー時のコールバック
      if (onPaymentError) {
        onPaymentError(error instanceof Error ? error.message : 'トークン処理に失敗しました')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PaymentForm
        applicationId={applicationId}
        locationId={locationId}
        cardTokenizeResponseReceived={cardTokenizeResponseReceived}
      >
        <div className="space-y-4">
          {/* Square決済フォーム */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <CreditCard />
          </div>
          
          {/* 決済ボタン */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full h-14 text-lg font-semibold bg-[#4D148C] hover:bg-[#3D0F6B] disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                処理中...
              </>
            ) : (
              '決済して送り状を作成する'
            )}
          </button>
          
          {/* 決済金額表示 */}
          <div className="text-center text-sm text-gray-600">
            決済金額: <span className="font-semibold text-[#4D148C]">¥{amount.toLocaleString()}</span>
          </div>
        </div>
      </PaymentForm>
      
      {/* セキュリティ情報 */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>🔒 Square社の安全で確実な決済システムを使用</p>
        <p>クレジットカード情報は弊社サーバーに保存されません</p>
      </div>
    </div>
  )
} 