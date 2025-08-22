import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CustomerInfoForm from '../CustomerInfoForm'
import type { CustomerInfoFormData } from '@/types/receipt'

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// タイマーのモック
jest.useFakeTimers()

describe('CustomerInfoForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  }

  describe('レンダリング', () => {
    it('フォームが正しくレンダリングされる', () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      expect(screen.getByText('宛名情報の入力')).toBeInTheDocument()
      expect(screen.getByLabelText(/名前/)).toBeInTheDocument()
      expect(screen.getByLabelText(/会社名/)).toBeInTheDocument()
      expect(screen.getByLabelText(/住所/)).toBeInTheDocument()
      expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /キャンセル/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /領収書を生成/ })).toBeInTheDocument()
    })

    it('初期データが設定されている場合、フィールドに値が表示される', () => {
      const initialData = {
        name: '山田太郎',
        companyName: '株式会社テスト',
        address: '東京都渋谷区',
        phone: '03-1234-5678'
      }

      render(<CustomerInfoForm {...defaultProps} initialData={initialData} />)
      
      expect(screen.getByDisplayValue('山田太郎')).toBeInTheDocument()
      expect(screen.getByDisplayValue('株式会社テスト')).toBeInTheDocument()
      expect(screen.getByDisplayValue('東京都渋谷区')).toBeInTheDocument()
      expect(screen.getByDisplayValue('03-1234-5678')).toBeInTheDocument()
    })

    it('ローディング状態の場合、フィールドが無効化される', () => {
      render(<CustomerInfoForm {...defaultProps} isLoading={true} />)
      
      expect(screen.getByLabelText(/名前/)).toBeDisabled()
      expect(screen.getByLabelText(/会社名/)).toBeDisabled()
      expect(screen.getByLabelText(/住所/)).toBeDisabled()
      expect(screen.getByLabelText(/電話番号/)).toBeDisabled()
      expect(screen.getByRole('button', { name: /処理中/ })).toBeDisabled()
    })
  })

  describe('バリデーション', () => {
    it('名前が空の場合、エラーメッセージが表示される', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('名前は必須です')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('無効な電話番号の場合、エラーメッセージが表示される', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/名前/)
      const phoneInput = screen.getByLabelText(/電話番号/)
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      
      fireEvent.change(nameInput, { target: { value: '山田太郎' } })
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('有効な電話番号を入力してください')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('有効なデータの場合、バリデーションが通る', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/名前/)
      const phoneInput = screen.getByLabelText(/電話番号/)
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      
      fireEvent.change(nameInput, { target: { value: '山田太郎' } })
      fireEvent.change(phoneInput, { target: { value: '03-1234-5678' } })
      fireEvent.click(submitButton)
      
      expect(screen.queryByText('名前は必須です')).not.toBeInTheDocument()
      expect(screen.queryByText('有効な電話番号を入力してください')).not.toBeInTheDocument()
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '山田太郎',
        companyName: '',
        address: '',
        phone: '03-1234-5678'
      })
    })

    it('エラーがある場合、送信ボタンが無効化される', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const phoneInput = screen.getByLabelText(/電話番号/)
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } })
      
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      fireEvent.click(submitButton)
      
      expect(screen.getByRole('button', { name: /入力エラーを修正してください/ })).toBeDisabled()
    })
  })

  describe('フォーム送信', () => {
    it('有効なデータでフォームが送信される', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/名前/)
      const companyInput = screen.getByLabelText(/会社名/)
      const addressInput = screen.getByLabelText(/住所/)
      const phoneInput = screen.getByLabelText(/電話番号/)
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      
      fireEvent.change(nameInput, { target: { value: '山田太郎' } })
      fireEvent.change(companyInput, { target: { value: '株式会社テスト' } })
      fireEvent.change(addressInput, { target: { value: '東京都渋谷区' } })
      fireEvent.change(phoneInput, { target: { value: '03-1234-5678' } })
      fireEvent.click(submitButton)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '山田太郎',
        companyName: '株式会社テスト',
        address: '東京都渋谷区',
        phone: '03-1234-5678'
      })
    })

    it('フォーム送信時にローカルストレージがクリアされる', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/名前/)
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      
      fireEvent.change(nameInput, { target: { value: '山田太郎' } })
      fireEvent.click(submitButton)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('customer-info-form-data')
    })
  })

  describe('キャンセル', () => {
    it('キャンセルボタンクリック時にonCancelが呼ばれる', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /キャンセル/ })
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('キャンセル時にローカルストレージがクリアされる', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /キャンセル/ })
      fireEvent.click(cancelButton)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('customer-info-form-data')
    })
  })

  describe('ローカルストレージ', () => {
    it('コンポーネントマウント時にローカルストレージからデータを復元する', () => {
      const savedData = {
        name: '保存された名前',
        companyName: '保存された会社名',
        address: '保存された住所',
        phone: '保存された電話番号'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData))
      
      render(<CustomerInfoForm {...defaultProps} />)
      
      expect(screen.getByDisplayValue('保存された名前')).toBeInTheDocument()
      expect(screen.getByDisplayValue('保存された会社名')).toBeInTheDocument()
      expect(screen.getByDisplayValue('保存された住所')).toBeInTheDocument()
      expect(screen.getByDisplayValue('保存された電話番号')).toBeInTheDocument()
    })

    it('初期データがある場合、ローカルストレージより優先される', () => {
      const savedData = {
        name: '保存された名前',
        companyName: '保存された会社名'
      }
      const initialData = {
        name: '初期データの名前',
        companyName: '初期データの会社名'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData))
      
      render(<CustomerInfoForm {...defaultProps} initialData={initialData} />)
      
      expect(screen.getByDisplayValue('初期データの名前')).toBeInTheDocument()
      expect(screen.getByDisplayValue('初期データの会社名')).toBeInTheDocument()
    })

    it('無効なJSONデータの場合、エラーを処理する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      render(<CustomerInfoForm {...defaultProps} />)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '保存されたフォームデータの読み込みに失敗:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('エラー状態の回復', () => {
    it('エラーがあるフィールドを修正するとエラーが消える', async () => {
      render(<CustomerInfoForm {...defaultProps} />)
      
      const phoneInput = screen.getByLabelText(/電話番号/)
      const submitButton = screen.getByRole('button', { name: /領収書を生成/ })
      
      // 無効な電話番号を入力してエラーを発生させる
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('有効な電話番号を入力してください')).toBeInTheDocument()
      
      // 有効な電話番号に修正
      fireEvent.change(phoneInput, { target: { value: '03-1234-5678' } })
      
      expect(screen.queryByText('有効な電話番号を入力してください')).not.toBeInTheDocument()
    })
  })
})