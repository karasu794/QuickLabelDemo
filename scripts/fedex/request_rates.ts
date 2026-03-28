#!/usr/bin/env tsx
/**
 * FedEx Rate API 直接呼び出しスクリプト
 * 
 * 用途: UI経由ではなく直接FedEx APIを叩いてレートレスポンスを取得・保存
 * 
 * 実行例:
 *   pnpm fedex:request fedex_cases/C1.json
 *   pnpm fedex:request --case-id C1
 */

// 環境変数を読み込む
import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getFedExAccessToken, getFedExCredentialsByOrigin, fedexApiRequest, type RateRequestInfo } from '@/lib/fedex/auth'

interface ShipmentConfig {
  caseId: string
  shipper: {
    countryCode: string
    postalCode: string
    stateCode?: string
    cityName: string
  }
  recipient: {
    countryCode: string
    postalCode: string
    stateCode?: string
    cityName: string
    isResidential: boolean
  }
  shipDate: string // YYYY-MM-DD
  packages: Array<{
    weight: number // KG
    dimensions?: {
      length: number
      width: number
      height: number
    }
    declaredValue?: number // JPY
  }>
}

function parseArgs(): { configPath?: string; caseId?: string } {
  const args = process.argv.slice(2)
  const configPath = args.find(arg => !arg.startsWith('--'))
  const caseId = args.includes('--case-id') 
    ? args[args.indexOf('--case-id') + 1] 
    : undefined
  return { configPath, caseId }
}

async function loadConfig(pathOrId: string): Promise<ShipmentConfig> {
  const path = pathOrId.startsWith('/') || pathOrId.match(/^[A-Z]:/) 
    ? pathOrId 
    : join(process.cwd(), pathOrId.startsWith('fedex_cases/') ? pathOrId : `fedex_cases/${pathOrId}.json`)
  
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content) as ShipmentConfig
  } catch (error) {
    throw new Error(`設定ファイルの読み込みに失敗: ${path}: ${error}`)
  }
}

function buildRateRequest(config: ShipmentConfig): RateRequestInfo {
  return {
    shipperCountryCode: config.shipper.countryCode,
    shipperPostalCode: config.shipper.postalCode,
    shipperStateCode: config.shipper.stateCode,
    shipperCityName: config.shipper.cityName,
    recipientCountryCode: config.recipient.countryCode,
    recipientPostalCode: config.recipient.postalCode,
    recipientStateCode: config.recipient.stateCode,
    recipientCityName: config.recipient.cityName,
    shipDate: config.shipDate,
    isResidential: config.recipient.isResidential,
    packages: config.packages.map(pkg => ({
      weight: pkg.weight,
      dimensions: pkg.dimensions,
      declaredValue: pkg.declaredValue,
    })),
  }
}

async function requestFedExRates(rateInfo: RateRequestInfo): Promise<any> {
  const credentials = getFedExCredentialsByOrigin(rateInfo.shipperCountryCode)
  const accessToken = await getFedExAccessToken(rateInfo.shipperCountryCode)

  if (!credentials.accountNumber) {
    throw new Error('FedExアカウント番号が設定されていません')
  }

  const requestBody = {
    accountNumber: {
      value: credentials.accountNumber
    },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: rateInfo.shipperPostalCode,
          countryCode: rateInfo.shipperCountryCode,
          ...(rateInfo.shipperStateCode && ['US', 'CA'].includes(rateInfo.shipperCountryCode) && { 
            stateOrProvinceCode: rateInfo.shipperStateCode 
          }),
          city: rateInfo.shipperCityName
        }
      },
      recipient: {
        address: {
          postalCode: rateInfo.recipientPostalCode,
          countryCode: rateInfo.recipientCountryCode,
          ...(rateInfo.recipientStateCode && ['US', 'CA'].includes(rateInfo.recipientCountryCode) && { 
            stateOrProvinceCode: rateInfo.recipientStateCode 
          }),
          city: rateInfo.recipientCityName,
          residential: rateInfo.isResidential
        }
      },
      shipDatestamp: rateInfo.shipDate,
      rateRequestType: ["ACCOUNT", "LIST"],
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: {
              value: credentials.accountNumber
            }
          }
        }
      },
      requestedPackageLineItems: rateInfo.packages.map((pkg, index) => ({
        sequenceNumber: index + 1,
        groupPackageCount: 1,
        weight: {
          units: "KG",
          value: pkg.weight
        },
        ...(pkg.dimensions && {
          dimensions: {
            length: pkg.dimensions.length,
            width: pkg.dimensions.width,
            height: pkg.dimensions.height,
            units: "CM"
          }
        }),
        ...(pkg.declaredValue && {
          declaredValue: {
            amount: pkg.declaredValue,
            currency: "JPY"
          }
        })
      }))
    }
  }

  const response = await fedexApiRequest<any>(
    '/rate/v1/rates/quotes',
    'POST',
    accessToken,
    requestBody
  )

  if (response.errors && response.errors.length > 0) {
    const error = response.errors[0]
    throw new Error(`FedEx Rate API エラー: ${error.code} - ${error.message}`)
  }

  return response.output || response
}

