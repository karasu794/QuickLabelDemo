'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [persistSession, setPersistSession] = useState(true) // 新機能：ログイン状態保持フラグ
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

  const fillDemo = (type: 'user' | 'admin') => {
    if (type === 'user') {
      setEmail(process.env.NEXT_PUBLIC_DEMO_USER_EMAIL ?? '')
      setPassword(process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD ?? '')
    } else {
      setEmail(process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? '')
      setPassword(process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? '')
    }
    setErrorMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      console.log('🔐 ログイン試行:', { email })
      // SSR Cookie を確立するため Route Handler 経由でサインイン
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email, password })
      })
      const ok = res.ok
      const payload = ok ? await res.json() : await res.json().catch(() => ({ error: 'sign-in failed' }))

      if (!ok) {
        const errMsg = String(payload?.error || 'ログインに失敗しました')
        console.error('ログインエラー:', errMsg)

        // エラーの種類に応じた処理（文字列マッチ）
        if (/Email not confirmed/i.test(errMsg)) {
          setErrorMessage('メールアドレスが確認されていません。確認メールをご確認ください。')
        } else if (/Invalid login credentials/i.test(errMsg)) {
          setErrorMessage('メールアドレスまたはパスワードが正しくありません。')
        } else if (/Invalid email/i.test(errMsg)) {
          setErrorMessage('有効なメールアドレスを入力してください。')
        } else {
          setErrorMessage(`ログインエラー: ${errMsg}`)
        }
      } else {
        console.log('✅ ログイン成功:', { email })
        // クライアント側の Supabase セッションも同期（ヘッダー用）
        try {
          const access_token = payload?.access_token
          const refresh_token = payload?.refresh_token
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
          }
        } catch (e) {
          console.warn('client setSession failed (will rely on SSR cookie only):', e)
        }
        // ログイン成功時は元のページまたはトップページに遷移し、即時サーバ再評価
        const redirectTo = searchParams.get('redirect_to')
        const nextUrl = redirectTo ? decodeURIComponent(redirectTo) : '/'
        router.replace(nextUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
      setErrorMessage('予期しないエラーが発生しました。しばらく後に再試行してください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* エラーメッセージ表示 */}
      {errorMessage && (
        <div style={{ 
          background: '#f8d7da', 
          padding: '1rem', 
          borderRadius: '8px', 
          border: '1px solid #f5c6cb',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: '0', color: '#721c24', fontSize: '0.9rem' }}>
            <strong>❌ {errorMessage}</strong>
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* デモ環境: クイック入力ボタン */}
        {IS_DEMO && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            marginBottom: '0.5rem',
          }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#92400e', fontWeight: 'bold' }}>
              🎯 デモ用クイック入力
            </p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#a16207' }}>
              ボタンを押すとメールアドレスとパスワードが自動入力されます。その後「ログイン」を押してください。
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fillDemo('user')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: '#1e40af',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                👤 デモユーザー入力
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: '#7c2d12',
                  backgroundColor: '#fed7aa',
                  border: '1px solid #fdba74',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🔧 デモ管理者入力
              </button>
            </div>
          </div>
        )}
        <div>
          <label 
            htmlFor="email" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrorMessage('') // 入力時にエラーメッセージをクリア
            }}
            required
            placeholder="example@email.com"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label 
            htmlFor="password" 
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrorMessage('') // 入力時にエラーメッセージをクリア
            }}
            required
            placeholder="パスワード"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* ログイン状態保持チェックボックス */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '0.5rem 0'
        }}>
          <input
            id="persistSession"
            type="checkbox"
            checked={persistSession}
            onChange={(e) => setPersistSession(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }}
          />
          <label 
            htmlFor="persistSession" 
            style={{ 
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: '#374151',
              userSelect: 'none'
            }}
          >
            ログイン状態を保持する
          </label>
        </div>

        {/* 説明テキスト */}
        <div style={{
          fontSize: '0.8rem',
          color: '#6b7280',
          marginTop: '-0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        }}>
          {persistSession ? (
            <>
              <strong>🔒 ログイン状態を保持:</strong> ブラウザを閉じても次回自動的にログインされます
            </>
          ) : (
            <>
              <strong>🚪 一時的なログイン:</strong> ブラウザを閉じるとログアウトされます
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          style={{
            padding: '0.75rem',
            backgroundColor: isLoading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '1rem'
          }}
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </>
  )
} 