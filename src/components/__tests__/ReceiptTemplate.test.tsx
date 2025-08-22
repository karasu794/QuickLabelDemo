import React from 'react'
import { render } from '@testing-library/react'
import { ReceiptTemplate } from '../ReceiptTemplate'
import { createSampleReceiptData } from '@/lib/utils/receiptTemplate'
import { ReceiptData } from '@/types/receipt'

// Mock renderToStaticMarkup to avoid server-side rendering issues in tests
jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: jest.fn((element) => '<div>Mocked HTML</div>')
}))

describe('ReceiptTemplate', () => {
  let sampleData: ReceiptData

  beforeEach(() => {
    sampleData = createSampleReceiptData()
  })

  it('renders without crashing', () => {
    render(<ReceiptTemplate data={sampleData} />)
  })

  it('displays receipt number correctly', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    expect(getByText(`領収書番号: ${sampleData.receiptNumber}`)).toBeInTheDocument()
  })

  it('displays customer information correctly', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    expect(getByText(`${sampleData.customerInfo.companyName} 様`)).toBeInTheDocument()
    expect(getByText(sampleData.customerInfo.address!)).toBeInTheDocument()
    expect(getByText(`TEL: ${sampleData.customerInfo.phone}`)).toBeInTheDocument()
  })

  it('displays all items in the table', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    
    sampleData.items.forEach(item => {
      expect(getByText(item.description)).toBeInTheDocument()
      expect(getByText(item.quantity.toString())).toBeInTheDocument()
    })
  })

  it('displays totals correctly', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    
    expect(getByText(`¥${sampleData.totals.subtotal.toLocaleString('ja-JP')}`)).toBeInTheDocument()
    expect(getByText(`¥${sampleData.totals.tax.toLocaleString('ja-JP')}`)).toBeInTheDocument()
    expect(getByText(`¥${sampleData.totals.total.toLocaleString('ja-JP')}`)).toBeInTheDocument()
  })

  it('displays payment information', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    
    expect(getByText(sampleData.paymentInfo.method)).toBeInTheDocument()
    expect(getByText(sampleData.paymentInfo.transactionId)).toBeInTheDocument()
    expect(getByText(sampleData.paymentInfo.status)).toBeInTheDocument()
  })

  it('displays company information', () => {
    const { getByText } = render(<ReceiptTemplate data={sampleData} />)
    
    expect(getByText(sampleData.companyInfo.name)).toBeInTheDocument()
    expect(getByText(sampleData.companyInfo.address)).toBeInTheDocument()
    expect(getByText(`TEL: ${sampleData.companyInfo.phone}`)).toBeInTheDocument()
  })

  it('includes company seal image', () => {
    const { container } = render(<ReceiptTemplate data={sampleData} />)
    const sealImage = container.querySelector('.company-seal img')
    expect(sealImage).toBeInTheDocument()
    expect(sealImage).toHaveAttribute('alt', '社印')
  })

  it('handles missing optional customer information', () => {
    const dataWithoutOptionalInfo = {
      ...sampleData,
      customerInfo: {
        name: '田中太郎'
      }
    }

    const { getByText, queryByText } = render(<ReceiptTemplate data={dataWithoutOptionalInfo} />)
    
    expect(getByText('田中太郎 様')).toBeInTheDocument()
    // Check that customer TEL is not displayed (company TEL will still be there)
    const customerSection = document.querySelector('.customer-details')
    expect(customerSection?.textContent).not.toContain('TEL:')
  })

  it('displays fees when present', () => {
    const dataWithFees = {
      ...sampleData,
      totals: {
        ...sampleData.totals,
        fees: {
          serviceFee: 500,
          processingFee: 300,
          phoenixException: false
        }
      }
    }

    const { getByText, getAllByText } = render(<ReceiptTemplate data={dataWithFees} />)
    
    expect(getByText('サービス手数料')).toBeInTheDocument()
    expect(getByText('決済手数料')).toBeInTheDocument()
    
    // Check for specific fee amounts in the totals table
    const totalsTable = document.querySelector('.totals-table')
    expect(totalsTable?.textContent).toContain('¥500')
    expect(totalsTable?.textContent).toContain('¥300')
  })

  it('does not display fees when they are zero', () => {
    const dataWithoutFees = {
      ...sampleData,
      totals: {
        ...sampleData.totals,
        fees: {
          serviceFee: 0,
          processingFee: 0,
          phoenixException: false
        }
      }
    }

    const { queryByText } = render(<ReceiptTemplate data={dataWithoutFees} />)
    
    expect(queryByText('サービス手数料')).not.toBeInTheDocument()
    expect(queryByText('決済手数料')).not.toBeInTheDocument()
  })

  it('includes proper HTML structure for PDF generation', () => {
    const { container } = render(<ReceiptTemplate data={sampleData} />)
    
    // Check for essential HTML elements
    expect(container.querySelector('.receipt-document')).toBeInTheDocument()
    expect(container.querySelector('.receipt-container')).toBeInTheDocument()
    expect(container.querySelector('style')).toBeInTheDocument()
  })

  it('uses Noto Sans JP font in styles', () => {
    const { container } = render(<ReceiptTemplate data={sampleData} />)
    const styleElement = container.querySelector('style')
    
    expect(styleElement?.textContent).toContain('Noto Sans JP')
    expect(styleElement?.textContent).toContain('@import url')
  })
})