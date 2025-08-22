import React from 'react'
import { ReceiptTemplateProps } from '@/types/receipt'
import { RECEIPT_CONFIG } from '@/lib/config/receipt'

/**
 * ReceiptTemplate Component
 * 
 * Generates HTML template for PDF receipt generation using Puppeteer.
 * Follows Japanese business practices and includes inline CSS for PDF compatibility.
 * 
 * Requirements covered:
 * - 1.1: PDF receipt generation with Japanese business practices
 * - 1.4: Specified sample design faithful reproduction
 * - 1.5: Company seal image embedding
 */
export const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ data }) => {
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

  // PHOENIX Company seal image as base64 - with transparent background
  const companySealBase64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .seal-red { fill: #C4662A; }
        </style>
      </defs>
      <!-- Outer circle -->
      <circle cx="60" cy="60" r="58" fill="none" stroke="#C4662A" stroke-width="3"/>
      
      <!-- PHOENIX text (top arc) -->
      <path id="phoenix-arc" d="M 20 60 A 40 40 0 0 1 100 60" fill="none"/>
      <text font-family="serif" font-size="14" font-weight="bold" class="seal-red">
        <textPath href="#phoenix-arc" startOffset="50%" text-anchor="middle">PHOENIX</textPath>
      </text>
      
      <!-- Phoenix bird in center -->
      <g transform="translate(60,60) scale(0.8,0.8)">
        <!-- Bird body -->
        <path d="M-8,-15 C-12,-10 -10,-5 -8,0 C-6,8 0,12 8,10 C15,8 18,2 15,-5 C12,-12 5,-18 -8,-15 Z" class="seal-red"/>
        <!-- Bird head -->
        <circle cx="-5" cy="-8" r="4" class="seal-red"/>
        <!-- Beak -->
        <path d="M-9,-8 L-12,-6 L-9,-6 Z" class="seal-red"/>
        <!-- Wing details -->
        <path d="M-2,-5 C2,-8 8,-6 12,-2 C10,0 6,2 2,0 C-1,-2 -2,-5 -2,-5 Z" class="seal-red"/>
        <!-- Tail feathers -->
        <path d="M8,5 C12,8 16,6 18,2 C20,-2 18,-6 15,-4 C12,-2 10,2 8,5 Z" class="seal-red"/>
        <path d="M5,8 C8,12 12,14 16,12 C18,10 16,6 12,6 C8,6 5,8 5,8 Z" class="seal-red"/>
        <!-- Wing feather details -->
        <path d="M0,-2 L4,-4 M2,0 L6,-2 M4,2 L8,0" stroke="#C4662A" stroke-width="1" fill="none"/>
      </g>
      
      <!-- Co., Ltd. text (bottom arc) -->
      <path id="company-arc" d="M 100 60 A 40 40 0 0 1 20 60" fill="none"/>
      <text font-family="serif" font-size="12" font-weight="bold" class="seal-red">
        <textPath href="#company-arc" startOffset="50%" text-anchor="middle">Co., Ltd.</textPath>
      </text>
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
      font-size: 12px;
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
      padding: 20mm;
      background: white;
    }
    
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    
    .receipt-title {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      text-align: center;
      flex: 1;
    }
    
    .company-seal {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 20px;
      flex-shrink: 0;
    }
    
    .company-seal img {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    
    .receipt-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .receipt-details {
      flex: 1;
    }
    
    .receipt-number {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .issue-date {
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .customer-info {
      flex: 1;
      text-align: right;
    }
    
    .customer-name {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      border-bottom: 1px solid #333;
      padding-bottom: 4px;
    }
    
    .customer-details {
      font-size: 12px;
      line-height: 1.6;
    }
    
    .items-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #666;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .items-table th,
    .items-table td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    
    .items-table th {
      background-color: #f5f5f5;
      font-weight: 500;
      text-align: center;
    }
    
    .items-table .amount-col {
      text-align: right;
      width: 100px;
    }
    
    .items-table .quantity-col {
      text-align: center;
      width: 60px;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-table {
      width: 300px;
      border-collapse: collapse;
    }
    
    .totals-table td {
      border: 1px solid #333;
      padding: 8px;
    }
    
    .totals-table .label-col {
      background-color: #f5f5f5;
      font-weight: 500;
      width: 150px;
    }
    
    .totals-table .amount-col {
      text-align: right;
      width: 150px;
    }
    
    .total-row {
      font-weight: 700;
      font-size: 14px;
    }
    
    .total-row td {
      border-top: 2px solid #333;
      background-color: #f0f0f0;
    }
    
    .payment-info {
      margin-bottom: 30px;
    }
    
    .payment-details {
      display: flex;
      gap: 30px;
      font-size: 12px;
    }
    
    .payment-item {
      display: flex;
      flex-direction: column;
    }
    
    .payment-label {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .company-info {
      border-top: 1px solid #666;
      padding-top: 20px;
      text-align: right;
      font-size: 11px;
      line-height: 1.6;
    }
    
    .company-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .notes-section {
      margin-top: 20px;
      font-size: 10px;
      color: #666;
      line-height: 1.5;
    }
    
    .notes-title {
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    @media print {
      .receipt-container {
        margin: 0;
        padding: 0;
      }
    }
  `

  return (
    <div className="receipt-document">
      <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
      <div className="receipt-container">
          {/* Header with title and company seal */}
          <div className="receipt-header">
            <h1 className="receipt-title">領収書</h1>
            <div className="company-seal">
              <img src={companySealBase64} alt="社印" />
            </div>
          </div>

          {/* Receipt information and customer details */}
          <div className="receipt-info">
            <div className="receipt-details">
              <div className="receipt-number">
                領収書番号: {receiptNumber}
              </div>
              <div className="issue-date">
                発行日: {formatDate(issueDate)}
              </div>
            </div>
            
            <div className="customer-info">
              <div className="customer-name">
                {customerInfo.companyName || customerInfo.name} 様
              </div>
              <div className="customer-details">
                {customerInfo.address && (
                  <div>{customerInfo.address}</div>
                )}
                {customerInfo.phone && (
                  <div>TEL: {customerInfo.phone}</div>
                )}
              </div>
            </div>
          </div>

          {/* Items section */}
          <div className="items-section">
            <h2 className="section-title">明細</h2>
            <table className="items-table">
              <thead>
                <tr>
                  <th>項目</th>
                  <th className="quantity-col">数量</th>
                  <th className="amount-col">単価</th>
                  <th className="amount-col">金額</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td className="quantity-col">{item.quantity}</td>
                    <td className="amount-col">{formatCurrency(item.unitPrice)}</td>
                    <td className="amount-col">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals section */}
          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label-col">小計</td>
                  <td className="amount-col">{formatCurrency(totals.subtotal)}</td>
                </tr>
                {totals.fees.serviceFee > 0 && (
                  <tr>
                    <td className="label-col">サービス手数料</td>
                    <td className="amount-col">{formatCurrency(totals.fees.serviceFee)}</td>
                  </tr>
                )}
                {totals.fees.processingFee > 0 && (
                  <tr>
                    <td className="label-col">決済手数料</td>
                    <td className="amount-col">{formatCurrency(totals.fees.processingFee)}</td>
                  </tr>
                )}
                <tr>
                  <td className="label-col">消費税</td>
                  <td className="amount-col">{formatCurrency(totals.tax)}</td>
                </tr>
                <tr className="total-row">
                  <td className="label-col">合計金額</td>
                  <td className="amount-col">{formatCurrency(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment information */}
          <div className="payment-info">
            <h2 className="section-title">お支払い情報</h2>
            <div className="payment-details">
              <div className="payment-item">
                <span className="payment-label">支払方法:</span>
                <span>{paymentInfo.method}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">取引ID:</span>
                <span>{paymentInfo.transactionId}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">支払日:</span>
                <span>{formatDate(paymentInfo.paymentDate)}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">ステータス:</span>
                <span>{paymentInfo.status}</span>
              </div>
            </div>
          </div>

          {/* Company information */}
          <div className="company-info">
            <div className="company-name">{companyInfo.name}</div>
            <div>{companyInfo.address}</div>
            <div>TEL: {companyInfo.phone}</div>
            {companyInfo.registrationNumber && (
              <div>{companyInfo.registrationNumber}</div>
            )}
            {companyInfo.taxId && (
              <div>{companyInfo.taxId}</div>
            )}
          </div>

          {/* Notes section */}
          <div className="notes-section">
            <div className="notes-title">※ 注意事項</div>
            <div>・本領収書は、お支払い完了後に発行されます。</div>
            <div>・再発行をご希望の場合は、お客様サポートまでお問い合わせください。</div>
            <div>・本領収書は、税務署で認められた正式な領収書です。</div>
          </div>
        </div>
      </div>
  )
}

export default ReceiptTemplate