/**
 * Cache utility functions for PDF receipt generation
 */

import { getCacheService } from '@/lib/services/cacheService'
import { TransactionType } from '@/types/receipt'

/**
 * Generates a standardized cache key for a transaction
 */
export const generateCacheKey = (transactionId: string, transactionType: TransactionType): string => {
  return `${transactionType}-${transactionId}`
}

/**
 * Checks if a PDF is cached for the given transaction
 */
export const isPdfCached = async (transactionId: string): Promise<boolean> => {
  try {
    const cacheService = getCacheService()
    return await cacheService.exists(transactionId)
  } catch (error) {
    console.error('Error checking PDF cache:', error)
    return false
  }
}

/**
 * Gets cached PDF for a transaction
 */
export const getCachedPdf = async (transactionId: string): Promise<Buffer | null> => {
  try {
    const cacheService = getCacheService()
    return await cacheService.get(transactionId)
  } catch (error) {
    console.error('Error retrieving cached PDF:', error)
    return null
  }
}

/**
 * Stores PDF in cache for a transaction
 */
export const cachePdf = async (transactionId: string, pdfBuffer: Buffer): Promise<string | null> => {
  try {
    const cacheService = getCacheService()
    return await cacheService.set(transactionId, pdfBuffer)
  } catch (error) {
    console.error('Error caching PDF:', error)
    return null
  }
}

/**
 * Invalidates cached PDF for a transaction
 */
export const invalidatePdfCache = async (transactionId: string): Promise<boolean> => {
  try {
    const cacheService = getCacheService()
    await cacheService.delete(transactionId)
    return true
  } catch (error) {
    console.error('Error invalidating PDF cache:', error)
    return false
  }
}

/**
 * Gets a signed URL for cached PDF
 */
export const getCachedPdfUrl = async (transactionId: string): Promise<string | null> => {
  try {
    const cacheService = getCacheService()
    return await cacheService.generateSignedUrl(transactionId)
  } catch (error) {
    console.error('Error generating signed URL for cached PDF:', error)
    return null
  }
}

/**
 * Gets cache metadata for a transaction
 */
export const getCacheMetadata = async (transactionId: string): Promise<{
  size: number
  lastModified: Date
  contentType: string
} | null> => {
  try {
    const cacheService = getCacheService()
    return await cacheService.getMetadata(transactionId)
  } catch (error) {
    console.error('Error getting cache metadata:', error)
    return null
  }
}

/**
 * Batch invalidate cache for multiple transactions
 */
export const batchInvalidateCache = async (transactionIds: string[]): Promise<{
  success: string[]
  failed: string[]
}> => {
  const results = {
    success: [] as string[],
    failed: [] as string[]
  }

  const cacheService = getCacheService()

  await Promise.allSettled(
    transactionIds.map(async (transactionId) => {
      try {
        await cacheService.delete(transactionId)
        results.success.push(transactionId)
      } catch (error) {
        console.error(`Error invalidating cache for ${transactionId}:`, error)
        results.failed.push(transactionId)
      }
    })
  )

  return results
}

/**
 * Cache health check - verifies cache service is working
 */
export const cacheHealthCheck = async (): Promise<{
  healthy: boolean
  error?: string
}> => {
  try {
    const cacheService = getCacheService()
    const testKey = `health-check-${Date.now()}`
    const testBuffer = Buffer.from('health check')

    // Test store
    await cacheService.set(testKey, testBuffer)
    
    // Test retrieve
    const retrieved = await cacheService.get(testKey)
    if (!retrieved || retrieved.toString() !== testBuffer.toString()) {
      throw new Error('Cache retrieve test failed')
    }

    // Test delete
    await cacheService.delete(testKey)

    // Verify deletion
    const afterDelete = await cacheService.get(testKey)
    if (afterDelete !== null) {
      throw new Error('Cache delete test failed')
    }

    return { healthy: true }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Estimates cache storage usage (placeholder - would need actual implementation)
 */
export const getCacheStorageInfo = async (): Promise<{
  totalFiles: number
  estimatedSize: number
  lastCleanup?: Date
}> => {
  // This would require additional tracking or Vercel Blob API extensions
  // For now, return placeholder data
  return {
    totalFiles: 0,
    estimatedSize: 0,
    lastCleanup: undefined
  }
}