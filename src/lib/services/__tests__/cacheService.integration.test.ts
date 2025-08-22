/**
 * Integration tests for CacheService
 * These tests verify the cache service works correctly with database operations
 */

import { ReceiptCacheService } from '../cacheService'

// Skip integration tests in CI/CD environments
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'

describe('CacheService Integration Tests', () => {
  let cacheService: ReceiptCacheService
  const testTransactionId = 'integration-test-transaction'
  const testPdfBuffer = Buffer.from('Integration test PDF content')

  beforeAll(() => {
    if (!runIntegrationTests) {
      console.log('Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to run.')
      return
    }

    // Ensure environment variables are set for integration tests
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN must be set for integration tests')
    }

    cacheService = new ReceiptCacheService()
  })

  afterAll(async () => {
    if (!runIntegrationTests) return

    // Clean up test data
    try {
      await cacheService.delete(testTransactionId)
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup error:', error)
    }
  })

  describe('Full cache lifecycle', () => {
    it('should store, retrieve, and delete PDF successfully', async () => {
      if (!runIntegrationTests) {
        console.log('Skipping integration test')
        return
      }

      // Store PDF
      const storeUrl = await cacheService.set(testTransactionId, testPdfBuffer)
      expect(storeUrl).toBeTruthy()
      expect(typeof storeUrl).toBe('string')

      // Verify it exists
      const exists = await cacheService.exists(testTransactionId)
      expect(exists).toBe(true)

      // Retrieve PDF
      const retrievedBuffer = await cacheService.get(testTransactionId)
      expect(retrievedBuffer).not.toBeNull()
      expect(Buffer.isBuffer(retrievedBuffer)).toBe(true)
      expect(retrievedBuffer?.toString()).toBe(testPdfBuffer.toString())

      // Get metadata
      const metadata = await cacheService.getMetadata(testTransactionId)
      expect(metadata).not.toBeNull()
      expect(metadata?.size).toBe(testPdfBuffer.length)
      expect(metadata?.contentType).toBe('application/pdf')

      // Generate signed URL
      const signedUrl = await cacheService.generateSignedUrl(testTransactionId)
      expect(signedUrl).toBeTruthy()
      expect(signedUrl).toContain('expires=')

      // Delete PDF
      await cacheService.delete(testTransactionId)

      // Verify it no longer exists
      const existsAfterDelete = await cacheService.exists(testTransactionId)
      expect(existsAfterDelete).toBe(false)

      // Verify retrieval returns null
      const retrievedAfterDelete = await cacheService.get(testTransactionId)
      expect(retrievedAfterDelete).toBeNull()
    }, 30000) // 30 second timeout for integration test

    it('should handle non-existent files gracefully', async () => {
      if (!runIntegrationTests) {
        console.log('Skipping integration test')
        return
      }

      const nonExistentId = 'non-existent-transaction-id'

      // Should return null for non-existent file
      const result = await cacheService.get(nonExistentId)
      expect(result).toBeNull()

      // Should return false for exists check
      const exists = await cacheService.exists(nonExistentId)
      expect(exists).toBe(false)

      // Should return null for metadata
      const metadata = await cacheService.getMetadata(nonExistentId)
      expect(metadata).toBeNull()

      // Should throw error for signed URL
      await expect(cacheService.generateSignedUrl(nonExistentId))
        .rejects.toThrow('PDF not found in cache')

      // Should not throw error for delete (idempotent)
      await expect(cacheService.delete(nonExistentId)).resolves.not.toThrow()
    })

    it('should handle large files correctly', async () => {
      if (!runIntegrationTests) {
        console.log('Skipping integration test')
        return
      }

      const largeTransactionId = 'large-file-test'
      const largeBuffer = Buffer.alloc(1024 * 1024) // 1MB
      largeBuffer.fill('A')

      try {
        // Store large file
        const storeUrl = await cacheService.set(largeTransactionId, largeBuffer)
        expect(storeUrl).toBeTruthy()

        // Retrieve and verify
        const retrieved = await cacheService.get(largeTransactionId)
        expect(retrieved).not.toBeNull()
        expect(retrieved?.length).toBe(largeBuffer.length)

        // Clean up
        await cacheService.delete(largeTransactionId)
      } catch (error) {
        // Clean up on error
        await cacheService.delete(largeTransactionId)
        throw error
      }
    }, 60000) // 60 second timeout for large file test
  })

  describe('Error handling', () => {
    it('should reject files that are too large', async () => {
      if (!runIntegrationTests) {
        console.log('Skipping integration test')
        return
      }

      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB (over 10MB limit)
      
      await expect(cacheService.set('oversized-test', oversizedBuffer))
        .rejects.toThrow('File size exceeds maximum allowed size')
    })
  })
})

// Export for potential use in other integration tests
export { ReceiptCacheService }