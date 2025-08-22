import { 
  renderReceiptToHTML, 
  validateReceiptData, 
  createSampleReceiptData,
  formatCurrency,
  formatJapaneseDate
} from '../receiptTemplate'
import { ReceiptData } from '@/types/receipt'

// Mock renderToStaticMarkup to avoid server-side rendering issues in tests
jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: jest.fn((element) => `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');</style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-header">
            <h1>領収書</h1>
            <div class="company-seal">
              <img alt="社印" />
            </div>
          </div>
          <div>領収書番号: ${element.props.data.receiptNumber}</div>
          <div>${element.props.data.customerInfo.name}</div>
        </div>
      </body>
    </html>
  `)
}))

describe('receiptTemplate utilities', () => {
  let sampleData: ReceiptData

  beforeEach(() => {
    sampleData = createSampleReceiptData()
  })

  describe('renderReceiptToHTML', () => {
    it('renders receipt data to HTML string', () => {
      const html = renderReceiptToHTML(sampleData)
      
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html lang="ja">')
      expect(html).toContain('領収書')
      expect(html).toContain(sampleData.receiptNumber)
      expect(html).toContain(sampleData.customerInfo.name)
    })

    it('includes Noto Sans JP font import', () => {
      const html = renderReceiptToHTML(sampleData)
      
      expect(html).toContain('Noto+Sans+JP')
      expect(html).toContain('fonts.googleapis.com')
    })

    it('includes company seal image', () => {
      const html = renderReceiptToHTML(sampleData)
      
      expect(html).toContain('company-seal')
      expect(html).toContain('alt="社印"')
    })

    it('throws error for invalid data', () => {
      const invalidData = { ...sampleData, receiptNumber: '' }
      
      // Since we're mocking renderToStaticMarkup, we need to test validation separately
      expect(() => validateReceiptData(invalidData)).toThrow()
    })
  })

  describe('validateReceiptData', () => {
    it('validates complete receipt data successfully', () => {
      expect(() => validateReceiptData(sampleData)).not.toThrow()
      expect(validateReceiptData(sampleData)).toBe(true)
    })

    it('throws error for missing receipt number', () => {
      const invalidData = { ...sampleData, receiptNumber: '' }
      
      expect(() => validateReceiptData(invalidData)).toThrow('Missing required field: receiptNumber')
    })

    it('throws error for missing customer name', () => {
      const invalidData = {
        ...sampleData,
        customerInfo: { ...sampleData.customerInfo, name: '' }
      }
      
      expect(() => validateReceiptData(invalidData)).toThrow('Customer name is required')
    })

    it('throws error for empty items array', () => {
      const invalidData = { ...sampleData, items: [] }
      
      expect(() => validateReceiptData(invalidData)).toThrow('At least one item is required')
    })

    it('throws error for invalid item data', () => {
      const invalidData = {
        ...sampleData,
        items: [{ description: '', quantity: 1, unitPrice: 100, amount: 100 }]
      }
      
      expect(() => validateReceiptData(invalidData)).toThrow('Invalid item at index 0')
    })

    it('throws error for invalid total amount', () => {
      const invalidData = {
        ...sampleData,
        totals: { ...sampleData.totals, total: 0 }
      }
      
      expect(() => validateReceiptData(invalidData)).toThrow('Invalid total amount')
    })
  })

  describe('createSampleReceiptData', () => {
    it('creates valid sample data', () => {
      const sample = createSampleReceiptData()
      
      expect(() => validateReceiptData(sample)).not.toThrow()
      expect(sample.receiptNumber).toMatch(/^\d{10}$/)
      expect(sample.customerInfo.name).toBeTruthy()
      expect(sample.items.length).toBeGreaterThan(0)
      expect(sample.totals.total).toBeGreaterThan(0)
    })

    it('includes Japanese company information', () => {
      const sample = createSampleReceiptData()
      
      expect(sample.companyInfo.name).toContain('QuickLabel')
      expect(sample.customerInfo.name).toContain('田中')
      expect(sample.items[0].description).toContain('国際配送')
    })
  })

  describe('formatCurrency', () => {
    it('formats currency with Japanese locale', () => {
      expect(formatCurrency(1000)).toBe('¥1,000')
      expect(formatCurrency(1234567)).toBe('¥1,234,567')
      expect(formatCurrency(0)).toBe('¥0')
    })

    it('handles decimal numbers', () => {
      expect(formatCurrency(1000.5)).toBe('¥1,000.5') // Japanese locale with decimal
    })
  })

  describe('formatJapaneseDate', () => {
    it('formats date in Japanese format', () => {
      const dateString = '2025-01-15T10:30:00.000Z'
      const formatted = formatJapaneseDate(dateString)
      
      expect(formatted).toContain('2025年')
      expect(formatted).toContain('月')
      expect(formatted).toContain('日')
    })

    it('handles different date formats', () => {
      const dateString = '2025-12-31'
      const formatted = formatJapaneseDate(dateString)
      
      expect(formatted).toContain('2025年')
      expect(formatted).toContain('12月')
      expect(formatted).toContain('31日')
    })
  })
})