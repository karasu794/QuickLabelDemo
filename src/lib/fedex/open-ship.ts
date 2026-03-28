/**
 * FedEx Open Ship API専用ヘルパー関数
 * MPS（Multiple Package Shipment）対応
 */

import { fedexApiRequest, getFedExAccessToken, getFedExCredentialsByOrigin } from './auth'

/**
 * 🚨 基幹仕様: アカウント番号から出荷地国コードを推定
 */
function getOriginCountryFromAccount(accountNumber: string): string {
  // 輸出用アカウント番号の場合は日本
  if (accountNumber === process.env.FEDEX_EXPORT_ACCOUNT_NUMBER) {
    return 'JP'
  }
  // 輸入用アカウント番号の場合は非日本（一般的にUS）
  if (accountNumber === process.env.FEDEX_IMPORT_ACCOUNT_NUMBER) {
    return 'US'  // 実際のプロジェクトでは、より具体的な判定ロジックが必要
  }
  // デフォルトは日本発送として扱う
  return 'JP'
}

export interface OpenShipmentData {
  // 基本情報
  index?: string // ユニークID（オプション）
  accountNumber: string
  
  // 送り状情報
  shipper: {
    contact: {
      personName: string
      phoneNumber: string
      companyName: string
    }
    address: {
      streetLines: string[]
      city: string
      stateOrProvinceCode?: string
      postalCode: string
      countryCode: string
    }
  }
  
  recipient: {
    contact: {
      personName: string
      phoneNumber: string
      emailAddress: string
      companyName: string
    }
    address: {
      streetLines: string[]
      city: string
      stateOrProvinceCode?: string
      postalCode: string
      countryCode: string
      residential: boolean
    }
  }
  
  // 配送設定
  serviceType: string
  packagingType: string
  pickupType: string
  shipDatestamp: string
  
  // 荷物情報（最初の1個）
  masterPackage: {
    sequenceNumber: number
    weight: {
      units: 'KG' | 'LB'
      value: number
    }
    dimensions?: {
      length: number
      width: number
      height: number
      units: 'CM' | 'IN'
    }
    declaredValue?: {
      amount: number
      currency: string
    }
  }
  
  // 税関情報（国際発送の場合）
  customsClearanceDetail?: {
    commercialInvoice: {
      purpose: string
    }
    dutiesPayment: {
      paymentType: string
    }
    totalCustomsValue: {
      amount: number
      currency: string
    }
    commodities: Array<{
      description: string
      countryOfManufacture: string
      quantity: number
      quantityUnits: string
      unitPrice: {
        amount: number
        currency: string
      }
      customsValue: {
        amount: number
        currency: string
      }
      weight: {
        units: 'KG' | 'LB'
        value: number
      }
      harmonizedCode?: string
    }>
  }
}

export interface PackageData {
  sequenceNumber: number
  weight: {
    units: 'KG' | 'LB'
    value: number
  }
  dimensions?: {
    length: number
    width: number
    height: number
    units: 'CM' | 'IN'
  }
  declaredValue?: {
    amount: number
    currency: string
  }
}

export interface OpenShipmentResponse {
  masterTrackingNumber?: string
  index?: string
  alerts?: Array<{
    code: string
    message: string
  }>
  notes?: Array<{
    code: string
    message: string
  }>
}

export interface ConfirmShipmentResponse {
  masterTrackingNumber: string
  packageResponses: Array<{
    trackingNumber: string
    sequenceNumber: number
    packageDocuments?: Array<{
      url?: string
      encodedLabel?: string
      contentType: string
    }>
  }>
  alerts?: Array<{
    code: string
    message: string
  }>
  // 40個超の場合は非同期処理
  jobId?: string
}

/**
 * Open Shipmentを作成
 */
export async function createOpenShipment(
  shipmentData: OpenShipmentData
): Promise<OpenShipmentResponse> {
  // Demo mode guard
  if (process.env.APP_ENV === 'demo') {
    throw new Error('DEMO_MODE_DISABLED: OpenShipment作成はデモ環境では無効です。')
  }

  // 🚨 基幹仕様: 出荷地国コードに基づいて動的認証
  const originCountry = shipmentData.shipper.address.countryCode
  const accessToken = await getFedExAccessToken(originCountry)
  
  const request = {
    openShipmentAction: 'CREATE_PACKAGE',
    index: shipmentData.index,
    accountNumber: {
      value: shipmentData.accountNumber
    },
    requestedShipment: {
      shipper: shipmentData.shipper,
      recipients: [shipmentData.recipient],
      shipDatestamp: shipmentData.shipDatestamp,
      serviceType: shipmentData.serviceType,
      packagingType: shipmentData.packagingType,
      pickupType: shipmentData.pickupType,
      blockInsightVisibility: false,
      shippingChargesPayment: {
        paymentType: 'SENDER',
        payor: {
          responsibleParty: {
            accountNumber: {
              value: shipmentData.accountNumber,
            },
          },
        },
      },
      requestedPackageLineItems: [shipmentData.masterPackage],
      ...(shipmentData.customsClearanceDetail && {
        customsClearanceDetail: shipmentData.customsClearanceDetail
      })
    }
  }

  console.log('📦 Open Shipment作成リクエスト:', JSON.stringify(request, null, 2))

  const response = await fedexApiRequest<any>(
    '/ship/v1/openshipments',
    'POST',
    accessToken,
    request
  )

  if (response.errors) {
    throw new Error(`Open Shipment作成エラー: ${response.errors.map(e => e.message).join(', ')}`)
  }

  return {
    masterTrackingNumber: response.output?.transactionShipments?.[0]?.masterTrackingNumber,
    index: response.output?.transactionShipments?.[0]?.index,
    alerts: response.output?.alerts,
    notes: response.output?.notes
  }
}

