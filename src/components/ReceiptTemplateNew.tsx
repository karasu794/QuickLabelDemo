import React from 'react'
import { ReceiptTemplateProps } from '@/types/receipt'
import { RECEIPT_CONFIG } from '@/lib/config/receipt'

/**
 * New Receipt Template Component - Target Layout Design
 * 
 * Generates HTML template for PDF receipt generation matching the target design.
 * Features target layout with PHOENIX company seal and specific format.
 */
export const ReceiptTemplateNew: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const {
    receiptNumber,
    issueDate,
    customerInfo,
    companyInfo,
    items,
    totals,
    paymentInfo,
    feeRates
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

  // FedEx tracking number (from data or fallback)
  const trackingNumber = data.trackingNumber ?? '781987654321'

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    .receipt-document {
      font-family: ${RECEIPT_CONFIG.FONTS.primary}, ${RECEIPT_CONFIG.FONTS.fallback};
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
      padding: 15mm;
      background: white;
    }
    
    /* Header section */
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      position: relative;
    }
    
    .header-left {
      flex: 1;
    }
    
    .company-name-header {
      font-size: 16px;
      font-weight: 500;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    
    .customer-line {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .customer-name-field {
      margin-left: 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 2px;
      min-width: 120px;
    }
    
    .header-center {
      position: absolute;
      left: 50%;
      top: 0;
      transform: translateX(-50%);
    }
    
    .receipt-title {
      font-size: 24px;
      font-weight: 700;
      text-align: center;
    }
    
    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .receipt-meta {
      margin-bottom: 10px;
    }
    
    .receipt-number, .issue-date {
      margin-bottom: 4px;
      font-size: 11px;
    }
    
    .company-seal {
      width: 80px;
      height: 80px;
    }
    
    .company-seal img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    /* Subject section */
    .subject-section {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    
    .subject-label {
      font-weight: 500;
      margin-right: 10px;
    }
    
    .subject-content {
      flex: 1;
    }
    
    /* Payment and total section */
    .payment-total-section {
      margin-bottom: 20px;
    }
    
    .payment-method {
      margin-bottom: 10px;
      font-size: 11px;
    }
    
    .total-amount {
      font-size: 18px;
      font-weight: 700;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
    }
    
    /* Items table */
    .items-section {
      margin-bottom: 20px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    
    .items-table th,
    .items-table td {
      border: 1px solid #333;
      padding: 8px 6px;
      text-align: center;
      font-size: 10px;
    }
    
    .items-table th {
      background-color: #999;
      color: white;
      font-weight: 500;
    }
    
    .no-col { width: 8%; }
    .item-col { width: 42%; text-align: left; }
    .quantity-col { width: 15%; }
    .unit-price-col { width: 17%; text-align: right; }
    .amount-col { width: 18%; text-align: right; }
    
    .tracking-number {
      background-color: #f0f0f0;
      padding: 8px;
      text-align: center;
      font-size: 11px;
      border: 1px solid #ccc;
    }
    
    /* Summary section */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    
    .summary-table {
      width: 300px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid #ccc;
    }
    
    .summary-row.total-row {
      font-weight: 700;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      background-color: #f8f8f8;
    }
    
    .summary-label {
      font-size: 11px;
    }
    
    .summary-value {
      font-size: 11px;
      text-align: right;
    }
    
    /* Notes section */
    .notes-section {
      margin-top: 30px;
      border: 1px solid #333;
      padding: 15px;
    }
    
    .notes-title {
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .notes-content {
      font-size: 10px;
      line-height: 1.5;
    }
    
    @media print {
      .receipt-container {
        margin: 0;
        padding: 10mm;
      }
    }
  `

  const serviceRatePct = typeof (feeRates as any)?.serviceRate === 'number' ? Math.round((feeRates as any).serviceRate * 10000) / 100 : 2.5
  const processingRatePct = typeof (feeRates as any)?.processingRate === 'number' ? Math.round((feeRates as any).processingRate * 10000) / 100 : 3.25
  const taxRatePct = typeof (feeRates as any)?.taxRate === 'number' ? Math.round((feeRates as any).taxRate * 10000) / 100 : 10

  return (
    <div className="receipt-document">
      <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
      <div className="receipt-container">
        {/* Header section with company name and receipt info */}
        <div className="receipt-header">
          <div className="header-left">
            <div className="company-name-header">{companyInfo.name || 'XXXXXXXXXX株式会社'}</div>
            <div className="customer-line">
              <span>ご担当：</span>
              <span className="customer-name-field">{customerInfo.name || 'XXXXXXXX'} 様</span>
            </div>
          </div>
          <div className="header-center">
            <div className="receipt-title">領収書</div>
          </div>
          <div className="header-right">
            <div className="receipt-meta">
              <div className="receipt-number">領収書No. {receiptNumber || '000000000'}</div>
              <div className="issue-date">発行日 {formatDate(issueDate)}</div>
            </div>
            <div className="company-seal">
              <img src={companySealBase64} alt="Company Seal" />
            </div>
          </div>
        </div>

        {/* Subject line */}
        <div className="subject-section">
          <div className="subject-label">件名：</div>
          <div className="subject-content">FedEx：運送状番号({trackingNumber.slice(0, -1)}) 国際送料</div>
        </div>

        {/* Payment method and total amount */}
        <div className="payment-total-section">
          <div className="payment-method">
            下記の通り、クレジットカードにて領収いたしました。
          </div>
          <div className="total-amount">
            合計金額：{formatCurrency(totals.total)} (税込)
          </div>
        </div>

        {/* Items table */}
        <div className="items-section">
          <table className="items-table">
            <thead>
              <tr>
                <th className="no-col">No.</th>
                <th className="item-col">項目</th>
                <th className="quantity-col">数量</th>
                <th className="unit-price-col">単価</th>
                <th className="amount-col">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="no-col">1</td>
                <td className="item-col">国際送料（消費税適応外）</td>
                <td className="quantity-col">1式</td>
                <td className="unit-price-col">{formatCurrency(Math.round(totals.subtotal))}</td>
                <td className="amount-col">{formatCurrency(Math.round(totals.subtotal))}</td>
              </tr>
              <tr>
                <td className="no-col">2</td>
                <td className="item-col">第三者請求利用料（2.5%）</td>
                <td className="quantity-col">1件</td>
                <td className="unit-price-col">{formatCurrency(Math.round(totals.fees?.serviceFee || 0))}</td>
                <td className="amount-col">{formatCurrency(Math.round(totals.fees?.serviceFee || 0))}</td>
              </tr>
              <tr>
                <td className="no-col">3</td>
                <td className="item-col">特別割引アカウント使用料</td>
                <td className="quantity-col">1件</td>
                <td className="unit-price-col">{formatCurrency(0)}</td>
                <td className="amount-col">{formatCurrency(0)}</td>
              </tr>
              <tr>
                <td className="no-col">4</td>
                <td className="item-col">決済システム手数料（4%）</td>
                <td className="quantity-col">1件</td>
                <td className="unit-price-col">{formatCurrency(Math.round(totals.fees?.processingFee || 0))}</td>
                <td className="amount-col">{formatCurrency(Math.round(totals.fees?.processingFee || 0))}</td>
              </tr>
            </tbody>
          </table>
          
          {/* Tracking number display */}
          <div className="tracking-number">
            運送状番号：{trackingNumber}
          </div>
        </div>

        {/* Summary calculation */}
        <div className="summary-section">
          <div className="summary-table">
            <div className="summary-row">
              <span className="summary-label">小計 (1+2+3+4)</span>
              <span className="summary-value">{formatCurrency(Math.round(totals.subtotal + (totals.fees?.serviceFee || 0) + (totals.fees?.processingFee || 0)))}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">消費税額 (2+3+4) ×{taxRatePct}%</span>
              <span className="summary-value">{formatCurrency(Math.round(totals.tax))}</span>
            </div>
            <div className="summary-row total-row">
              <span className="summary-label">合計金額 (小計+消費税額)</span>
              <span className="summary-value">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes section */}
        <div className="notes-section">
          <div className="notes-title">【備考】</div>
          <div className="notes-content">
            FedEx国際送料は、お客様がご入力いただいた情報から算出した見積金額です。<br/>
            実際の荷物の大きさ、重さが異なった場合、特別なオプション料金が発生した場合は、<br/>
            差額の料金を追加請求させて頂きます。
          </div>
        </div>
      </div>
    </div>
  )
}
