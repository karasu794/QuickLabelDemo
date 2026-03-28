'use client'

import React, { useState } from 'react'
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

// DIAG: 決済ボタンのdisabled制御は isProcessing のみ。免責事項チェックによるdisabledは未連動。
// DIAG: data-test="confirm-button" 属性未付与。

interface SquarePaymentFormProps {
  amount: number // 決済金額（表示用）
  onTokenReceived?: (token: string) => void // トークン取得時のコールバック
  onPaymentError?: (error: string) => void // エラー時のコールバック
  locationId?: string // 任意: 明示指定があれば最優先
  disabled?: boolean // 同意未チェック等でボタン無効化
}

export default function SquarePaymentForm({ 
  amount, 
  onTokenReceived,
  onPaymentError,
  locationId: locationIdProp,
  disabled = false,
}: SquarePaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // 環境変数から設定値を取得
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APP_ID
  const locationId = locationIdProp ?? process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? process.env.SQUARE_LOCATION_ID

  // 環境変数の確認
  if (!applicationId) throw new Error('Squareの公開用アプリIDが未設定です。NEXT_PUBLIC_SQUARE_APP_ID を設定してください。')
  if (!locationId) throw new Error('SquareのロケーションIDが未設定です。props もしくは NEXT_PUBLIC_SQUARE_LOCATION_ID / SQUARE_LOCATION_ID を設定してください。')

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

  // デモ環境: Squareフォームの代わりにダミーカード情報を表示
  if (IS_DEMO) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* ダミーカード情報（変更不可） */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded font-mono">VISA</div>
              <span className="text-sm text-gray-500">Sandbox テストカード</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="text-xs text-gray-500 block mb-1">カード番号</label>
                <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-700 select-none">
                  4532 0150 0000 0000
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">有効期限</label>
                <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-700 select-none">
                  12/28
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">CVV</label>
                <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-700 select-none">
                  111
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">郵便番号</label>
                <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-700 select-none">
                  10000
                </div>
              </div>
            </div>
          </div>

          {/* 決済ボタン（デモ: トークンなしでコールバック） */}
          <button
            type="button"
            disabled={isProcessing || disabled}
            onClick={async () => {
              setIsProcessing(true)
              try {
                if (onTokenReceived) {
                  await onTokenReceived('demo-sandbox-token-' + Date.now())
                }
              } catch (e) {
                if (onPaymentError) onPaymentError(e instanceof Error ? e.message : 'デモ決済エラー')
              } finally {
                setIsProcessing(false)
              }
            }}
            className="w-full h-14 text-lg font-semibold bg-[#4D148C] hover:bg-[#3D0F6B] disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-3"
            data-test="confirm-ship"
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

        {/* セキュリティ情報 */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>🔒 Square社の安全で確実な決済システムを使用</p>
          <p>クレジットカード情報は弊社サーバーに保存されません</p>
        </div>
      </div>
    )
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
            disabled={isProcessing || disabled}
            className="w-full h-14 text-lg font-semibold bg-[#4D148C] hover:bg-[#3D0F6B] disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-3"
            data-test="confirm-ship"
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