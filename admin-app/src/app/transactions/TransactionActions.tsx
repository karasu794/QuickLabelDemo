'use client'

import { useState } from 'react'

// コピーボタンコンポーネント
interface CopyButtonProps {
  text: string
  label?: string
  className?: string
}

export function CopyButton({ text, label = 'コピー', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('コピーに失敗:', error)
      // フォールバック: 古いブラウザ対応
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        console.error('フォールバックコピーも失敗:', fallbackError)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <button
      onClick={copyToClipboard}
      className={`text-gray-400 hover:text-gray-600 transition-colors ${className}`}
      title={copied ? 'コピー済み!' : label}
      disabled={copied}
    >
      {copied ? (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

// 追跡番号表示コンポーネント
interface TrackingNumberProps {
  trackingNumber: string
}

export function TrackingNumber({ trackingNumber }: TrackingNumberProps) {
  return (
    <div className="flex items-center">
      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
        {trackingNumber}
      </code>
      <CopyButton text={trackingNumber} className="ml-2" />
    </div>
  )
}

// 決済IDボタンコンポーネント
interface PaymentIdButtonProps {
  paymentId: string
}

export function PaymentIdButton({ paymentId }: PaymentIdButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyPaymentId = async () => {
    try {
      await navigator.clipboard.writeText(paymentId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('決済IDのコピーに失敗:', error)
    }
  }

  return (
    <button
      onClick={copyPaymentId}
      className="text-purple-600 hover:text-purple-900 transition-colors"
      title={copied ? 'コピー済み!' : '決済IDをコピー'}
    >
      {copied ? 'コピー済み' : '決済ID'}
    </button>
  )
}

// エラー時の再読み込みコンポーネント
interface RefreshButtonProps {
  onRefresh: () => void
  loading?: boolean
}

export function RefreshButton({ onRefresh, loading = false }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-800 mr-2"></div>
          読み込み中...
        </span>
      ) : (
        '再読み込み'
      )}
    </button>
  )
} 