/**
 * PDF Generation Service Usage Examples
 * 
 * This file demonstrates how to use the PDFGenerationService
 * for generating PDF receipts from HTML templates.
 */

import { getPDFGenerationService, cleanupPDFService } from '../pdfGenerationService'

/**
 * Example: Generate a simple PDF receipt
 */
export async function generateSimpleReceipt(): Promise<Buffer> {
  const service = getPDFGenerationService()
  
  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>領収書</title>
      <style>
        body {
          font-family: 'Noto Sans JP', sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
        }
        .amount {
          font-size: 24px;
          color: #d32f2f;
          text-align: center;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">領収書</div>
        <div>No. 2501010001</div>
      </div>
      <div class="amount">¥1,100</div>
      <p>上記正に領収いたしました。</p>
    </body>
    </html>
  `
  
  try {
    const pdfBuffer = await service.generatePDF(receiptHtml)
    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`)
    return pdfBuffer
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    throw error
  }
}

/**
 * Example: Generate PDF with complex layout
 */
export async function generateComplexReceipt(): Promise<Buffer> {
  const service = getPDFGenerationService()
  
  const complexHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>詳細領収書</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
        
        body {
          font-family: 'Noto Sans JP', sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #333;
          padding: 30px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        
        .title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .details-table th,
        .details-table td {
          border: 1px solid #333;
          padding: 10px;
          text-align: left;
        }
        
        .details-table th {
          background: #f5f5f5;
          font-weight: 700;
        }
        
        .total-row {
          font-weight: 700;
          background: #f9f9f9;
        }
        
        .company-info {
          margin-top: 40px;
          text-align: right;
          border-top: 1px solid #ccc;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">領収書</div>
          <div>No. 2501010001</div>
          <div>発行日: 2025年1月1日</div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <strong>テスト株式会社 様</strong><br>
          〒100-0001 東京都千代田区千代田1-1-1
        </div>
        
        <table class="details-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>数量</th>
              <th>単価</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>国際配送サービス</td>
              <td>1</td>
              <td>¥2,000</td>
              <td>¥2,000</td>
            </tr>
            <tr>
              <td>手数料</td>
              <td>1</td>
              <td>¥500</td>
              <td>¥500</td>
            </tr>
            <tr>
              <td>消費税（10%）</td>
              <td>-</td>
              <td>-</td>
              <td>¥250</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">合計</td>
              <td>¥2,750</td>
            </tr>
          </tbody>
        </table>
        
        <div class="company-info">
          <div style="font-weight: 700; font-size: 16px;">QuickLabel株式会社</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            〒150-0001<br>
            東京都渋谷区神宮前1-1-1<br>
            TEL: 03-1234-5678
          </div>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    const pdfBuffer = await service.generatePDF(complexHtml)
    console.log(`Complex PDF generated successfully, size: ${pdfBuffer.length} bytes`)
    return pdfBuffer
  } catch (error) {
    console.error('Failed to generate complex PDF:', error)
    throw error
  }
}

/**
 * Example: Batch PDF generation with proper cleanup
 */
export async function generateMultiplePDFs(htmlTemplates: string[]): Promise<Buffer[]> {
  const service = getPDFGenerationService()
  const results: Buffer[] = []
  
  try {
    console.log(`Generating ${htmlTemplates.length} PDFs...`)
    
    for (let i = 0; i < htmlTemplates.length; i++) {
      console.log(`Generating PDF ${i + 1}/${htmlTemplates.length}`)
      const pdfBuffer = await service.generatePDF(htmlTemplates[i])
      results.push(pdfBuffer)
    }
    
    console.log(`Successfully generated ${results.length} PDFs`)
    return results
    
  } catch (error) {
    console.error('Batch PDF generation failed:', error)
    throw error
  } finally {
    // Always cleanup in serverless environments
    await cleanupPDFService()
  }
}

/**
 * Example: Generate PDF with error handling and retry
 */
export async function generatePDFWithRetry(
  html: string, 
  maxRetries: number = 3
): Promise<Buffer> {
  const service = getPDFGenerationService()
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`PDF generation attempt ${attempt}/${maxRetries}`)
      const pdfBuffer = await service.generatePDF(html)
      console.log(`PDF generated successfully on attempt ${attempt}`)
      return pdfBuffer
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`Attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retry (exponential backoff)
      const delay = 1000 * Math.pow(2, attempt - 1)
      console.log(`Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error(`PDF generation failed after ${maxRetries} attempts: ${lastError!.message}`)
}

/**
 * Example: Check service status and browser info
 */
export async function checkServiceStatus(): Promise<void> {
  const service = getPDFGenerationService()
  
  console.log('PDF Generation Service Status:')
  console.log('- Browser ready:', service.isBrowserReady())
  
  if (!service.isBrowserReady()) {
    console.log('- Initializing browser...')
    await service.optimizePuppeteer()
  }
  
  const browserInfo = await service.getBrowserInfo()
  console.log('- Browser info:', browserInfo)
  
  if (browserInfo.isConnected) {
    console.log('✅ Service is ready for PDF generation')
  } else {
    console.log('❌ Service is not ready')
  }
}

/**
 * Example usage in a serverless function
 */
export async function serverlessExample(html: string): Promise<Buffer> {
  try {
    // Generate PDF
    const pdfBuffer = await generateSimpleReceipt()
    
    // Return the buffer (would typically be sent as response)
    return pdfBuffer
    
  } finally {
    // Always cleanup in serverless environments to free memory
    await cleanupPDFService()
  }
}