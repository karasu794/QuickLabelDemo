import { getCacheInvalidationService, invalidateTransactionCache, invalidateUserCache } from '../cacheInvalidationService'
import { getCacheService } from '../cacheService'

// Mock Supabase dependencies
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        lt: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }))
}))

// Integration tests for cache invalidation service
// These tests verify the interaction between cache invalidation service and cache service

describe('CacheInvalidationService Integration Tests', () => {
  const mockTransactionId = 'integration-test-transaction-id'
  const mockUserId = 'integration-test-user-id'

  // Mock environment variables
  beforeAll(() => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('invalidateTransactionCache function', () => {
    it('便利関数が正常に動作する', async () => {
      const service = getCacheInvalidationService()
      const spy = jest.spyOn(service, 'invalidateTransaction').mockResolvedValue()

      await invalidateTransactionCache(mockTransactionId, 'テスト理由')

      expect(spy).toHaveBeenCalledWith(mockTransactionId, 'テスト理由')
    })

    it('理由が指定されない場合、デフォルト理由を使用する', async () => {
      const service = getCacheInvalidationService()
      const spy = jest.spyOn(service, 'invalidateTransaction').mockResolvedValue()

      await invalidateTransactionCache(mockTransactionId)

      expect(spy).toHaveBeenCalledWith(mockTransactionId, 'データ変更')
    })
  })

  describe('invalidateUserCache function', () => {
    it('便利関数が正常に動作する', async () => {
      const service = getCacheInvalidationService()
      const spy = jest.spyOn(service, 'invalidateUserTransactions').mockResolvedValue()

      await invalidateUserCache(mockUserId, 'テスト理由')

      expect(spy).toHaveBeenCalledWith(mockUserId, 'テスト理由')
    })

    it('理由が指定されない場合、デフォルト理由を使用する', async () => {
      const service = getCacheInvalidationService()
      const spy = jest.spyOn(service, 'invalidateUserTransactions').mockResolvedValue()

      await invalidateUserCache(mockUserId)

      expect(spy).toHaveBeenCalledWith(mockUserId, 'ユーザーデータ変更')
    })
  })

  describe('Service interaction with CacheService', () => {
    it('キャッシュサービスとの連携が正常に動作する', async () => {
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      // Mock cache service methods
      const existsSpy = jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      const deleteSpy = jest.spyOn(cacheService, 'delete').mockResolvedValue()

      await invalidationService.invalidateTransaction(mockTransactionId, 'テスト')

      expect(existsSpy).toHaveBeenCalledWith(mockTransactionId)
      expect(deleteSpy).toHaveBeenCalledWith(mockTransactionId)
    })

    it('キャッシュが存在しない場合、削除処理をスキップする', async () => {
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      const existsSpy = jest.spyOn(cacheService, 'exists').mockResolvedValue(false)
      const deleteSpy = jest.spyOn(cacheService, 'delete').mockResolvedValue()

      await invalidationService.invalidateTransaction(mockTransactionId, 'テスト')

      expect(existsSpy).toHaveBeenCalledWith(mockTransactionId)
      expect(deleteSpy).not.toHaveBeenCalled()
    })

    it('キャッシュサービスでエラーが発生してもサービスは継続する', async () => {
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      jest.spyOn(cacheService, 'delete').mockRejectedValue(new Error('Cache service error'))

      // エラーがスローされないことを確認
      await expect(invalidationService.invalidateTransaction(mockTransactionId, 'テスト')).resolves.toBeUndefined()
    })
  })

  describe('Error handling and resilience', () => {
    it('複数の取引で一部が失敗しても処理を継続する', async () => {
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      
      const deleteSpy = jest.spyOn(cacheService, 'delete')
        .mockResolvedValueOnce() // 1つ目成功
        .mockRejectedValueOnce(new Error('削除失敗')) // 2つ目失敗
        .mockResolvedValueOnce() // 3つ目成功

      const transactionIds = ['id1', 'id2', 'id3']
      
      await invalidationService.invalidateMultipleTransactions(transactionIds, 'テスト')

      expect(deleteSpy).toHaveBeenCalledTimes(3)
    })

    it('データベース接続エラーが発生してもサービスは継続する', async () => {
      const invalidationService = getCacheInvalidationService()

      // Mock database error
      jest.doMock('@/lib/supabase/server', () => ({
        createServiceRoleClient: () => {
          throw new Error('Database connection failed')
        }
      }))

      // エラーがスローされないことを確認
      await expect(invalidationService.invalidateUserTransactions(mockUserId, 'テスト')).resolves.toBeUndefined()
    })
  })

  describe('Performance considerations', () => {
    it('大量の取引IDを効率的に処理する', async () => {
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      // 100個の取引IDを生成
      const transactionIds = Array.from({ length: 100 }, (_, i) => `transaction-${i}`)

      jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      jest.spyOn(cacheService, 'delete').mockResolvedValue()

      const startTime = Date.now()
      await invalidationService.invalidateMultipleTransactions(transactionIds, 'パフォーマンステスト')
      const endTime = Date.now()

      // 並列処理により、シーケンシャル処理よりも高速であることを確認
      // (実際の時間は環境に依存するため、単純に完了することを確認)
      expect(endTime - startTime).toBeLessThan(10000) // 10秒以内
    })
  })

  describe('Logging and monitoring', () => {
    it('適切なログが出力される', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      jest.spyOn(cacheService, 'delete').mockResolvedValue()

      await invalidationService.invalidateTransaction(mockTransactionId, 'ログテスト')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🗑️ キャッシュ無効化開始')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ キャッシュ無効化完了')
      )

      consoleSpy.mockRestore()
    })

    it('エラー時に適切なログが出力される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const cacheService = getCacheService()
      const invalidationService = getCacheInvalidationService()

      jest.spyOn(cacheService, 'exists').mockResolvedValue(true)
      jest.spyOn(cacheService, 'delete').mockRejectedValue(new Error('テストエラー'))

      await invalidationService.invalidateTransaction(mockTransactionId, 'エラーテスト')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ キャッシュ無効化エラー'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})