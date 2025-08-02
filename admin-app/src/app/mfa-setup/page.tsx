'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
// import { useRouter, useSearchParams } from 'next/navigation' // TEMPORARY: Disabled
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Shield, QrCode, AlertCircle, CheckCircle, Copy, ArrowLeft } from 'lucide-react'

export default function MFASetupPage() {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const setupStartedRef = useRef(false)
  const { user, isAuthenticated, isAdmin, refreshMFAStatus } = useAuth()
  // const router = useRouter() // TEMPORARY: Disabled
  // const searchParams = useSearchParams() // TEMPORARY: Disabled

  useEffect(() => {
    // 認証チェック
    if (!isAuthenticated) {
      // router.replace('/login') // TEMPORARY: Disabled
      window.location.href = '/login' // TEMPORARY: Use native redirect
      return
    }
    
    if (!isAdmin) {
      // router.replace('/login') // TEMPORARY: Disabled
      window.location.href = '/login' // TEMPORARY: Use native redirect
      return
    }

    // 必須フラグをチェック
    // const required = searchParams.get('required') === 'true' // TEMPORARY: Disabled
    const required = false // TEMPORARY: Default value
    setIsRequired(required)

    // MFA設定を開始（重複実行防止）
    if (!setupStartedRef.current) {
      setupStartedRef.current = true
      setupMFA()
    }
  }, [isAuthenticated, isAdmin, router, searchParams])

  // MFA設定を開始する関数
  const setupMFA = async () => {
    try {
      console.log('🔐 Starting MFA setup...')
      setIsLoading(true)
      setError('')

      // まず既存のMFAファクターをチェック
      console.log('🔍 Checking existing MFA factors...')
      const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors()

      if (listError) {
        console.error('❌ Error listing MFA factors:', listError)
        setError('MFA設定の確認に失敗しました')
        setupStartedRef.current = false // リトライ可能にする
        return
      }

      console.log('📋 Existing factors:', existingFactors)
      console.log('📋 All factors array:', existingFactors?.all)
      console.log('📋 TOTP factors array:', existingFactors?.totp)

      // まず全てのファクターから未検証のTOTPファクターを探す
      let existingTotpFactor = null
      let verifiedTotpFactor = null

      // all配列から直接チェック（より確実）
      if (existingFactors?.all && existingFactors.all.length > 0) {
        for (const factor of existingFactors.all) {
          console.log('🔍 Checking factor:', {
            id: factor.id,
            factor_type: factor.factor_type,
            status: factor.status,
            friendly_name: factor.friendly_name
          })
          
          if (factor.factor_type === 'totp') {
            if (factor.status === 'unverified') {
              existingTotpFactor = factor
              console.log('♻️ Found existing unverified TOTP factor')
            } else if (factor.status === 'verified') {
              verifiedTotpFactor = factor
              console.log('✅ Found existing verified TOTP factor')
            }
          }
        }
      }

      // totp配列からもチェック（念のため）
      if (!existingTotpFactor && existingFactors?.totp?.length > 0) {
        existingTotpFactor = existingFactors.totp.find(factor =>
          factor.factor_type === 'totp' && factor.status === 'unverified'
        )
        if (existingTotpFactor) {
          console.log('♻️ Found unverified TOTP factor in totp array')
        }
      }

      if (!verifiedTotpFactor && existingFactors?.totp?.length > 0) {
        verifiedTotpFactor = existingFactors.totp.find(factor =>
          factor.factor_type === 'totp' && factor.status === 'verified'
        )
        if (verifiedTotpFactor) {
          console.log('✅ Found verified TOTP factor in totp array')
        }
      }

      // 既存の未検証TOTPファクターを再利用
      if (existingTotpFactor) {
        console.log('♻️ Using existing unverified TOTP factor:', existingTotpFactor.id)
        
        if (existingTotpFactor.totp?.qr_code && existingTotpFactor.totp?.secret) {
          console.log('✅ QR code and secret found in existing factor')
          setFactorId(existingTotpFactor.id)
          setQrCode(existingTotpFactor.totp.qr_code)
          setSecret(existingTotpFactor.totp.secret)
          return
        } else {
          console.log('⚠️ QR code or secret missing in existing factor, deleting and recreating')
          // 不完全なファクターを削除
          try {
            const { error: deleteError } = await supabase.auth.mfa.unenroll({ factorId: existingTotpFactor.id })
            if (deleteError) {
              console.error('❌ Factor deletion error:', deleteError)
              setError('既存のMFA設定の削除に失敗しました')
              setupStartedRef.current = false
              return
            } else {
              console.log('✅ Incomplete factor deleted successfully')
            }
          } catch (deleteErr) {
            console.error('❌ Factor deletion exception:', deleteErr)
            setError('既存のMFA設定の削除中にエラーが発生しました')
            setupStartedRef.current = false
            return
          }
        }
      }

      // 既存の検証済みファクターがある場合
      if (verifiedTotpFactor) {
        console.log('✅ MFA already configured for this user - redirecting to dashboard')
        
        // MFAステータスを更新
        await refreshMFAStatus()
        
        // 成功メッセージを表示してダッシュボードにリダイレクト
        console.log('🎉 MFA is already configured, redirecting to dashboard')
        // router.replace('/') // TEMPORARY: Disabled
        window.location.href = '/' // TEMPORARY: Use native redirect
        return
      }

      // 残りの問題のあるファクターがある場合は削除（非TOTPファクターのみ）
      if (existingFactors?.all && existingFactors.all.length > 0) {
        for (const factor of existingFactors.all) {
          // 削除対象：非TOTPファクターのみ（TOTPファクターは上で処理済み）
          if (factor.factor_type !== 'totp') {
            console.log('🗑️ Removing non-TOTP factor:', {
              id: factor.id,
              type: factor.factor_type,
              name: factor.friendly_name,
              status: factor.status
            })
            try {
              const { error: deleteError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
              if (deleteError) {
                console.error('❌ Factor deletion error:', deleteError)
              } else {
                console.log('✅ Non-TOTP factor deleted successfully')
              }
            } catch (deleteErr) {
              console.error('❌ Factor deletion exception:', deleteErr)
            }
          }
        }
      }

      // 新しいTOTPファクターを作成
      console.log('🆕 Creating new TOTP factor...')
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'QuickLabel Admin'
      })

      if (error) {
        console.error('❌ MFA enrollment error:', error)
        setError(`MFA設定の開始に失敗しました: ${error.message}`)
        setupStartedRef.current = false // リトライ可能にする
        return
      }

      console.log('✅ MFA enrollment started:', data)
      
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)

    } catch (error) {
      console.error('❌ MFA setup error:', error)
      setError('MFA設定の処理中にエラーが発生しました')
      setupStartedRef.current = false // リトライ可能にする
    } finally {
      setIsLoading(false)
    }
  }

  // MFAチャレンジを作成する関数
  const createChallenge = async () => {
    try {
      console.log('🎯 Creating MFA challenge for factor:', factorId)
      const { data, error } = await supabase.auth.mfa.challenge({ factorId })

      if (error) {
        console.error('❌ Challenge creation error:', error)
        setError('チャレンジの作成に失敗しました')
        return false
      }

      console.log('✅ Challenge created:', data)
      setChallengeId(data.id)
      return true
    } catch (error) {
      console.error('❌ Challenge creation error:', error)
      setError('チャレンジの作成中にエラーが発生しました')
      return false
    }
  }

  // シークレットキーをコピー
  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      // 簡単な成功表示のためのアラート（本番では別のUIにすることを推奨）
      alert('シークレットキーをクリップボードにコピーしました')
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  // 次のステップに進む
  const goToVerification = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // チャレンジを作成
      const challengeCreated = await createChallenge()
      
      if (!challengeCreated) {
        setIsLoading(false)
        return
      }
      
      setStep('verify')
      
      // 最初の入力欄にフォーカス
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    } catch (error) {
      console.error('❌ Error proceeding to verification:', error)
      setError('認証準備中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 前のステップに戻る
  const goToSetup = () => {
    setStep('setup')
    setCode(['', '', '', '', '', ''])
    setError('')
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

  // MFA設定を完了
  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    
    if (codeToVerify.length !== 6) {
      setError('6桁のコードを入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 Verifying MFA setup...')
      console.log('📋 Factor ID:', factorId)
      console.log('🎯 Challenge ID:', challengeId)
      console.log('🔢 Code:', codeToVerify)
      
      // Challenge IDの確認
      if (!challengeId) {
        console.error('❌ Challenge ID not found')
        setError('認証の準備ができていません。最初からやり直してください。')
        setStep('setup')
        return
      }

      // MFAコードを検証してファクターを有効化
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId, // 正しいchallenge IDを使用
        code: codeToVerify
      })

      if (error) {
        console.error('❌ MFA verification error:', error)
        setError('認証コードが正しくありません。認証アプリで最新のコードを確認してください。')
        setCode(['', '', '', '', '', '']) // コードをクリア
        inputRefs.current[0]?.focus()
        return
      }

      console.log('✅ MFA setup completed successfully')
      
      // MFAステータスを更新
      await refreshMFAStatus()
      
      // 成功時はダッシュボードにリダイレクト
      // router.replace('/') // TEMPORARY: Disabled
      window.location.href = '/' // TEMPORARY: Use native redirect

    } catch (error) {
      console.error('❌ MFA verification error:', error)
      setError('認証コードの検証中にエラーが発生しました')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // ログアウト処理（必須でない場合のみ表示）
  const handleSignOut = async () => {
    if (isRequired) return // 必須の場合はログアウトできない
    
    try {
      await supabase.auth.signOut()
      // router.replace('/login') // TEMPORARY: Disabled
      window.location.href = '/login' // TEMPORARY: Use native redirect
    } catch (error) {
      console.error('Sign out error:', error)
    }
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
          <h2 className="text-3xl font-bold text-gray-900">二要素認証設定</h2>
          <p className="mt-2 text-gray-600">
            {isRequired ? '管理者は二要素認証の設定が必須です' : 'セキュリティを強化するために二要素認証を設定します'}
          </p>
        </div>

        {/* 必須の場合の警告 */}
        {isRequired && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <p className="text-orange-700 text-sm font-medium">
                管理者アカウントにはMFAの設定が必須です。設定を完了するまで管理画面にアクセスできません。
              </p>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-6">
            {/* QRコード表示 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                ステップ1: QRコードをスキャン
              </h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : qrCode ? (
                <div className="text-center">
                  <div className="flex justify-center items-center mb-4">
                    <div 
                      className="bg-white p-4 rounded-lg border inline-block"
                      style={{ textAlign: 'center' }}
                      dangerouslySetInnerHTML={{ __html: qrCode }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                    認証アプリでこのQRコードをスキャンしてください
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  QRコードの生成に失敗しました
                </div>
              )}
            </div>

            {/* シークレットキー */}
            {secret && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  手動設定用シークレットキー
                </h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs font-mono bg-white p-2 rounded border break-all">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="コピー"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  QRコードがスキャンできない場合は、このキーを手動で入力してください
                </p>
              </div>
            )}

            {/* アプリ推奨 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">📱 推奨認証アプリ</h3>
              <ul className="text-blue-800 text-xs space-y-1">
                <li>• Google Authenticator</li>
                <li>• Microsoft Authenticator</li>
                <li>• Authy</li>
                <li>• 1Password</li>
              </ul>
            </div>

            {/* 次のステップボタン */}
            <button
              onClick={goToVerification}
              disabled={isLoading || !qrCode}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              次のステップ: 認証コード入力
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            {/* 認証コード入力 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ステップ2: 認証コード入力
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  認証アプリに表示された6桁のコードを入力してください
                </label>
                <div className="flex justify-center space-x-2 mb-4">
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
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* 確認ボタン */}
              <button
                onClick={() => handleVerify()}
                disabled={isLoading || code.some(digit => digit === '')}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    設定中...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    MFA設定を完了
                  </>
                )}
              </button>
            </div>

            {/* 戻るボタン */}
            <button
              onClick={goToSetup}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              前のステップに戻る
            </button>
          </div>
        )}

        {/* ログアウトボタン（必須でない場合のみ） */}
        {!isRequired && (
          <div className="text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  )
}