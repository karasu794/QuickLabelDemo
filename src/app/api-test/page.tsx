'use client'

import { useState } from 'react'
import { getPopularCountryOptions } from '@/lib/data/locations'

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

  const countryOptions = getPopularCountryOptions()

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
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#333', textAlign: 'center' }}>FedEx APIテスト</h1>
      
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
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.value} ({country.label})
                </option>
              ))}
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
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.value} ({country.label})
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <legend><strong>パッケージ情報</strong></legend>
          
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
              step="0.1"
              min="0"
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
            padding: '0.75rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : '見積もり取得'}
        </button>
      </form>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px',
          color: '#721c24',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {response && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f9f9f9', 
          border: '1px solid #ddd', 
          borderRadius: '4px' 
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>レスポンス:</h3>
          <pre style={{ 
            backgroundColor: '#fff', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.9rem'
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 