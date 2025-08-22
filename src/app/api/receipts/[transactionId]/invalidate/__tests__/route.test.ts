/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getCacheService } from '@/lib/services/cacheService'
import { createServerClient } from '@supabase/ssr'

// Mock dependencies
jest.mock('@/lib/services/cacheService')
jest.mock('@supabase/ssr')
jest.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    set: () => {},
  })
}))

const mockCacheService = {
  exists: jest.fn(),
  delete: jest.fn(),
}

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
        single: jest.fn(),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
}

const mockCreateServiceRoleClient = jest.fn(() => mockSupabaseClient)

;(getCacheService as jest.Mock).mockReturnValue(mockCacheService)
;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

// Mock dynamic import
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

describe('/api/receipts/[transactionId]/invalidate', () => {
  const mockTransactionId = 'test-transaction-id'
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: mockUserId }
        }
      }
    })
  })

  describe('POST', () => {
    it('transactionIdが指定されていない場合、400エラーを返す', async () => {
      const request = new NextRequest('http://localhost/api/receipts//invalidate', {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('MISSING_TRANSACTION_ID')
    })

    it('認証されていないユーザーの場合、401エラーを返す', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      })

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('アクセス権限がない場合、403エラーを返す', async () => {
      // Mock access verification to return false
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            }))
          }))
        }))
      })

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('ACCESS_DENIED')
    })

    it('キャッシュが存在しない場合、成功メッセージを返す', async () => {
      // Mock successful access verification
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ 
                data: { id: mockTransactionId, user_id: mockUserId }, 
                error: null 
              })
            }))
          }))
        }))
      })

      mockCacheService.exists.mockResolvedValue(false)

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message).toContain('キャッシュが存在しないため、無効化は不要です')
      expect(mockCacheService.delete).not.toHaveBeenCalled()
    })

    it('キャッシュが存在する場合、正常に削除して成功を返す', async () => {
      // Mock successful access verification
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ 
                data: { id: mockTransactionId, user_id: mockUserId }, 
                error: null 
              })
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null })
        }))
      })

      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message).toContain('キャッシュが正常に無効化されました')
      expect(mockCacheService.exists).toHaveBeenCalledWith(mockTransactionId)
      expect(mockCacheService.delete).toHaveBeenCalledWith(mockTransactionId)
    })

    it('キャッシュ削除でエラーが発生した場合、500エラーを返す', async () => {
      // Mock successful access verification
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ 
                data: { id: mockTransactionId, user_id: mockUserId }, 
                error: null 
              })
            }))
          }))
        }))
      })

      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockRejectedValue(new Error('Cache deletion failed'))

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CACHE_INVALIDATION_ERROR')
      expect(data.error.details).toContain('Cache deletion failed')
    })

    it('データベースエラーが発生した場合、適切なエラーを返す', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            }))
          }))
        }))
      })

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CACHE_INVALIDATION_ERROR')
    })

    it('open_shipmentsテーブルのアクセス権限も正しく確認する', async () => {
      // Mock shipments table returning no data, but open_shipments returning data
      let callCount = 0
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                  // First call (shipments) - no data
                  return Promise.resolve({ data: null, error: { message: 'Not found' } })
                } else {
                  // Second call (open_shipments) - has data
                  return Promise.resolve({ 
                    data: { id: mockTransactionId, user_id: mockUserId }, 
                    error: null 
                  })
                }
              })
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null })
        }))
      })

      mockCacheService.exists.mockResolvedValue(true)
      mockCacheService.delete.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost/api/receipts/${mockTransactionId}/invalidate`, {
        method: 'POST',
      })

      const response = await POST(request, { params: { transactionId: mockTransactionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockCacheService.delete).toHaveBeenCalledWith(mockTransactionId)
    })
  })
})