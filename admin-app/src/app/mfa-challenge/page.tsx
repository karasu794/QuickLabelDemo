'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Shield, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'

export default function MFAChallengePage() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { user, isAuthenticated, isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 認証されていない、または管理者でない場合はログインページへ
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    
    if (!isAdmin) {
      router.replace('/login')
      return
    }

    // MFAチャレンジを開始
    startMFAChallenge()
  }, [isAuthenticated, isAdmin, router])

  // MFAチャレンジを開始する関数
  const startMFAChallenge = async () => {
    try {
      console.log('🔐 Starting MFA challenge...')
      
      // TOTPファクターを取得
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find(factor => 
        factor.factor_type === 'totp' && factor.status === 'verified'
      )

      if (!totpFactor) {
        console.error('❌ No verified TOTP factor found')
        router.replace('/mfa-setup?required=true')
        return
      }

      setFactorId(totpFactor.id)

      // チャレンジを開始
      const { data: challenge, error } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      })

      if (error) {
        console.error('❌ MFA challenge start error:', error)
        setError('認証チャレンジの開始に失敗しました')
        return
      }

      setChallengeId(challenge.id)
      console.log('✅ MFA challenge started:', challenge.id)

    } catch (error) {
      console.error('❌ MFA challenge error:', error)
      setError('認証チャレンジの処理中にエラーが発生しました')
    }
  }

  // コード入力処理
  const handleCodeChange = (index: number, value: string) => {
    // 数字のみ許可
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value

    setCode(newCode)
    setError('') // エラークリア

    // 次の入力欄にフォーカス
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // 6桁揃ったら自動的に認証
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''))
    }
  }

  // キー入力処理
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // 認証コード検証
  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    
    if (codeToVerify.length !== 6) {
      setError('6桁のコードを入力してください')
      return
    }

    if (!challengeId || !factorId) {
      setError('認証チャレンジが初期化されていません')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 Verifying MFA code...')

      // MFAコードを検証
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: codeToVerify
      })

      if (error) {
        console.error('❌ MFA verification error:', error)
        setError('認証コードが正しくありません')
        setCode(['', '', '', '', '', '']) // コードをクリア
        inputRefs.current[0]?.focus()
        return
      }

      console.log('✅ MFA verification successful')
      
      // 成功時はダッシュボードにリダイレクト
      router.replace('/')

    } catch (error) {
      console.error('❌ MFA verification error:', error)
      setError('認証コードの検証中にエラーが発生しました')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // ログアウト処理
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // 新しいコードを再送信
  const handleResendCode = async () => {
    await startMFAChallenge()
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  if (!isAuthenticated || !isAdmin) {
    return null // リダイレクト処理中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">二要素認証</h2>
          <p className="mt-2 text-gray-600">
            認証アプリの6桁コードを入力してください
          </p>
        </div>

        {/* MFAコード入力 */}
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              認証コード
            </label>
            <div className="flex justify-center space-x-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading}
                  className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* 認証ボタン */}
          <div>
            <button
              onClick={() => handleVerify()}
              disabled={isLoading || code.some(digit => digit === '')}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  認証中...
                </div>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  認証
                </>
              )}
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between text-sm">
            <button
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              ログアウト
            </button>
            <button
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-purple-600 hover:text-purple-800 disabled:text-gray-400"
            >
              新しいコードを要求
            </button>
          </div>

          {/* 説明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">💡 ヒント</h3>
            <ul className="text-blue-800 text-xs space-y-1">
              <li>• Google Authenticator、Authy等の認証アプリを開いてください</li>
              <li>• QuickLabel Admin用の6桁コードを確認してください</li>
              <li>• コードは30秒ごとに更新されます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}