/**
 * Open Shipmentにパッケージを追加
 */
export async function addPackagesToOpenShipment(
  accountNumber: string,
  indexOrTrackingNumber: string,
  packages: PackageData[]
): Promise<{
  addedPackages: Array<{
    trackingNumber: string
    sequenceNumber: number
  }>
  alerts?: Array<{
    code: string
    message: string
  }>
}> {
  // 🚨 基幹仕様: アカウント番号から出荷地国コードを推定
  const originCountry = getOriginCountryFromAccount(accountNumber)
  const accessToken = await getFedExAccessToken(originCountry)
  
  const request = {
    index: indexOrTrackingNumber,
    accountNumber: {
      value: accountNumber
    },
    requestedPackageLineItem: packages
  }

  console.log(`📦 パッケージ追加リクエスト (${packages.length}個):`, JSON.stringify(request, null, 2))

  const response = await fedexApiRequest<any>(
    '/ship/v1/openshipments/packages',
    'POST',
    accessToken,
    request
  )

  if (response.errors) {
    throw new Error(`パッケージ追加エラー: ${response.errors.map(e => e.message).join(', ')}`)
  }

  return {
    addedPackages: response.output?.transactionShipments?.[0]?.pieceResponses?.map((p: any) => ({
      trackingNumber: p.trackingNumber,
      sequenceNumber: p.sequenceNumber
    })) || [],
    alerts: response.output?.alerts
  }
}

/**
 * Open Shipmentを確定（ラベル生成）
 */
export async function confirmOpenShipment(
  accountNumber: string,
  indexOrTrackingNumber: string,
  labelResponseOptions: 'URL_ONLY' | 'LABEL_DATA_ONLY' = 'URL_ONLY'
): Promise<ConfirmShipmentResponse> {
  // 🚨 基幹仕様: アカウント番号から出荷地国コードを推定
  const originCountry = getOriginCountryFromAccount(accountNumber)
  const accessToken = await getFedExAccessToken(originCountry)
  
  const request = {
    index: indexOrTrackingNumber,
    accountNumber: {
      value: accountNumber
    },
    labelResponseOptions: labelResponseOptions,
    // ラベル仕様
    labelSpecification: {
      imageType: 'PDF',
      labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
    }
  }

  console.log('🏷️ Open Shipment確定リクエスト:', JSON.stringify(request, null, 2))

  const response = await fedexApiRequest<any>(
    '/ship/v1/openshipments/confirm',
    'POST',
    accessToken,
    request
  )

  if (response.errors) {
    throw new Error(`Open Shipment確定エラー: ${response.errors.map(e => e.message).join(', ')}`)
  }

  const transactionShipment = response.output?.transactionShipments?.[0]
  
  // 40個超の場合はjobIdが返される（非同期処理）
  if (response.output?.jobId) {
    return {
      masterTrackingNumber: transactionShipment?.masterTrackingNumber || '',
      packageResponses: [],
      jobId: response.output.jobId,
      alerts: response.output?.alerts
    }
  }

  // 同期処理の場合はラベルが即座に返される
  return {
    masterTrackingNumber: transactionShipment?.masterTrackingNumber || '',
    packageResponses: transactionShipment?.pieceResponses?.map((piece: any) => ({
      trackingNumber: piece.trackingNumber,
      sequenceNumber: piece.sequenceNumber,
      packageDocuments: piece.packageDocuments
    })) || [],
    alerts: response.output?.alerts
  }
}

/**
 * 非同期処理結果を取得（40個超の場合）
 */
export async function getOpenShipmentResults(
  accountNumber: string,
  jobId: string
): Promise<ConfirmShipmentResponse> {
  // 🚨 基幹仕様: アカウント番号から出荷地国コードを推定
  const originCountry = getOriginCountryFromAccount(accountNumber)
  const accessToken = await getFedExAccessToken(originCountry)
  
  const response = await fedexApiRequest<any>(
    `/ship/v1/openshipments/results?accountNumber=${accountNumber}&jobId=${jobId}&resultMethodType=CREATE`,
    'GET',
    accessToken
  )

  if (response.errors) {
    throw new Error(`Open Shipment結果取得エラー: ${response.errors.map(e => e.message).join(', ')}`)
  }

  const transactionShipment = response.output?.transactionShipments?.[0]
  
  return {
    masterTrackingNumber: transactionShipment?.masterTrackingNumber || '',
    packageResponses: transactionShipment?.pieceResponses?.map((piece: any) => ({
      trackingNumber: piece.trackingNumber,
      sequenceNumber: piece.sequenceNumber,
      packageDocuments: piece.packageDocuments
    })) || [],
    alerts: response.output?.alerts
  }
}

