'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        console.error('ログインエラー:', error.message)
        
        // エラーの種類に応じた処理
        if (error.message.includes('Invalid login credentials') ||
            error.message.includes('Email not confirmed')) {
          if (error.message.includes('Email not confirmed')) {
            setErrorMessage('メールアドレスが確認されていません。確認メールをご確認ください。')
          } else {
            setErrorMessage('メールアドレスまたはパスワードが正しくありません。')
          }
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('メールアドレスが確認されていません。確認メールをご確認ください。')
        } else if (error.message.includes('Invalid email')) {
          setErrorMessage('有効なメールアドレスを入力してください。')
        } else {
          setErrorMessage(`ログインエラー: ${error.message}`)
        }
      } else {
        console.log('ログイン成功:', data.user?.email)
        // ログイン成功時はアカウントページにリダイレクト
        router.push('/account')
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
      setErrorMessage('予期しないエラーが発生しました。しばらく後に再試行してください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui', 
      maxWidth: '500px', 
      margin: '0 auto',
      marginTop: '4rem'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>ログイン</h1>
      
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

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
          アカウントをお持ちでない方
        </p>
        <a 
          href="/signup" 
          style={{ 
            color: '#0070f3', 
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          新規登録はこちら
        </a>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block',
            padding: '0.5rem 1rem', 
            background: '#f8f9fa', 
            color: '#333', 
            textDecoration: 'none', 
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}
        >
          ← ホームに戻る
        </a>
      </div>
    </div>
  )
} 