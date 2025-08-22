import { put, del, head, BlobAccessError } from '@vercel/blob'
import { CacheService } from '@/types/receipt'
import { RECEIPT_CONFIG } from '@/lib/config/receipt'

/**
 * Cache Service for PDF Receipt Generation
 * Handles PDF file storage, retrieval, and deletion using Vercel Blob
 * Implements retry mechanism and error handling for robust operation
 */
export class ReceiptCacheService implements CacheService {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second base delay

  constructor () {
    this.validateEnvironment()
  }

  /**
   * Validates required environment variables
   */
  private validateEnvironment (): void {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
    }
  }

  /**
   * Generates cache key for transaction
   */
  private generateCacheKey (transactionId: string): string {
    return `receipts/${transactionId}.pdf`
  }

  /**
   * Retrieves PDF from Vercel Blob cache
   * @param key - Cache key (transaction ID)
   * @returns PDF buffer or null if not found
   */
  async get (key: string): Promise<Buffer | null> {
    const cacheKey = this.generateCacheKey(key)

    return this.withRetry(async () => {
      try {
        // Check if blob exists first
        const headResponse = await head(cacheKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })

        if (!headResponse) {
          return null
        }

        // Fetch the blob content
        const response = await fetch(headResponse.url)

        if (!response.ok) {
          if (response.status === 404) {
            return null
          }
          throw new Error(
            `Failed to fetch blob: ${response.status} ${response.statusText}`
          )
        }

        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      } catch (error) {
        if (
          error instanceof BlobAccessError &&
          error.message.includes('not found')
        ) {
          return null
        }
        throw error
      }
    }, `get cache for key: ${key}`)
  }

  /**
   * Stores PDF in Vercel Blob cache
   * @param key - Cache key (transaction ID)
   * @param data - PDF buffer data
   * @returns Blob URL
   */
  async set (key: string, data: Buffer): Promise<string> {
    const cacheKey = this.generateCacheKey(key)

    // Validate file size
    if (data.length > RECEIPT_CONFIG.CACHE_CONFIG.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size: ${RECEIPT_CONFIG.CACHE_CONFIG.maxFileSize} bytes`
      )
    }

    return this.withRetry(async () => {
      try {
        const blob = await put(cacheKey, data, {
          access: 'public', // Note: Vercel Blob only supports public access
          contentType: 'application/pdf',
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })

        return blob.url
      } catch (error) {
        throw new Error(
          `Failed to store PDF in cache: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }, `set cache for key: ${key}`)
  }

  /**
   * Deletes PDF from Vercel Blob cache
   * @param key - Cache key (transaction ID)
   */
  async delete (key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key)

    return this.withRetry(async () => {
      try {
        await del(cacheKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })
      } catch (error) {
        // Don't throw error if file doesn't exist
        if (
          error instanceof BlobAccessError &&
          error.message.includes('not found')
        ) {
          return
        }
        throw new Error(
          `Failed to delete PDF from cache: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }, `delete cache for key: ${key}`)
  }

  /**
   * Generates signed URL for secure PDF access
   * @param key - Cache key (transaction ID)
   * @returns Signed URL with expiration
   */
  async generateSignedUrl (key: string): Promise<string> {
    const cacheKey = this.generateCacheKey(key)

    return this.withRetry(async () => {
      try {
        // Check if blob exists
        const headResponse = await head(cacheKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })

        if (!headResponse) {
          throw new Error('PDF not found in cache')
        }

        // Generate signed URL with 1 hour expiration (3600 seconds)
        const expiresIn = 3600
        const signedUrl = `${headResponse.url}?expires=${
          Date.now() + expiresIn * 1000
        }`

        return signedUrl
      } catch (error) {
        if (
          error instanceof BlobAccessError &&
          error.message.includes('not found')
        ) {
          throw new Error('PDF not found in cache')
        }
        throw new Error(
          `Failed to generate signed URL: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }, `generate signed URL for key: ${key}`)
  }

  /**
   * Checks if a cached PDF exists
   * @param key - Cache key (transaction ID)
   * @returns True if exists, false otherwise
   */
  async exists (key: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key)

    return this.withRetry(async () => {
      try {
        const headResponse = await head(cacheKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })

        return headResponse !== null
      } catch (error) {
        if (
          error instanceof BlobAccessError &&
          error.message.includes('not found')
        ) {
          return false
        }
        throw error
      }
    }, `check existence for key: ${key}`)
  }

  /**
   * Gets cache metadata
   * @param key - Cache key (transaction ID)
   * @returns Metadata object or null if not found
   */
  async getMetadata (key: string): Promise<{
    size: number
    lastModified: Date
    contentType: string
  } | null> {
    const cacheKey = this.generateCacheKey(key)

    return this.withRetry(async () => {
      try {
        const headResponse = await head(cacheKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN!
        })

        if (!headResponse) {
          return null
        }

        return {
          size: headResponse.size,
          lastModified: new Date(headResponse.uploadedAt),
          contentType: headResponse.contentType || 'application/pdf'
        }
      } catch (error) {
        if (
          error instanceof BlobAccessError &&
          error.message.includes('not found')
        ) {
          return null
        }
        throw error
      }
    }, `get metadata for key: ${key}`)
  }

  /**
   * Clears expired cache entries (utility method)
   * Note: Vercel Blob doesn't have built-in expiration, so this would need to be implemented
   * with a separate tracking mechanism if needed
   */
  async clearExpired (): Promise<number> {
    // This would require implementing a separate tracking system
    // For now, return 0 as Vercel Blob handles storage management
    return 0
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async withRetry<T> (
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt === this.maxRetries) {
          break
        }

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          break
        }

        // Exponential backoff with jitter
        const delay =
          this.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        await this.sleep(delay)

        console.warn(
          `Cache operation retry ${attempt}/${this.maxRetries} for ${operationName}:`,
          lastError.message
        )
      }
    }

    throw new Error(
      `Cache operation failed after ${this.maxRetries} attempts (${operationName}): ${lastError?.message}`
    )
  }

  /**
   * Determines if an error should not be retried
   */
  private isNonRetryableError (error: Error): boolean {
    const nonRetryableMessages = [
      'File size exceeds maximum',
      'Invalid token',
      'Unauthorized',
      'Forbidden'
    ]

    return nonRetryableMessages.some(message =>
      error.message.toLowerCase().includes(message.toLowerCase())
    )
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance factory
let _cacheServiceInstance: ReceiptCacheService | null = null

export const getCacheService = (): ReceiptCacheService => {
  if (!_cacheServiceInstance) {
    _cacheServiceInstance = new ReceiptCacheService()
  }
  return _cacheServiceInstance
}
