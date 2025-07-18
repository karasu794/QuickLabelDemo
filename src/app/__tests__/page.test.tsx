import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import HomePage from '../page'

// Environment variables mock
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key'

describe('HomePage - 実際の動作確認', () => {
  it('デバッグ: コンポーネントの状態を確認', async () => {
    const { container } = render(<HomePage />)
    
    // 初期状態の確認
    console.log('=== 初期状態 ===')
    console.log(container.innerHTML)
    
    // 1秒待ってから再度確認
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('=== 1秒後 ===')
    console.log(container.innerHTML)
    
    // 5秒待ってから最終確認
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('=== 5秒後（最終） ===')
    console.log(container.innerHTML)
    
    // 最低限の要素が存在することを確認
    const quickLabelElement = screen.getByText('QuickLabel')
    expect(quickLabelElement).toBeDefined()
  })

  it('基本的な要素が表示される', async () => {
    render(<HomePage />)
    
    // QuickLabelタイトルの確認
    const title = screen.getByText('QuickLabel')
    expect(title).toBeDefined()
    
    // 認証状況が非同期で表示されるのを待つ
    await waitFor(() => {
      const authStatus = screen.getByText('認証状況:')
      expect(authStatus).toBeDefined()
    }, { timeout: 10000 })
  })

  it('フォームが最終的に表示される', async () => {
    render(<HomePage />)
    
    // フォームタイトルが表示されるまで待つ
    await waitFor(() => {
      const formTitle = screen.getByText('フェデックス運送料金の計算')
      expect(formTitle).toBeDefined()
    }, { timeout: 15000 })
    
    // 住所入力フィールドが表示されるまで待つ
    await waitFor(() => {
      const originInput = screen.getByPlaceholderText('例: 東京都渋谷区渋谷1-1-1')
      expect(originInput).toBeDefined()
    }, { timeout: 15000 })
  })
}) 