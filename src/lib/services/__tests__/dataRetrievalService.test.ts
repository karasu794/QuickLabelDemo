import { DataRetrievalService } from '../dataRetrievalService'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { RECEIPT_CONFIG } from '@/lib/config/receipt'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn()
}))

describe('DataRetrievalService', () => {
  let service: DataRetrievalService
  let mockSupabase: any

  const mockTransactionId = 'test-transaction-id'
  const mockUserId = 'test-user-id'

  const mockShipment = {
    id: mockTransactionId,
    user_id: mockUserId,
    tracking_number: 'TEST123456789',
    status: 'completed',
    shipper_country: 'US',
    payment_id: 'pay_123',
    square_payment_id: null,
    total_amount: 1100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockProfile = {
    id: mockUserId,
    full_name: 'テスト太郎',
    company_name: 'テスト株式会社',
    address: '東京都渋谷区テスト1-1-1',
    phone_number: '03-1234-5678',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z'
  }

  const mockAppSettings = [
    { key: 'service_fee_percentage', value: 5 },
    { key: 'processing_fee_percentage', value: 3 },
    { key: 'tax_rate', value: 10 },
    { key: 'exchange_rate', value: 150 }
  ]

  beforeEach(() => {
    // Create a comprehensive mock structure
    const createMockChain = (finalResult: any) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue(finalResult)
          })),
          single: jest.fn().mockResolvedValue(finalResult)
        })),
        in: jest.fn().mockResolvedValue(finalResult)
      }))
    })

    mockSupabase = {
      from: jest.fn((table: string) => {
        switch (table) {
          case 'shipments':
            return createMockChain({ data: mockShipment, error: null })
          case 'open_shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'profiles':
            return createMockChain({ data: mockProfile, error: null })
          case 'app_settings':
            return createMockChain({ data: mockAppSettings, error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })
    }
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)

    // Create service instance after setting up the mock
    service = new DataRetrievalService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getReceiptData', () => {
    it('should successfully retrieve receipt data for shipment', async () => {
      const result = await service.getReceiptData(mockTransactionId, mockUserId)

      expect(result).toMatchObject({
        transactionId: mockTransactionId,
        customerInfo: {
          name: 'テスト太郎',
          companyName: 'テスト株式会社',
          address: '東京都渋谷区テスト1-1-1',
          phone: '03-1234-5678'
        },
        companyInfo: RECEIPT_CONFIG.COMPANY_INFO,
        items: [
          {
            description: `配送サービス (追跡番号: ${mockShipment.tracking_number})`,
            quantity: 1,
            unitPrice: 1100,
            amount: 1100
          }
        ],
        paymentInfo: {
          method: 'クレジットカード',
          transactionId: 'pay_123',
          status: '完了'
        }
      })

      expect(result.totals).toHaveProperty('subtotal')
      expect(result.totals).toHaveProperty('tax')
      expect(result.totals).toHaveProperty('total')
      expect(result.totals.fees).toHaveProperty('serviceFee')
      expect(result.totals.fees).toHaveProperty('processingFee')
      expect(result.totals.fees.phoenixException).toBe(false)
    })

    it('should handle Phoenix transaction correctly', async () => {
      const phoenixShipment = { ...mockShipment, shipper_country: 'JP' }

      // Update mock for Phoenix transaction
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(finalResult)
              })),
              single: jest.fn().mockResolvedValue(finalResult)
            })),
            in: jest.fn().mockResolvedValue(finalResult)
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({ data: phoenixShipment, error: null })
          case 'open_shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'profiles':
            return createMockChain({ data: mockProfile, error: null })
          case 'app_settings':
            return createMockChain({ data: mockAppSettings, error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.getReceiptData(mockTransactionId, mockUserId)

      expect(result.totals.fees.phoenixException).toBe(true)
      // Phoenix取引では手数料が減額されるため、通常より低い値になる
      expect(result.totals.fees.serviceFee).toBeLessThan(50) // 通常の5%より低い
    })

    it('should handle open_shipment transaction', async () => {
      const mockOpenShipment = {
        id: mockTransactionId,
        user_id: mockUserId,
        master_tracking_number: 'MASTER123',
        status: 'confirmed',
        total_packages: 3,
        packages_added: 3,
        shipper_info: {
          address: { countryCode: 'US' }
        },
        recipient_info: {},
        service_type: 'FEDEX_GROUND',
        payment_id: 'pay_456',
        total_amount: 3300,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Update mock for open_shipment transaction
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(finalResult)
              })),
              single: jest.fn().mockResolvedValue(finalResult)
            })),
            in: jest.fn().mockResolvedValue(finalResult)
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'open_shipments':
            return createMockChain({ data: mockOpenShipment, error: null })
          case 'profiles':
            return createMockChain({ data: mockProfile, error: null })
          case 'app_settings':
            return createMockChain({ data: mockAppSettings, error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.getReceiptData(mockTransactionId, mockUserId)

      expect(result.items[0]).toMatchObject({
        description: '複数パッケージ配送サービス (3個口)',
        quantity: 3,
        unitPrice: 1100,
        amount: 3300
      })
    })

    it('should throw error for non-existent transaction', async () => {
      // Update mock to return no data for all tables
      mockSupabase.from.mockImplementation(() => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(finalResult)
              })),
              single: jest.fn().mockResolvedValue(finalResult)
            })),
            in: jest.fn().mockResolvedValue(finalResult)
          }))
        })
        return createMockChain({ data: null, error: { code: 'PGRST116' } })
      })

      await expect(
        service.getReceiptData(mockTransactionId, mockUserId)
      ).rejects.toThrow('取引が見つかりません')
    })

    it('should throw error for unauthorized access', async () => {
      // Update mock to simulate unauthorized access (different user)
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(finalResult)
              })),
              single: jest.fn().mockResolvedValue(finalResult)
            })),
            in: jest.fn().mockResolvedValue(finalResult)
          }))
        })

        switch (table) {
          case 'shipments':
            // Return PGRST116 error for unauthorized access
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'open_shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'profiles':
            return createMockChain({ data: mockProfile, error: null })
          case 'app_settings':
            return createMockChain({ data: mockAppSettings, error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      await expect(
        service.getReceiptData(mockTransactionId, 'different-user')
      ).rejects.toThrow('取引が見つかりません')
    })

    it('should use default fee rates when app_settings are not available', async () => {
      // Update mock to return empty app_settings
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(finalResult)
              })),
              single: jest.fn().mockResolvedValue(finalResult)
            })),
            in: jest.fn().mockResolvedValue(finalResult)
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({ data: mockShipment, error: null })
          case 'open_shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'profiles':
            return createMockChain({ data: mockProfile, error: null })
          case 'app_settings':
            return createMockChain({ data: [], error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.getReceiptData(mockTransactionId, mockUserId)

      expect(result.feeRates).toEqual({
        serviceRate: 0.05,
        processingRate: 0.03,
        taxRate: 0.1,
        exchangeRate: 150
      })
    })
  })

  describe('transactionExists', () => {
    it('should return true for existing shipment', async () => {
      const result = await service.transactionExists('test-id')
      expect(result).toBe(true)
    })

    it('should return true for existing open_shipment', async () => {
      // Update mock to return open_shipment data
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(finalResult)
            }))
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
          case 'open_shipments':
            return createMockChain({ data: { id: 'test-id' }, error: null })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.transactionExists('test-id')
      expect(result).toBe(true)
    })

    it('should return false for non-existent transaction', async () => {
      // Update mock to return no data for all tables
      mockSupabase.from.mockImplementation(() => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(finalResult)
            }))
          }))
        })
        return createMockChain({ data: null, error: { code: 'PGRST116' } })
      })

      const result = await service.transactionExists('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('isTransactionModified', () => {
    const testDate = '2024-01-01T00:00:00Z'
    const laterDate = '2024-01-02T00:00:00Z'

    it('should return false when transaction is not modified', async () => {
      // Update mock to return shipment with older updated_at
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(finalResult)
            }))
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({
              data: { updated_at: testDate },
              error: null
            })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.isTransactionModified('test-id', laterDate)
      expect(result).toBe(false)
    })

    it('should return true when transaction is modified', async () => {
      // Update mock to return shipment with newer updated_at
      mockSupabase.from.mockImplementation((table: string) => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(finalResult)
            }))
          }))
        })

        switch (table) {
          case 'shipments':
            return createMockChain({
              data: { updated_at: laterDate },
              error: null
            })
          default:
            return createMockChain({ data: null, error: { code: 'PGRST116' } })
        }
      })

      const result = await service.isTransactionModified('test-id', testDate)
      expect(result).toBe(true)
    })

    it('should return true when transaction data is not found', async () => {
      // Update mock to return no data for all tables
      mockSupabase.from.mockImplementation(() => {
        const createMockChain = (finalResult: any) => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(finalResult)
            }))
          }))
        })
        return createMockChain({ data: null, error: { code: 'PGRST116' } })
      })

      const result = await service.isTransactionModified(
        'non-existent-id',
        testDate
      )
      expect(result).toBe(true)
    })
  })

  describe('Fee Calculation Logic', () => {
    it('should calculate fees correctly for regular transaction', () => {
      const service = new DataRetrievalService()

      // Access private methods through type assertion for testing
      const calculateServiceFee = (service as any).calculateServiceFee.bind(
        service
      )
      const calculateProcessingFee = (
        service as any
      ).calculateProcessingFee.bind(service)

      const amount = 1000
      const serviceRate = 0.05 // 5%
      const processingRate = 0.03 // 3%

      const serviceFee = calculateServiceFee(amount, serviceRate, false)
      const processingFee = calculateProcessingFee(
        amount,
        processingRate,
        false
      )

      expect(serviceFee).toBe(50) // 1000 * 0.05 = 50
      expect(processingFee).toBe(30) // 1000 * 0.03 = 30
    })

    it('should apply Phoenix discount correctly', () => {
      const service = new DataRetrievalService()

      const calculateServiceFee = (service as any).calculateServiceFee.bind(
        service
      )
      const calculateProcessingFee = (
        service as any
      ).calculateProcessingFee.bind(service)

      const amount = 1000
      const serviceRate = 0.05 // 5%
      const processingRate = 0.03 // 3%

      const serviceFee = calculateServiceFee(amount, serviceRate, true)
      const processingFee = calculateProcessingFee(amount, processingRate, true)

      expect(serviceFee).toBe(40) // 1000 * 0.05 * 0.8 = 40 (20% discount)
      expect(processingFee).toBe(21) // 1000 * 0.03 * 0.7 = 21 (30% discount)
    })
  })
})