/**
 * 入力データからOpen Shipment用データを構築
 */
export function buildOpenShipmentData(
  shipperInfo: any,
  recipientInfo: any,
  packages: any[],
  items?: any[],
  serviceType: string = 'FEDEX_INTERNATIONAL_PRIORITY',
  jpyToUsd?: number
): OpenShipmentData {
  // 🚨 基幹仕様対応: 出荷地国コードに基づいて動的認証情報取得
  const credentials = getFedExCredentialsByOrigin(shipperInfo.countryCode)
  const accountNumber = credentials.accountNumber

  const isInternational = shipperInfo.countryCode !== recipientInfo.countryCode

  // 電話番号の正規化
  const sanitizedShipperPhone = shipperInfo.phoneNumber.replace(/\D/g, '')
  const sanitizedRecipientPhone = recipientInfo.phoneNumber.replace(/\D/g, '')

  const shipmentData: OpenShipmentData = {
    accountNumber,
    shipper: {
      contact: {
        personName: shipperInfo.contactName,
        phoneNumber: sanitizedShipperPhone,
        companyName: shipperInfo.companyName,
      },
      address: {
        streetLines: [shipperInfo.address1, shipperInfo.address2].filter(Boolean),
        city: shipperInfo.cityName,
        ...(shipperInfo.stateCode && ['US', 'CA', 'PR'].includes(shipperInfo.countryCode) && {
          stateOrProvinceCode: shipperInfo.stateCode
        }),
        postalCode: shipperInfo.postalCode,
        countryCode: shipperInfo.countryCode,
      },
    },
    recipient: {
      contact: {
        personName: recipientInfo.contactName,
        phoneNumber: sanitizedRecipientPhone,
        emailAddress: recipientInfo.email,
        companyName: recipientInfo.companyName,
      },
      address: {
        streetLines: [recipientInfo.address1, recipientInfo.address2].filter(Boolean),
        city: recipientInfo.cityName,
        ...(recipientInfo.stateCode && ['US', 'CA', 'PR'].includes(recipientInfo.countryCode) && {
          stateOrProvinceCode: recipientInfo.stateCode
        }),
        postalCode: recipientInfo.postalCode,
        countryCode: recipientInfo.countryCode,
        residential: recipientInfo.isResidential,
      },
    },
    serviceType,
    packagingType: packages[0]?.type || 'YOUR_PACKAGING',
    pickupType: 'USE_SCHEDULED_PICKUP',
    shipDatestamp: new Date().toISOString().split('T')[0],
    masterPackage: {
      sequenceNumber: 1,
      weight: {
        units: 'KG',
        value: parseFloat(packages[0]?.weight || '1')
      },
      ...(packages[0]?.type === 'YOUR_PACKAGING' && packages[0].length && {
        dimensions: {
          length: parseInt(packages[0].length),
          width: parseInt(packages[0].width),
          height: parseInt(packages[0].height),
          units: 'CM',
        }
      }),
      ...(packages[0]?.declaredValue && Number(packages[0].declaredValue) > 0 && {
        declaredValue: { amount: parseFloat((Math.max(Number(packages[0].declaredValue) * (jpyToUsd > 0 ? jpyToUsd : (1/150)), 1.0)).toFixed(2)), currency: 'USD' }
      })
    }
  }

  // 国際発送の場合は税関情報を追加
  if (isInternational && items && items.length > 0) {
    const rate = (jpyToUsd && jpyToUsd > 0) ? jpyToUsd : (1/150)
    const convertJPYtoUSD = (amountJPY: number): number => Math.max(amountJPY * rate, 1.0)

    shipmentData.customsClearanceDetail = {
      commercialInvoice: {
        purpose: 'SOLD',
      },
      dutiesPayment: {
        paymentType: 'RECIPIENT',
      },
      totalCustomsValue: {
        amount: parseFloat(items.reduce((sum, item) => 
          sum + convertJPYtoUSD(item.unitPrice * item.quantity), 0
        ).toFixed(2)),
        currency: 'USD',
      },
      commodities: items.map(item => ({
        description: item.description,
        countryOfManufacture: item.countryOfManufacture,
        quantity: item.quantity,
        quantityUnits: 'PCS',
        unitPrice: { amount: parseFloat(convertJPYtoUSD(item.unitPrice).toFixed(2)), currency: 'USD' },
        customsValue: {
          amount: parseFloat(convertJPYtoUSD(item.unitPrice * item.quantity).toFixed(2)),
          currency: 'USD',
        },
        weight: {
          units: 'KG',
          value: item.weight,
        },
        ...(item.hsCode && { harmonizedCode: item.hsCode }),
      }))
    }
  }

  return shipmentData
} 