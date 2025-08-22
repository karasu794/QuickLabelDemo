// PDF Receipt Generation Types and Interfaces

export interface ReceiptService {
  generateReceipt(transactionId: string, userId: string): Promise<ReceiptResult>
  invalidateCache(transactionId: string): Promise<void>
  getReceiptData(transactionId: string, userId: string): Promise<ReceiptData>
}

export interface ReceiptResult {
  success: boolean
  url?: string
  pdfBuffer?: Buffer
  error?: string
}

export interface ReceiptNumberService {
  generateReceiptNumber(date: Date, transactionId: string, transactionType: TransactionType): Promise<string>
  getNextSequence(dateKey: string): Promise<number>
  getExistingReceiptNumber(transactionId: string, transactionType: TransactionType): Promise<string | null>
  getDateStatistics(date: Date): Promise<{
    dateKey: string
    totalCount: number
    maxSequence: number
  }>
}

export interface PDFGenerationService {
  generatePDF(html: string): Promise<Buffer>
  optimizePuppeteer(): Promise<any> // Browser type from puppeteer-core
}

export interface CacheService {
  get(key: string): Promise<Buffer | null>
  set(key: string, data: Buffer): Promise<string>
  delete(key: string): Promise<void>
  generateSignedUrl(key: string): Promise<string>
}

// Data Models
export interface ReceiptData {
  receiptNumber: string
  issueDate: string
  transactionId: string
  customerInfo: CustomerInfo
  companyInfo: CompanyInfo
  items: ReceiptItem[]
  totals: ReceiptTotals
  paymentInfo: PaymentInfo
  feeRates: FeeRates
  /** Optional: FedEx tracking number for display */
  trackingNumber?: string
}

export interface CustomerInfo {
  name: string
  companyName?: string
  address?: string
  phone?: string
  /** Optional:担当者名（件名下に表示） */
  personName?: string
}

export interface CompanyInfo {
  name: string
  address: string
  phone: string
  registrationNumber?: string
  taxId?: string
  /** Optional: 右上に表示する日本語表記の社名 */
  displayNameJa?: string
  /** Optional: 社印画像（data:URL または https URL） */
  sealImageDataUrl?: string
}

export interface ReceiptItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface ReceiptTotals {
  subtotal: number
  tax: number
  total: number
  fees: FeeBreakdown
}

export interface FeeBreakdown {
  serviceFee: number
  processingFee: number
  exchangeRate?: number
  phoenixException?: boolean
}

export interface PaymentInfo {
  method: string
  transactionId: string
  paymentDate: string
  status: string
}

export interface FeeRates {
  serviceRate: number
  processingRate: number
  taxRate: number
  exchangeRate?: number
}

// Database Models
export interface ReceiptNumber {
  id: string
  date_key: string // YYMMDD
  sequence_number: number
  receipt_number: string // YYMMDD0XXXX
  transaction_id: string
  transaction_type: 'shipment' | 'open_shipment'
  created_at: string
}

export interface ReceiptCache {
  id: string
  transaction_id: string
  transaction_type: 'shipment' | 'open_shipment'
  blob_key: string
  created_at: string
  expires_at?: string
}

// API Response Types
export interface ReceiptAPIResponse {
  success: boolean
  data?: {
    url?: string
    receiptNumber?: string
  }
  error?: ErrorResponse
}

export interface ErrorResponse {
  code: string
  message: string
  details?: any
  timestamp: string
}

// Form Types
export interface CustomerInfoFormData {
  name: string
  companyName?: string
  address?: string
  phone?: string
}

export interface CustomerInfoFormProps {
  initialData?: Partial<CustomerInfoFormData>
  onSubmit: (data: CustomerInfoFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

// Component Props
export interface ReceiptTemplateProps {
  data: ReceiptData
}

// Utility Types
export type TransactionType = 'shipment' | 'open_shipment'

export type ReceiptFormat = 'url' | 'pdf'

export interface ReceiptGenerationOptions {
  format?: ReceiptFormat
  forceRegenerate?: boolean
}

// Puppeteer Configuration
export interface PuppeteerConfig {
  args: string[]
  headless: boolean
  timeout?: number
}

// Cache Configuration
export interface CacheConfig {
  defaultExpiration: number // in hours
  maxFileSize: number // in bytes
  allowedMimeTypes: string[]
}