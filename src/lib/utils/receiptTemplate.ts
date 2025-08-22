import { ReceiptData } from '@/types/receipt'
import { RECEIPT_CONFIG } from '@/lib/config/receipt'

/**
 * Utility functions for receipt template validation and HTML generation
 * 
 * This file generates HTML templates without using React components
 * to avoid Next.js client-side bundling issues with react-dom/server.
 */

/**
 * Generates HTML template for PDF receipt generation
 * 
 * @param data - Receipt data to render
 * @returns HTML string ready for PDF generation
 */
export const renderReceiptToHTML = (data: ReceiptData): string => {
  try {
    const {
      receiptNumber,
      issueDate,
      customerInfo,
      companyInfo,
      items,
      totals,
      paymentInfo
    } = data

    // Format currency for Japanese Yen
    const formatCurrency = (amount: number): string => {
      return `¥${amount.toLocaleString('ja-JP')}`
    }

    // Format date for Japanese format
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // Company seal placeholder (hidden by default). Will be replaced with the provided image later.
    const companySealBase64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="58" fill="none" stroke="#C4662A" stroke-width="3"/>
      </svg>
    `)

    const inlineStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      .receipt-document {
        font-family: '${RECEIPT_CONFIG.FONTS.primary}', ${RECEIPT_CONFIG.FONTS.fallback};
        font-size: 11px;
        line-height: 1.4;
        color: #333;
        background: white;
        width: 100%;
        min-height: 100vh;
      }
      
      .receipt-container {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        padding: 14mm;
        background: white;
      }
      
      /* Main title at the top */
      .receipt-title-main {
        font-size: 24px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 24px;
        color: #333;
        letter-spacing: 0.5em;
      }

      /* Header section */
      .receipt-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      
      .header-left {
        flex: 1;
      }
      
      .recipient-info {
        margin-bottom: 15px;
      }
      
      .recipient-company {
        font-size: 15px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .recipient-person {
        font-size: 11px;
        margin-top: 4px;
      }
      
      .recipient-underline {
        width: 100%;
        height: 1px;
        background-color: #333;
        margin: 10px 0 12px 0;
      }
      
      .header-right {
        text-align: right;
        min-width: 250px;
        position: relative;
      }
      
      .issuer-info {
        font-size: 9.5px;
        line-height: 1.35;
      }
      
      .receipt-number, .issue-date {
        margin-bottom: 5px;
        font-size: 11px;
        font-weight: 500;
      }
      
      .company-name-right {
        font-weight: 600;
        font-size: 11px;
        margin: 6px 0 2px 0;
      }
      
      .company-address {
        margin-bottom: 1px;
        font-size: 9px;
      }
      
      .company-contact {
        margin-bottom: 1px;
        font-size: 9px;
      }

      .company-seal {
        position: absolute;
        right: 12mm;           /* 参考画像の余白感に合わせてやや外側 */
        top: 36mm;             /* ヘッダ右ブロック中央より少し下 */
        width: 30mm;           /* 直径 約30mm（参考画像比） */
        height: 30mm;
        opacity: 0.95;
        transform: rotate(-12deg); /* 反時計回りに約12度 */
        object-fit: contain;
        display: none; /* 実画像が渡されたときにstyleで有効化 */
      }
      
      /* Subject section */
      .subject-section {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        border-bottom: 1px solid #444;
        padding-bottom: 3px;
        font-size: 11px;
      }
      
      .subject-label {
        font-weight: 500;
        margin-right: 8px;
      }
      
      .subject-content {
        flex: 1;
      }
      
      /* Payment and total section */
      .payment-total-section {
        margin-bottom: 16px;
      }
      
      .payment-method {
        margin-bottom: 8px;
        font-size: 11px;
      }
      
      .total-amount {
        margin-bottom: 8px;
      }
      
      .total-amount-text {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      
      .total-amount-underline {
        height: 0;
        border-bottom: 3px solid #333;
      }
      
      /* Items table */
      .items-section {
        margin-bottom: 20px;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        border: 1.5px solid #333;
      }
      
      .items-table th,
      .items-table td {
        border: 1px solid #333;
        padding: 7px 6px;
        text-align: center;
        font-size: 10px;
      }
      
      .items-table th {
        background-color: #8d8d8d;
        color: white;
        font-weight: 500;
      }
      
      .no-col { width: 6%; }
      .item-col { width: 48%; text-align: left; }
      .quantity-col { width: 10%; }
      .unit-price-col { width: 18%; text-align: right; font-variant-numeric: tabular-nums; }
      .amount-col { width: 18%; text-align: right; font-variant-numeric: tabular-nums; }
      
      .tracking-row {
        background-color: #f7f7f7;
      }
      
      .tracking-number-cell {
        text-align: center;
        font-size: 10px;
        padding: 8px;
        border: 1px solid #333 !important;
        background-color: #f7f7f7;
      }
      
      /* Summary section */
      .summary-section {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 20px;
      }
      
      .summary-table {
        width: 260px;
      }
      
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 8px;
        border-bottom: 1px solid #ccc;
        font-size: 10px;
      }
      
      .summary-row.total-row {
        font-weight: 700;
        border-top: 2px solid #333;
        border-bottom: 2px solid #333;
        background-color: #efefef;
        font-size: 11px;
      }
      
      .summary-label {
        font-size: 10px;
      }
      
      .summary-value {
        font-size: 10px;
        text-align: right;
      }
      
      /* Notes section */
      .notes-section {
        margin-top: 24px;
        border: 1px solid #333;
        padding: 12px;
      }
      
      .notes-title {
        font-weight: 700;
        margin-bottom: 6px;
        font-size: 11px;
      }
      
      .notes-content {
        font-size: 9px;
        line-height: 1.55;
      }
      
      @media print {
      .receipt-container {
          margin: 0;
          padding: 10mm;
        }
      }
    `

    // Subject text helper
    const subjectText = (tracking?: string) => {
      if (tracking && tracking.length === 12) {
        return `FedEx：運送状番号(${tracking}) 国際送料`
      }
      return 'FedEx：運送状番号(12桁) 国際送料'
    }

    // Generate totals HTML
    let totalsHTML = `
      <tr>
        <td class="label-col">小計</td>
        <td class="amount-col">${formatCurrency(totals.subtotal)}</td>
      </tr>
    `
    
    if (totals.fees.serviceFee > 0) {
      totalsHTML += `
        <tr>
          <td class="label-col">サービス手数料</td>
          <td class="amount-col">${formatCurrency(totals.fees.serviceFee)}</td>
        </tr>
      `
    }
    
    if (totals.fees.processingFee > 0) {
      totalsHTML += `
        <tr>
          <td class="label-col">決済手数料</td>
          <td class="amount-col">${formatCurrency(totals.fees.processingFee)}</td>
        </tr>
      `
    }
    
    totalsHTML += `
      <tr>
        <td class="label-col">消費税</td>
        <td class="amount-col">${formatCurrency(totals.tax)}</td>
      </tr>
      <tr class="total-row">
        <td class="label-col">合計金額</td>
        <td class="amount-col">${formatCurrency(totals.total)}</td>
      </tr>
    `

    // Use provided tracking number if any
    const trackingNumber = data.trackingNumber

    // Generate full HTML with target layout
    const fullHTML = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>領収書 - ${receiptNumber}</title>
    <style>${inlineStyles}</style>
  </head>
  <body>
    <div class="receipt-document">
      <div class="receipt-container">
        <!-- Main title at the very top -->
        <div class="receipt-title-main">領収書</div>

        <!-- Header section with sender and recipient info -->
        <div class="receipt-header">
          <div class="header-left">
            <div class="recipient-info">
              <div class="recipient-company">${customerInfo.companyName || 'XXXXXXXXXX株式会社'} 御中</div>
              ${customerInfo.personName ? `<div class="recipient-person">ご担当：${customerInfo.personName} 様</div>` : ''}
              <div class="recipient-underline"></div>
            </div>
          </div>
          <div class="header-right">
            <div class="issuer-info">
              <div class="receipt-number">領収書No. ${receiptNumber || '000000000'}</div>
              <div class="issue-date">発行日 ${formatDate(issueDate)}</div>
              <div class="company-name-right">${companyInfo.displayNameJa || companyInfo.name}</div>
              ${companyInfo.address ? companyInfo.address.split('\n').map(line => `<div class="company-address">${line}</div>`).join('') : ''}
              ${companyInfo.registrationNumber ? `<div class="company-contact">登録番号：${companyInfo.registrationNumber}</div>` : ''}
              ${companyInfo.taxId ? `<div class="company-contact">${companyInfo.taxId}</div>` : ''}
            </div>
            <img class="company-seal" src="${companyInfo.sealImageDataUrl || companySealBase64}" alt="company seal" style="${companyInfo.sealImageDataUrl ? 'display:block' : 'display:none'}" />
          </div>
        </div>

        <!-- Subject line -->
          <div class="subject-section">
          <div class="subject-label">件名：</div>
          <div class="subject-content">${subjectText(trackingNumber || '')}</div>
        </div>

        <!-- Payment method and total amount -->
        <div class="payment-total-section">
          <div class="payment-method">
            下記の通り、クレジットカードにて領収いたしました。
          </div>
          <div class="total-amount">
            <div class="total-amount-text">合計金額：${formatCurrency(totals.total)} (税込)</div>
            <div class="total-amount-underline"></div>
          </div>
        </div>

        <!-- Items table -->
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                <th class="no-col">No.</th>
                <th class="item-col">項目</th>
                <th class="quantity-col">数量</th>
                <th class="unit-price-col">単価</th>
                <th class="amount-col">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="no-col">1</td>
                <td class="item-col">国際送料（消費税適応外）</td>
                <td class="quantity-col">1式</td>
                <td class="unit-price-col">${formatCurrency(Math.round(totals.subtotal))}</td>
                <td class="amount-col">${formatCurrency(Math.round(totals.subtotal))}</td>
              </tr>
              <tr>
                <td class="no-col">2</td>
                <td class="item-col">第三者請求利用料（2.5%）</td>
                <td class="quantity-col">1件</td>
                <td class="unit-price-col">${formatCurrency(Math.round(totals.fees?.serviceFee || 0))}</td>
                <td class="amount-col">${formatCurrency(Math.round(totals.fees?.serviceFee || 0))}</td>
              </tr>
              <tr>
                <td class="no-col">3</td>
                <td class="item-col">特別割引アカウント使用料</td>
                <td class="quantity-col">1件</td>
                <td class="unit-price-col">${formatCurrency(0)}</td>
                <td class="amount-col">${formatCurrency(0)}</td>
              </tr>
              <tr>
                <td class="no-col">4</td>
                <td class="item-col">決済システム手数料（4%）</td>
                <td class="quantity-col">1件</td>
                <td class="unit-price-col">${formatCurrency(Math.round(totals.fees?.processingFee || 0))}</td>
                <td class="amount-col">${formatCurrency(Math.round(totals.fees?.processingFee || 0))}</td>
              </tr>
              <tr class="tracking-row">
                <td colspan="5" class="tracking-number-cell">運送状番号：${trackingNumber || '(未入力)'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary calculation -->
        <div class="summary-section">
          <div class="summary-table">
            <div class="summary-row">
              <span class="summary-label">小計 (1+2+3+4)</span>
              <span class="summary-value">${formatCurrency(Math.round(totals.subtotal + (totals.fees?.serviceFee || 0) + (totals.fees?.processingFee || 0)))}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">消費税額 (2+3+4) ×10%</span>
              <span class="summary-value">${formatCurrency(Math.round(totals.tax))}</span>
            </div>
            <div class="summary-row total-row">
              <span class="summary-label">合計金額 (小計+消費税額)</span>
              <span class="summary-value">${formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        <!-- Notes section -->
        <div class="notes-section">
          <div class="notes-title">【備考】</div>
          <div class="notes-content">
            FedEx国際送料は、お客様がご入力いただいた情報から算出した見積金額です。<br/>
            実際の荷物の大きさ、重さが異なった場合、特別なオプション料金が発生した場合は、<br/>
            差額の料金を追加請求させて頂きます。
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`
    
    return fullHTML
  } catch (error) {
    console.error('Error rendering receipt template:', error)
    throw new Error('Failed to render receipt template to HTML')
  }
}

/**
 * Validates receipt data before rendering
 * 
 * @param data - Receipt data to validate
 * @returns true if valid, throws error if invalid
 */
export const validateReceiptData = (data: ReceiptData): boolean => {
  const requiredFields = [
    'receiptNumber',
    'issueDate',
    'transactionId',
    'customerInfo',
    'companyInfo',
    'items',
    'totals',
    'paymentInfo'
  ]

  for (const field of requiredFields) {
    if (!data[field as keyof ReceiptData]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  // Validate customer info
  if (!data.customerInfo.name) {
    throw new Error('Customer name is required')
  }

  // Validate items array
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one item is required')
  }

  // Validate each item
  data.items.forEach((item, index) => {
    if (!item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
      throw new Error(`Invalid item at index ${index}`)
    }
  })

  // Validate totals
  if (typeof data.totals.total !== 'number' || data.totals.total <= 0) {
    throw new Error('Invalid total amount')
  }

  return true
}

/**
 * Creates a sample receipt data for testing purposes
 * 
 * @returns Sample ReceiptData object
 */
export const createSampleReceiptData = (): ReceiptData => {
  return {
    receiptNumber: '2501010001',
    issueDate: new Date().toISOString(),
    transactionId: 'sample-transaction-id',
    customerInfo: {
      name: '田中太郎',
      companyName: '株式会社サンプル',
      address: '〒100-0001 東京都千代田区千代田1-1-1',
      phone: '03-1234-5678'
    },
    companyInfo: {
      name: 'QuickLabel株式会社',
      address: '〒000-0000 東京都渋谷区○○○○',
      phone: '03-0000-0000',
      registrationNumber: '法人番号: 0000000000000',
      taxId: '適格請求書発行事業者登録番号: T0000000000000'
    },
    items: [
      {
        description: '国際配送サービス',
        quantity: 1,
        unitPrice: 5000,
        amount: 5000
      },
      {
        description: '梱包材料費',
        quantity: 2,
        unitPrice: 500,
        amount: 1000
      }
    ],
    totals: {
      subtotal: 6000,
      tax: 600,
      total: 7100,
      fees: {
        serviceFee: 300,
        processingFee: 200,
        phoenixException: false
      }
    },
    paymentInfo: {
      method: 'クレジットカード',
      transactionId: 'pay_sample123456',
      paymentDate: new Date().toISOString(),
      status: '完了'
    },
    feeRates: {
      serviceRate: 0.05,
      processingRate: 0.03,
      taxRate: 0.10
    }
  }
}

/**
 * Formats currency amount for display
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('ja-JP')}`
}

/**
 * Formats date for Japanese display
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatJapaneseDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}