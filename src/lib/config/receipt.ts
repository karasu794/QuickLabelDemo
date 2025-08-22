// PDF Receipt Generation Configuration

import { PuppeteerConfig, CacheConfig } from '@/types/receipt'

export const RECEIPT_CONFIG = {
  // Receipt Number Format
  RECEIPT_NUMBER_FORMAT: 'YYMMDD0XXXX',
  DATE_KEY_FORMAT: 'YYMMDD',
  
  // PDF Generation Settings
  PDF_OPTIONS: {
    format: 'A4' as const,
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  },

  // Puppeteer Configuration for Vercel
  PUPPETEER_CONFIG: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    headless: true,
    timeout: 30000
  } as PuppeteerConfig,

  // Cache Configuration
  CACHE_CONFIG: {
    defaultExpiration: 24, // 24 hours
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf']
  } as CacheConfig,

  // Company Information
  COMPANY_INFO: {
    name: 'QuickLabel株式会社',
    address: '〒000-0000 東京都渋谷区○○○○',
    phone: '03-0000-0000',
    registrationNumber: '法人番号: 0000000000000',
    taxId: '適格請求書発行事業者登録番号: T0000000000000'
  },

  // Font Settings
  FONTS: {
    primary: 'Noto Sans JP',
    fallback: "'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', sans-serif"
  },

  // API Endpoints
  API_ENDPOINTS: {
    GENERATE_RECEIPT: '/api/receipts',
    INVALIDATE_CACHE: '/api/receipts/[transactionId]/invalidate'
  },

  // Error Messages
  ERROR_MESSAGES: {
    TRANSACTION_NOT_FOUND: '取引が見つかりません',
    UNAUTHORIZED_ACCESS: 'アクセス権限がありません',
    PDF_GENERATION_FAILED: 'PDF生成に失敗しました',
    CACHE_ERROR: 'キャッシュエラーが発生しました',
    INVALID_TRANSACTION_ID: '無効な取引IDです',
    MISSING_CUSTOMER_INFO: '顧客情報が不足しています'
  }
} as const

// Environment Variables Validation
export const validateEnvironmentVariables = () => {
  const requiredEnvVars = [
    'BLOB_READ_WRITE_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  )

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}

// Type Guards
export const isValidTransactionType = (type: string): type is 'shipment' | 'open_shipment' => {
  return type === 'shipment' || type === 'open_shipment'
}

export const isValidReceiptFormat = (format: string): format is 'url' | 'pdf' => {
  return format === 'url' || format === 'pdf'
}