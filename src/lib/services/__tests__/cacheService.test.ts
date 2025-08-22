import { ReceiptCacheService } from '../cacheService'
import { put, del, head, BlobAccessError } from '@vercel/blob'

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
  head: jest.fn(),
  BlobAccessError: class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'BlobAccessError'
    }
  }
}))

// Mock fetch - will be overridden in individual tests
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ReceiptCacheService', () => {
  let cacheService: ReceiptCacheService
  const mockTransactionId = 'test-transaction-123'
  const mockPdfBuffer = Buffer.from('mock pdf content')
  const mockBlobUrl = 'https://blob.vercel-storage.com/receipts/test-transaction-123.pdf'

  beforeEach(() => {
    // Set up environment variable
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
    
    // Clear all mocks
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Create new instance for each test
    cacheService = new ReceiptCacheService()
  })

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  describe('constructor', () => {
    it('should throw error if BLOB_READ_WRITE_TOKEN is not set', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      
      expect(() => new ReceiptCacheService()).toThrow(
        'BLOB_READ_WRITE_TOKEN environment variable is required'
      )
    })

    it('should create instance successfully with valid environment', () => {
      expect(() => new ReceiptCacheService()).not.toThrow()
    })
  })

  describe('set', () => {
    it('should store PDF successfully', async () => {
      const mockBlob = { url: mockBlobUrl }
      ;(put as jest.Mock).mockResolvedValue(mockBlob)

      const result = await cacheService.set(mockTransactionId, mockPdfBuffer)

      expect(put).toHaveBeenCalledWith(
        `receipts/${mockTransactionId}.pdf`,
        mockPdfBuffer,
        {
          access: 'public',
          contentType: 'application/pdf',
          token: 'test-token'
        }
      )
      expect(result).toBe(mockBlobUrl)
    })

    it('should throw error for oversized files', async () => {
      const largePdfBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB

      await expect(cacheService.set(mockTransactionId, largePdfBuffer))
        .rejects.toThrow('File size exceeds maximum allowed size')
    })

    it('should handle put operation errors', async () => {
      ;(put as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(cacheService.set(mockTransactionId, mockPdfBuffer))
        .rejects.toThrow('Failed to store PDF in cache: Network error')
    })

    it('should retry on retryable errors', async () => {
      ;(put as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({ url: mockBlobUrl })

      const result = await cacheService.set(mockTransactionId, mockPdfBuffer)

      expect(put).toHaveBeenCalledTimes(2)
      expect(result).toBe(mockBlobUrl)
    })
  })

  describe('get', () => {
    it('should retrieve PDF successfully', async () => {
      const mockHeadResponse = { url: mockBlobUrl }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)
      
      // Mock fetch to return the expected buffer
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      })

      const result = await cacheService.get(mockTransactionId)

      expect(head).toHaveBeenCalledWith(
        `receipts/${mockTransactionId}.pdf`,
        { token: 'test-token' }
      )
      expect(mockFetch).toHaveBeenCalledWith(mockBlobUrl)
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result).not.toBeNull()
    })

    it('should return null when PDF not found', async () => {
      ;(head as jest.Mock).mockResolvedValue(null)

      const result = await cacheService.get(mockTransactionId)

      expect(result).toBeNull()
    })

    it('should return null when blob access error occurs', async () => {
      ;(head as jest.Mock).mockRejectedValue(new BlobAccessError('not found'))

      const result = await cacheService.get(mockTransactionId)

      expect(result).toBeNull()
    })

    it('should handle fetch errors', async () => {
      const mockHeadResponse = { url: mockBlobUrl }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(cacheService.get(mockTransactionId))
        .rejects.toThrow('Failed to fetch blob: 500 Internal Server Error')
    })

    it('should return null for 404 fetch responses', async () => {
      const mockHeadResponse = { url: mockBlobUrl }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await cacheService.get(mockTransactionId)

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete PDF successfully', async () => {
      ;(del as jest.Mock).mockResolvedValue(undefined)

      await cacheService.delete(mockTransactionId)

      expect(del).toHaveBeenCalledWith(
        `receipts/${mockTransactionId}.pdf`,
        { token: 'test-token' }
      )
    })

    it('should handle file not found gracefully', async () => {
      ;(del as jest.Mock).mockRejectedValue(new BlobAccessError('not found'))

      await expect(cacheService.delete(mockTransactionId)).resolves.not.toThrow()
    })

    it('should throw error for other delete failures', async () => {
      ;(del as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(cacheService.delete(mockTransactionId))
        .rejects.toThrow('Failed to delete PDF from cache: Network error')
    })
  })

  describe('generateSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockHeadResponse = { url: mockBlobUrl }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)

      const result = await cacheService.generateSignedUrl(mockTransactionId)

      expect(head).toHaveBeenCalledWith(
        `receipts/${mockTransactionId}.pdf`,
        { token: 'test-token' }
      )
      expect(result).toMatch(/^https:\/\/blob\.vercel-storage\.com\/receipts\/test-transaction-123\.pdf\?expires=\d+$/)
    })

    it('should throw error when PDF not found', async () => {
      ;(head as jest.Mock).mockResolvedValue(null)

      await expect(cacheService.generateSignedUrl(mockTransactionId))
        .rejects.toThrow('PDF not found in cache')
    })

    it('should handle blob access errors', async () => {
      ;(head as jest.Mock).mockRejectedValue(new BlobAccessError('not found'))

      await expect(cacheService.generateSignedUrl(mockTransactionId))
        .rejects.toThrow('PDF not found in cache')
    })
  })

  describe('exists', () => {
    it('should return true when PDF exists', async () => {
      const mockHeadResponse = { url: mockBlobUrl }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)

      const result = await cacheService.exists(mockTransactionId)

      expect(result).toBe(true)
    })

    it('should return false when PDF does not exist', async () => {
      ;(head as jest.Mock).mockResolvedValue(null)

      const result = await cacheService.exists(mockTransactionId)

      expect(result).toBe(false)
    })

    it('should return false for blob access errors', async () => {
      ;(head as jest.Mock).mockRejectedValue(new BlobAccessError('not found'))

      const result = await cacheService.exists(mockTransactionId)

      expect(result).toBe(false)
    })
  })

  describe('getMetadata', () => {
    it('should return metadata when PDF exists', async () => {
      const mockHeadResponse = {
        url: mockBlobUrl,
        size: 1024,
        uploadedAt: '2024-01-01T00:00:00.000Z',
        contentType: 'application/pdf'
      }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)

      const result = await cacheService.getMetadata(mockTransactionId)

      expect(result).toEqual({
        size: 1024,
        lastModified: new Date('2024-01-01T00:00:00.000Z'),
        contentType: 'application/pdf'
      })
    })

    it('should return null when PDF does not exist', async () => {
      ;(head as jest.Mock).mockResolvedValue(null)

      const result = await cacheService.getMetadata(mockTransactionId)

      expect(result).toBeNull()
    })

    it('should handle missing contentType', async () => {
      const mockHeadResponse = {
        url: mockBlobUrl,
        size: 1024,
        uploadedAt: '2024-01-01T00:00:00.000Z'
      }
      ;(head as jest.Mock).mockResolvedValue(mockHeadResponse)

      const result = await cacheService.getMetadata(mockTransactionId)

      expect(result?.contentType).toBe('application/pdf')
    })
  })

  describe('clearExpired', () => {
    it('should return 0 (not implemented)', async () => {
      const result = await cacheService.clearExpired()
      expect(result).toBe(0)
    })
  })

  describe('retry mechanism', () => {
    it('should not retry non-retryable errors', async () => {
      ;(put as jest.Mock).mockRejectedValue(new Error('File size exceeds maximum'))

      await expect(cacheService.set(mockTransactionId, mockPdfBuffer))
        .rejects.toThrow('File size exceeds maximum')

      expect(put).toHaveBeenCalledTimes(1)
    })

    it('should exhaust all retries before failing', async () => {
      ;(put as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(cacheService.set(mockTransactionId, mockPdfBuffer))
        .rejects.toThrow('Cache operation failed after 3 attempts')

      expect(put).toHaveBeenCalledTimes(3)
    })
  })

  describe('cache key generation', () => {
    it('should generate correct cache key format', async () => {
      ;(put as jest.Mock).mockResolvedValue({ url: mockBlobUrl })

      await cacheService.set(mockTransactionId, mockPdfBuffer)

      expect(put).toHaveBeenCalledWith(
        `receipts/${mockTransactionId}.pdf`,
        expect.any(Buffer),
        expect.any(Object)
      )
    })
  })
})