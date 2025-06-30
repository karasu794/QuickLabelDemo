'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('') // エラーメッセージをクリア

    try {
      // Supabaseクライアントを使ってユーザー登録
      const { data, error } = await signUp(email, password)

      // デバッグ用：詳細ログ出力
      console.log('=== Signup Response Debug ===')
      console.log('Error:', error)
      console.log('Data:', data)
      console.log('User created:', data?.user)
      console.log('Session:', data?.session)
      console.log('===============================')

      if (error) {
        console.error('登録エラー:', error.message)
        console.error('エラー詳細:', error)
        
        // エラーの種類に応じた処理
        if (error.message.includes('User already registered') || 
            error.message.includes('already been registered') ||
            error.message.includes('already exists')) {
          // 登録済みメールアドレスの場合
          setErrorMessage('このメールアドレスは既に登録されています。ログインしてください。')
        } else if (error.message.includes('Password should be at least')) {
          // パスワード強度不足
          setErrorMessage('パスワードは6文字以上で設定してください。')
        } else if (error.message.includes('Invalid email')) {
          // 無効なメールアドレス
          setErrorMessage('有効なメールアドレスを入力してください。')
        } else if (error.message.includes('Database error saving new user')) {
          // データベースエラー（トリガー関連）
          setErrorMessage('システムエラーが発生しました。管理者にお問い合わせください。')
        } else {
          // その他のエラー
          setErrorMessage(`登録エラー: ${error.message}`)
        }
        return // エラー時は処理を終了
      }

      // エラーがない場合の処理
      if (data?.user) {
        // 新しいユーザーが作成された場合
        if (data.user.email_confirmed_at === null) {
          // メール確認が必要な新規ユーザー
          console.log('新規ユーザー登録成功 - 確認メールを送信しました')
          router.push('/?registration=success')
        } else {
          // 既に確認済みのユーザー（既存ユーザーの可能性）
          console.log('既存ユーザーまたは既に確認済みのユーザー')
          setErrorMessage('このメールアドレスは既に登録されています。ログインしてください。')
        }
      } else {
        // Supabaseの仕様により、セキュリティ上の理由で既存メールアドレスでも
        // エラーを返さない場合があります
        console.log('ユーザー作成なし - 既存メールアドレスの可能性')
        setErrorMessage('このメールアドレスは既に登録されている可能性があります。ログインをお試しください。')
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
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>新規登録</h1>
      
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
          {errorMessage.includes('既に登録されています') && (
            <div style={{ marginTop: '0.5rem' }}>
              <a 
                href="/login" 
                style={{ 
                  color: '#0070f3', 
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                → ログインページはこちら
              </a>
            </div>
          )}
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
            placeholder="6文字以上のパスワード"
            minLength={6}
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
          {isLoading ? '登録中...' : '登録する'}
        </button>
      </form>

      <div style={{ 
        marginTop: '2rem', 
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
          登録後、確認メールが送信されます。<br />
          メール内のリンクをクリックしてアカウントを有効化してください。
        </p>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
          既にアカウントをお持ちですか？
        </p>
        <a 
          href="/login" 
          style={{ 
            color: '#0070f3', 
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          ログインはこちら
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