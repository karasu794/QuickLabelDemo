// Receipt Utility Functions

import { RECEIPT_CONFIG } from '@/lib/config/receipt'

/**
 * Formats a date to YYMMDD format for receipt number generation
 */
export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Formats a receipt number from date key and sequence
 */
export const formatReceiptNumber = (dateKey: string, sequence: number): string => {
  const sequenceStr = sequence.toString().padStart(4, '0')
  return `${dateKey}0${sequenceStr}`
}

/**
 * Validates transaction ID format (UUID)
 */
export const isValidTransactionId = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Generates cache key for Vercel Blob storage
 */
export const generateCacheKey = (transactionId: string, transactionType: string): string => {
  return `receipts/${transactionType}/${transactionId}.pdf`
}

/**
 * Formats currency amount for display
 */
export const formatCurrency = (amount: number, currency: string = 'JPY'): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formats date for receipt display
 */
export const formatReceiptDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}

/**
 * Calculates tax amount based on subtotal and tax rate
 */
export const calculateTax = (subtotal: number, taxRate: number = 0.1): number => {
  return Math.floor(subtotal * taxRate)
}

/**
 * Validates customer information completeness
 */
export const validateCustomerInfo = (customerInfo: any): boolean => {
  return !!(customerInfo?.name && (customerInfo?.companyName || customerInfo?.address))
}

/**
 * Sanitizes HTML content for PDF generation
 */
export const sanitizeHtmlContent = (content: string): string => {
  return content
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&]/g, '&amp;')
    .replace(/["]/g, '&quot;')
    .replace(/[']/g, '&#x27;')
}

/**
 * Generates error response object
 */
export const createErrorResponse = (code: string, message: string, details?: any) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Generates success response object
 */
export const createSuccessResponse = (data: any) => {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * Checks if a file size is within allowed limits
 */
export const isValidFileSize = (size: number): boolean => {
  return size <= RECEIPT_CONFIG.CACHE_CONFIG.maxFileSize
}

/**
 * Generates a unique filename for PDF storage
 */
export const generatePdfFilename = (transactionId: string, timestamp?: Date): string => {
  const date = timestamp || new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  return `receipt_${transactionId}_${dateStr}.pdf`
}