function saveLog(caseId: string, fedexRaw: any, requestBody: any): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const dateDir = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const logDir = join(process.cwd(), 'artifacts', 'fedex_logs', dateDir)
  mkdirSync(logDir, { recursive: true })

  const logFile = join(logDir, `run_${timestamp}.json`)
  const logEntry = {
    caseId,
    timestamp: new Date().toISOString(),
    request: requestBody,
    fedexRaw,
  }

  writeFileSync(logFile, JSON.stringify(logEntry, null, 2), 'utf8')
  return logFile
}

async function main() {
  try {
    const { configPath, caseId } = parseArgs()
    
    if (!configPath && !caseId) {
      console.error('使用方法: pnpm fedex:request <config-path> または pnpm fedex:request --case-id <case-id>')
      process.exit(1)
    }

    const config = await loadConfig(configPath || caseId!)
    const rateInfo = buildRateRequest(config)
    
    console.log(`📊 FedEx Rate API リクエスト開始: ${config.caseId}`)
    const fedexRaw = await requestFedExRates(rateInfo)
    
    // リクエストボディを再構築（ログ用）
    const credentials = getFedExCredentialsByOrigin(rateInfo.shipperCountryCode)
    const requestBody = {
      accountNumber: { value: credentials.accountNumber },
      requestedShipment: {
        shipper: {
          address: {
            postalCode: rateInfo.shipperPostalCode,
            countryCode: rateInfo.shipperCountryCode,
            ...(rateInfo.shipperStateCode && ['US', 'CA'].includes(rateInfo.shipperCountryCode) && { 
              stateOrProvinceCode: rateInfo.shipperStateCode 
            }),
            city: rateInfo.shipperCityName
          }
        },
        recipient: {
          address: {
            postalCode: rateInfo.recipientPostalCode,
            countryCode: rateInfo.recipientCountryCode,
            ...(rateInfo.recipientStateCode && ['US', 'CA'].includes(rateInfo.recipientCountryCode) && { 
              stateOrProvinceCode: rateInfo.recipientStateCode 
            }),
            city: rateInfo.recipientCityName,
            residential: rateInfo.isResidential
          }
        },
        shipDatestamp: rateInfo.shipDate,
        rateRequestType: ["ACCOUNT", "LIST"],
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        shippingChargesPayment: {
          paymentType: "SENDER",
          payor: {
            responsibleParty: {
              accountNumber: { value: credentials.accountNumber }
            }
          }
        },
        requestedPackageLineItems: rateInfo.packages.map((pkg, index) => ({
          sequenceNumber: index + 1,
          groupPackageCount: 1,
          weight: { units: "KG", value: pkg.weight },
          ...(pkg.dimensions && {
            dimensions: {
              length: pkg.dimensions.length,
              width: pkg.dimensions.width,
              height: pkg.dimensions.height,
              units: "CM"
            }
          }),
          ...(pkg.declaredValue && {
            declaredValue: {
              amount: pkg.declaredValue,
              currency: "JPY"
            }
          })
        }))
      }
    }
    
    const logFile = saveLog(config.caseId, fedexRaw, requestBody)
    console.log(`✅ レスポンス保存完了: ${logFile}`)
    console.log(`   サービス数: ${fedexRaw?.rateReplyDetails?.length || 0}`)
    
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()

