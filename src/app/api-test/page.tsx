'use client'

import { useState } from 'react'

export default function ApiTestPage() {
  const [formData, setFormData] = useState({
    senderPostalCode: '',
    senderCountryCode: 'JP',
    recipientPostalCode: '',
    recipientCountryCode: 'US',
    weight: ''
  })
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResponse(null)

    try {
      const requestBody = {
        sender: {
          postalCode: formData.senderPostalCode,
          countryCode: formData.senderCountryCode
        },
        recipient: {
          postalCode: formData.recipientPostalCode,
          countryCode: formData.recipientCountryCode
        },
        package: {
          weight: parseFloat(formData.weight)
        }
      }

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await res.json()
      setResponse(data)

      if (!res.ok) {
        setError(`エラー: ${data.error || 'APIリクエストが失敗しました'}`)
      }
    } catch (error) {
      console.error('APIテストエラー:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui', 
      maxWidth: '800px', 
      margin: '0 auto' 
    }}>
      <h1>配送見積もりAPI テストページ</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        <code>/api/quote</code> エンドポイントをテストできます
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <fieldset style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <legend><strong>荷送人情報</strong></legend>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              郵便番号
            </label>
            <input
              type="text"
              name="senderPostalCode"
              value={formData.senderPostalCode}
              onChange={handleInputChange}
              placeholder="例: 100-0001"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              国コード
            </label>
            <select
              name="senderCountryCode"
              value={formData.senderCountryCode}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="JP">JP (日本)</option>
              <option value="US">US (アメリカ)</option>
              <option value="CN">CN (中国)</option>
              <option value="KR">KR (韓国)</option>
            </select>
          </div>
        </fieldset>

        <fieldset style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <legend><strong>荷受人情報</strong></legend>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              郵便番号
            </label>
            <input
              type="text"
              name="recipientPostalCode"
              value={formData.recipientPostalCode}
              onChange={handleInputChange}
              placeholder="例: 10001"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              国コード
            </label>
            <select
              name="recipientCountryCode"
              value={formData.recipientCountryCode}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="US">US (アメリカ)</option>
              <option value="JP">JP (日本)</option>
              <option value="CN">CN (中国)</option>
              <option value="KR">KR (韓国)</option>
            </select>
          </div>
        </fieldset>

        <fieldset style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <legend><strong>荷物情報</strong></legend>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              重量 (kg)
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="例: 1.5"
              min="0.1"
              step="0.1"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '処理中...' : 'API呼び出し実行'}
        </button>
      </form>

      {/* エラーメッセージ */}
      {error && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <strong style={{ color: '#721c24' }}>❌ {error}</strong>
        </div>
      )}

      {/* APIレスポンス */}
      {response && (
        <div style={{ marginTop: '2rem' }}>
          <h2>APIレスポンス</h2>
          <div style={{
            background: response.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${response.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            padding: '1rem'
          }}>
            <pre style={{ 
              margin: 0, 
              whiteSpace: 'pre-wrap', 
              fontSize: '0.9rem',
              color: response.success ? '#155724' : '#721c24'
            }}>
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <h2>使用方法</h2>
        <ol style={{ lineHeight: '1.6' }}>
          <li>荷送人と荷受人の郵便番号・国コードを入力</li>
          <li>荷物の重量を入力</li>
          <li>「API呼び出し実行」ボタンをクリック</li>
          <li>コンソールでログ出力を確認</li>
          <li>画面下部でAPIレスポンスを確認</li>
        </ol>
        
        <p style={{ marginTop: '1rem' }}>
          <a href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
            ← ホームページに戻る
          </a>
        </p>
      </div>
    </div>
  )
} 