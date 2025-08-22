import { CacheInvalidationService, getCacheInvalidationService } from '../cacheInvalidationService'
import { getCacheService } from '../cacheService'

// Mock dependencies
jest.mock('../cacheService')
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => mockSupabaseClient)
}))

const mockCacheService = {
  exists: jest.fn(),
  delete: jest.fn(),
}

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      lt: jest.fn(() => Promise.resolve({ data: [], error: null })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

;(getCacheService as jest.Mock).mockReturnValue(mockCacheService)

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CacheInvalidationService()
  })

  describe('invalidateTransaction', () => {
    const mockTransactionId = 'test-transaction-id'

    it('キャッシュが存在しない場合、削除処理をスキップする', async () => {
      mockCacheService.exists.mockResolvedValue(false)

      await service.invalidateTransaction(mockTransactionId, 'テスト理由')

      expect(mockCacheService.exists).toHaveBeenCalledWith(mockTransactionId)
      expect(mockCacheService.delete).not.toHaveBeenCalled()
    })

    it('キャッシュが存在する場合、正常に削除する', async () => {
      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      await service.invalidateTransaction(mockTransactionId, 'テスト理由')

      expect(mockCacheService.exists).toHaveBeenCalledWith(mockTransactionId)
      expect(mockCacheService.delete).toHaveBeenCalledWith(mockTransactionId)
    })

    it('エラーが発生してもスローしない（ログのみ）', async () => {
      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockRejectedValue(new Error('削除エラー'))

      // エラーがスローされないことを確認
      await expect(service.invalidateTransaction(mockTransactionId, 'テスト理由')).resolves.toBeUndefined()
    })
  })

  describe('invalidateMultipleTransactions', () => {
    const mockTransactionIds = ['id1', 'id2', 'id3']

    it('複数の取引IDを一括で無効化する', async () => {
      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      await service.invalidateMultipleTransactions(mockTransactionIds, 'テスト理由')

      expect(mockCacheService.exists).toHaveBeenCalledTimes(3)
      expect(mockCacheService.delete).toHaveBeenCalledTimes(3)
    })

    it('一部の削除が失敗しても処理を継続する', async () => {
      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete
        .mockResolvedValueOnce(undefined) // 1つ目成功
        .mockRejectedValueOnce(new Error('削除エラー')) // 2つ目失敗
        .mockResolvedValueOnce(undefined) // 3つ目成功

      await service.invalidateMultipleTransactions(mockTransactionIds, 'テスト理由')

      expect(mockCacheService.delete).toHaveBeenCalledTimes(3)
    })
  })

  describe('invalidateUserTransactions', () => {
    const mockUserId = 'test-user-id'

    it('ユーザーの取引が存在しない場合、処理をスキップする', async () => {
      // Mock empty results from both tables
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })

      await service.invalidateUserTransactions(mockUserId, 'テスト理由')

      expect(mockCacheService.exists).not.toHaveBeenCalled()
      expect(mockCacheService.delete).not.toHaveBeenCalled()
    })

    it('ユーザーの全取引キャッシュを無効化する', async () => {
      // Mock shipments and open_shipments data
      let callCount = 0
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => {
            callCount++
            if (callCount === 1) {
              // shipments table
              return Promise.resolve({ 
                data: [{ id: 'shipment1' }, { id: 'shipment2' }], 
                error: null 
              })
            } else {
              // open_shipments table
              return Promise.resolve({ 
                data: [{ id: 'open_shipment1' }], 
                error: null 
              })
            }
          })
        }))
      })

      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      await service.invalidateUserTransactions(mockUserId, 'テスト理由')

      expect(mockCacheService.exists).toHaveBeenCalledTimes(3) // 2 shipments + 1 open_shipment
      expect(mockCacheService.delete).toHaveBeenCalledTimes(3)
    })
  })

  describe('cleanupExpiredCache', () => {
    it('期限切れキャッシュが存在しない場合、処理をスキップする', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          lt: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })

      await service.cleanupExpiredCache(24)

      expect(mockCacheService.exists).not.toHaveBeenCalled()
      expect(mockCacheService.delete).not.toHaveBeenCalled()
    })

    it('期限切れキャッシュを正常にクリーンアップする', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          lt: jest.fn(() => Promise.resolve({ 
            data: [
              { transaction_id: 'expired1' },
              { transaction_id: 'expired2' }
            ], 
            error: null 
          }))
        }))
      })

      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      await service.cleanupExpiredCache(24)

      expect(mockCacheService.exists).toHaveBeenCalledTimes(2)
      expect(mockCacheService.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('getCacheStatistics', () => {
    it('キャッシュ統計を正常に取得する', async () => {
      const mockData = [
        { created_at: '2024-01-01T00:00:00Z' },
        { created_at: '2024-01-02T00:00:00Z' },
        { created_at: '2024-01-03T00:00:00Z' }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      })

      const stats = await service.getCacheStatistics()

      expect(stats.totalCached).toBe(3)
      expect(stats.oldestCache).toEqual(new Date('2024-01-01T00:00:00Z'))
      expect(stats.newestCache).toEqual(new Date('2024-01-03T00:00:00Z'))
    })

    it('キャッシュが存在しない場合、適切なデフォルト値を返す', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })

      const stats = await service.getCacheStatistics()

      expect(stats.totalCached).toBe(0)
      expect(stats.oldestCache).toBeNull()
      expect(stats.newestCache).toBeNull()
    })

    it('データベースエラーが発生した場合、デフォルト値を返す', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: null, error: new Error('DB Error') }))
        }))
      })

      const stats = await service.getCacheStatistics()

      expect(stats.totalCached).toBe(0)
      expect(stats.oldestCache).toBeNull()
      expect(stats.newestCache).toBeNull()
    })
  })

  describe('singleton pattern', () => {
    it('getCacheInvalidationService は同じインスタンスを返す', () => {
      const instance1 = getCacheInvalidationService()
      const instance2 = getCacheInvalidationService()

      expect(instance1).toBe(instance2)
    })
  })
})