/**
 * @jest-environment node
 */
import { GET } from '../route'

// Mock NextRequest
const mockNextRequest = (url: string) => ({
  url,
  method: 'GET',
  headers: new Map(),
  nextUrl: new URL(url)
})

// Mock the dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn()
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

jest.mock('@/lib/services/receiptNumberService', () => ({
  receiptNumberService: {
    generateReceiptNumber: jest.fn(),
    getExistingReceiptNumber: jest.fn()
  }
}))

jest.mock('@/lib/services/cacheService', () => ({
  getCacheService: jest.fn()
}))

jest.mock('@/lib/services/pdfGenerationService', () => ({
  getPDFGenerationService: jest.fn(),
  cleanupPDFService: jest.fn()
}))

jest.mock('@/lib/services/dataRetrievalService', () => ({
  dataRetrievalService: {
    getReceiptData: jest.fn()
  }
}))

jest.mock('@/lib/utils/receiptTemplate', () => ({
  renderReceiptToHTML: jest.fn(),
  validateReceiptData: jest.fn()
}))

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn()
}))

describe('GET /api/receipts/[transactionId]', () => {
  const mockTransactionId = 'test-transaction-123'
  const mockUserId = 'test-user-456'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if transactionId is missing', async () => {
    const request = mockNextRequest('http://localhost:3000/api/receipts/')
    const params = { transactionId: '' }

    const response = await GET(request as any, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('MISSING_TRANSACTION_ID')
  })

  it('should return 401 if user is not authenticated', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    
    // Mock cookies
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    }
    cookies.mockReturnValue(mockCookieStore)

    // Mock Supabase client with no session
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null }
        })
      }
    }
    createServerClient.mockReturnValue(mockSupabaseClient)

    const request = mockNextRequest(`http://localhost:3000/api/receipts/${mockTransactionId}`)
    const params = { transactionId: mockTransactionId }

    const response = await GET(request as any, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('should handle cache hit scenario', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    const { getCacheService } = require('@/lib/services/cacheService')
    const { receiptNumberService } = require('@/lib/services/receiptNumberService')
    const { createServiceRoleClient } = require('@/lib/supabase/server')
    
    // Mock cookies
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    }
    cookies.mockReturnValue(mockCookieStore)

    // Mock authenticated user
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { id: mockUserId } 
            } 
          }
        })
      }
    }
    createServerClient.mockReturnValue(mockSupabaseClient)

    // Mock cache service with existing PDF
    const mockPdfBuffer = Buffer.from('mock pdf content')
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(mockPdfBuffer),
      generateSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com/receipt.pdf')
    }
    getCacheService.mockReturnValue(mockCacheService)

    // Mock receipt number service
    receiptNumberService.getExistingReceiptNumber.mockResolvedValue('2501010001')

    // Mock transaction type determination
    const mockServiceRoleClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockTransactionId },
              error: null
            })
          })
        })
      })
    }
    createServiceRoleClient.mockReturnValue(mockServiceRoleClient)

    const request = mockNextRequest(`http://localhost:3000/api/receipts/${mockTransactionId}`)
    const params = { transactionId: mockTransactionId }

    const response = await GET(request as any, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.url).toBe('https://signed-url.com/receipt.pdf')
    expect(data.data.receiptNumber).toBe('2501010001')
    expect(mockCacheService.get).toHaveBeenCalledWith(mockTransactionId)
  })

  it('should generate new PDF when cache miss', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    const { getCacheService } = require('@/lib/services/cacheService')
    const { getPDFGenerationService, cleanupPDFService } = require('@/lib/services/pdfGenerationService')
    const { dataRetrievalService } = require('@/lib/services/dataRetrievalService')
    const { receiptNumberService } = require('@/lib/services/receiptNumberService')
    const { renderReceiptToHTML, validateReceiptData } = require('@/lib/utils/receiptTemplate')
    const { createServiceRoleClient } = require('@/lib/supabase/server')
    
    // Mock cookies
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    }
    cookies.mockReturnValue(mockCookieStore)

    // Mock authenticated user
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { id: mockUserId } 
            } 
          }
        })
      }
    }
    createServerClient.mockReturnValue(mockSupabaseClient)

    // Mock cache service with no existing PDF
    const mockPdfBuffer = Buffer.from('new mock pdf content')
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('cache-key'),
      generateSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com/new-receipt.pdf')
    }
    getCacheService.mockReturnValue(mockCacheService)

    // Mock PDF generation service
    const mockPdfService = {
      generatePDF: jest.fn().mockResolvedValue(mockPdfBuffer)
    }
    getPDFGenerationService.mockReturnValue(mockPdfService)
    cleanupPDFService.mockResolvedValue(undefined)

    // Mock data retrieval service
    const mockReceiptData = {
      receiptNumber: '',
      issueDate: '2025-01-01',
      transactionId: mockTransactionId,
      customerInfo: { name: 'Test Customer' },
      companyInfo: { name: 'Test Company', address: 'Test Address', phone: '123-456-7890' },
      items: [],
      totals: { subtotal: 1000, tax: 100, total: 1100, fees: { serviceFee: 50, processingFee: 25 } },
      paymentInfo: { method: 'card', transactionId: mockTransactionId, paymentDate: '2025-01-01', status: 'completed' },
      feeRates: { serviceRate: 0.05, processingRate: 0.025, taxRate: 0.1 }
    }
    dataRetrievalService.getReceiptData.mockResolvedValue(mockReceiptData)

    // Mock receipt number service
    receiptNumberService.getExistingReceiptNumber.mockResolvedValue(null)
    receiptNumberService.generateReceiptNumber.mockResolvedValue('2501010002')

    // Mock HTML rendering
    renderReceiptToHTML.mockReturnValue('<html>Mock Receipt HTML</html>')
    validateReceiptData.mockReturnValue(true)

    // Mock transaction type determination
    const mockServiceRoleClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockTransactionId },
              error: null
            })
          })
        })
      })
    }
    createServiceRoleClient.mockReturnValue(mockServiceRoleClient)

    const request = mockNextRequest(`http://localhost:3000/api/receipts/${mockTransactionId}`)
    const params = { transactionId: mockTransactionId }

    const response = await GET(request as any, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.url).toBe('https://signed-url.com/new-receipt.pdf')
    expect(data.data.receiptNumber).toBe('2501010002')
    
    // Verify the flow
    expect(mockCacheService.get).toHaveBeenCalledWith(mockTransactionId)
    expect(dataRetrievalService.getReceiptData).toHaveBeenCalledWith(mockTransactionId, mockUserId)
    expect(receiptNumberService.generateReceiptNumber).toHaveBeenCalled()
    expect(renderReceiptToHTML).toHaveBeenCalled()
    expect(mockPdfService.generatePDF).toHaveBeenCalledWith('<html>Mock Receipt HTML</html>')
    expect(mockCacheService.set).toHaveBeenCalledWith(mockTransactionId, mockPdfBuffer)
    expect(cleanupPDFService).toHaveBeenCalled()
  })

  it('should return PDF binary when format=pdf', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    const { getCacheService } = require('@/lib/services/cacheService')
    const { receiptNumberService } = require('@/lib/services/receiptNumberService')
    const { createServiceRoleClient } = require('@/lib/supabase/server')
    
    // Mock cookies
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    }
    cookies.mockReturnValue(mockCookieStore)

    // Mock authenticated user
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { id: mockUserId } 
            } 
          }
        })
      }
    }
    createServerClient.mockReturnValue(mockSupabaseClient)

    // Mock cache service with existing PDF
    const mockPdfBuffer = Buffer.from('mock pdf content')
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(mockPdfBuffer)
    }
    getCacheService.mockReturnValue(mockCacheService)

    // Mock receipt number service
    receiptNumberService.getExistingReceiptNumber.mockResolvedValue('2501010003')

    // Mock transaction type determination
    const mockServiceRoleClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockTransactionId },
              error: null
            })
          })
        })
      })
    }
    createServiceRoleClient.mockReturnValue(mockServiceRoleClient)

    const request = mockNextRequest(`http://localhost:3000/api/receipts/${mockTransactionId}?format=pdf`)
    const params = { transactionId: mockTransactionId }

    const response = await GET(request as any, { params })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
    expect(response.headers.get('Content-Disposition')).toContain('receipt_2501010003.pdf')
  })

  it('should handle errors appropriately', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    const { getCacheService } = require('@/lib/services/cacheService')
    const { dataRetrievalService } = require('@/lib/services/dataRetrievalService')
    const { cleanupPDFService } = require('@/lib/services/pdfGenerationService')
    
    // Mock cookies
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    }
    cookies.mockReturnValue(mockCookieStore)

    // Mock authenticated user
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { id: mockUserId } 
            } 
          }
        })
      }
    }
    createServerClient.mockReturnValue(mockSupabaseClient)

    // Mock cache service with no existing PDF
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null)
    }
    getCacheService.mockReturnValue(mockCacheService)

    // Mock data retrieval service to throw error
    dataRetrievalService.getReceiptData.mockRejectedValue(new Error('取引が見つからない'))
    cleanupPDFService.mockResolvedValue(undefined)

    const request = mockNextRequest(`http://localhost:3000/api/receipts/${mockTransactionId}`)
    const params = { transactionId: mockTransactionId }

    const response = await GET(request as any, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('TRANSACTION_NOT_FOUND')
    expect(cleanupPDFService).toHaveBeenCalled()
  })
})