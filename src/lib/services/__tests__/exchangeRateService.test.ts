/**
 * 📋 ExchangeRateService のテストケース
 * 
 * 要件:
 * - 3.4: Phoenix取引の例外処理ルールを適用
 * - 為替レートの取得とキャッシュ機能
 * - APIからの為替レート取得
 * - データベースへの保存・取得機能
 */

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn()
    }))
  }))
}))

import { ExchangeRateService } from '../exchangeRateService'

describe('ExchangeRateService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    delete process.env.EXCHANGERATE_API_KEY
    
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getExchangeRate', () => {
    it('should return default rate when API key is missing', async () => {
      const result = await ExchangeRateService.getExchangeRate()
      
      expect(result).toBe(150.0) // DEFAULT_RATE
      expect(mockFetch).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ EXCHANGERATE_API_KEY環境変数が設定されていません。デフォルトレートを使用します。'
      )
    })

    it('should handle API errors gracefully', async () => {
      process.env.EXCHANGERATE_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })

      const result = await ExchangeRateService.getExchangeRate()

      expect(result).toBe(150.0) // DEFAULT_RATE
      expect(console.error).toHaveBeenCalledWith(
        '❌ ExchangeRate-API取得エラー:',
        expect.any(Error)
      )
    })
  })

  describe('forceUpdateExchangeRate', () => {
    it('should handle force update errors', async () => {
      process.env.EXCHANGERATE_API_KEY = 'test-api-key'
      mockFetch.mockRejectedValue(new Error('API error'))

      const result = await ExchangeRateService.forceUpdateExchangeRate()

      expect(result).toBe(150.0) // DEFAULT_RATE
    })
  })

  describe('getExchangeRateHistory', () => {
    it('should return empty array on database error', async () => {
      const result = await ExchangeRateService.getExchangeRateHistory()

      expect(result).toEqual([])
    })
  })
})