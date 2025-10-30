// 見積もり関連の型定義

export interface ExtendedQuoteParams {
  originCountry: string
  originPostalCode: string
  originStateCode: string
  originCityName: string
  originAddressInput: string
  originStreet: string
  originSelected: boolean
  originPostalCodeMissing: boolean
  originCityNameMissing: boolean
  originStateCodeMissing: boolean
  destinationCountry: string
  destinationPostalCode: string
  destinationStateCode: string
  destinationCityName: string
  destinationAddressInput: string
  destinationStreet: string
  destinationSelected: boolean
  destinationPostalCodeMissing: boolean
  destinationCityNameMissing: boolean
  destinationStateCodeMissing: boolean
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  isPhoenixShipment: boolean
  phoenixMode: 'none' | 'shipper' | 'recipient'
  samePackageCount?: number
  declaredValueJPY?: number
}

export interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
  declaredValue: string
}

export interface QuoteResult {
  serviceId: string
  serviceName: string
  baseRate: number
  totalRate: number
  discountAmount: number
  discountPercentage: number
  transitTime: string
  deliveryTime: string
  arrivalDate: string
  breakdown: {
    baseRate: number
    fuelSurcharge: number
    volumeDiscount: number
    phoenixDiscount?: number
  }
}

export interface JobStatus {
  status: 'pending' | 'processing_auth' | 'processing_rate_request' | 'completed' | 'failed'
  message: string
  jobId: string
  data?: {
    success: boolean
    rates: QuoteResult[]
  }
  error?: string
} 

export type NormalizedQuote = {
  id: string
  service: string
  total: number
  currency: string
  eta?: string | null
  accountType?: 'standard' | 'preferred' | string
}