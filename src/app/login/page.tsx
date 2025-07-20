import { Suspense } from 'react'
import LoginForm from './LoginForm'

function LoginFallback() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p style={{ color: '#666' }}>ログインフォームを読み込み中...</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui', 
      maxWidth: '500px', 
      margin: '0 auto',
      marginTop: '4rem'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>ログイン</h1>
      
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>

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