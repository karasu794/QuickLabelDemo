#!/usr/bin/env tsx
/**
 * FedEx レスポンス正規化スクリプト
 * 
 * 用途: 生レスポンスをFQL内部DTOに変換し、正規化済みデータを保存
 * 
 * 実行例:
 *   pnpm fedex:norm artifacts/fedex_logs/20251102/run_*.json
 *   pnpm fedex:norm --latest
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import type { RateBreakdown } from '@/types/rate'

interface LogEntry {
  caseId: string
  timestamp: string
  request: any
  fedexRaw: any
}

function parseArgs(): { pattern?: string; latest?: boolean } {
  const args = process.argv.slice(2)
  const pattern = args.find(arg => !arg.startsWith('--') && !arg.startsWith('artifacts'))
  const latest = args.includes('--latest')
  return { pattern, latest }
}

function findLatestLogFile(): string | null {
  const baseDir = join(process.cwd(), 'artifacts', 'fedex_logs')
  try {
    const dateDirs = readdirSync(baseDir)
      .filter(f => statSync(join(baseDir, f)).isDirectory())
      .sort()
      .reverse()
    
    for (const dateDir of dateDirs) {
      const files = readdirSync(join(baseDir, dateDir))
        .filter(f => f.startsWith('run_') && f.endsWith('.json'))
        .sort()
        .reverse()
      
      if (files.length > 0) {
        return join(baseDir, dateDir, files[0])
      }
    }
  } catch (error) {
    console.error('ログファイル検索エラー:', error)
  }
  return null
}

function loadLogFile(path: string): LogEntry {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content) as LogEntry
  } catch (error) {
    throw new Error(`ログファイル読み込み失敗: ${path}: ${error}`)
  }
}

function normalizeRateResponse(fedexRaw: any): { [serviceType: string]: RateBreakdown } {
  const normalized: { [serviceType: string]: RateBreakdown } = {}
  
  // fedexRawが直接rateReplyDetailsを含む場合
  let rateReplyDetails = fedexRaw?.rateReplyDetails
  
  // または output.rateReplyDetails を含む場合
  if (!rateReplyDetails && fedexRaw?.output?.rateReplyDetails) {
    rateReplyDetails = fedexRaw.output.rateReplyDetails
  }
  
  if (!rateReplyDetails || !Array.isArray(rateReplyDetails)) {
    console.warn('⚠️  rateReplyDetailsが見つかりません')
    console.warn('   構造:', Object.keys(fedexRaw || {}))
    return normalized
  }

  for (const rateDetail of rateReplyDetails) {
    const serviceType = rateDetail.serviceType || 'UNKNOWN'
    try {
      // ratedShipmentDetailsの最初の要素を正規化
      const ratedShipment = rateDetail.ratedShipmentDetails?.[0]
      if (ratedShipment) {
        // サービス情報も含めて正規化（serviceTypeが正規化関数内で参照される場合がある）
        const enrichedRatedShipment = {
          ...ratedShipment,
          serviceType: rateDetail.serviceType,
          serviceName: rateDetail.serviceName,
          operationalDetail: rateDetail.operationalDetail,
        }
        normalized[serviceType] = normalizeFedExRate(enrichedRatedShipment)
      }
    } catch (error) {
      console.error(`正規化エラー (${serviceType}):`, error)
    }
  }

  return normalized
}

function saveNormalized(caseId: string, timestamp: string, normalized: { [serviceType: string]: RateBreakdown }, originalPath: string): string {
  const dateDir = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const logDir = join(process.cwd(), 'artifacts', 'fedex_logs', dateDir)
  const logFile = join(logDir, `normalized_${caseId}_${timestamp.slice(0, 10)}.json`)
  
  const normalizedEntry = {
    caseId,
    timestamp: new Date().toISOString(),
    sourceFile: basename(originalPath),
    normalized,
  }

  writeFileSync(logFile, JSON.stringify(normalizedEntry, null, 2), 'utf8')
  return logFile
}

async function main() {
  try {
    const { pattern, latest } = parseArgs()
    
    let logPath: string | null = null
    
    if (latest) {
      logPath = findLatestLogFile()
      if (!logPath) {
        console.error('❌ 最新のログファイルが見つかりません')
        process.exit(1)
      }
      console.log(`📂 最新ログファイルを使用: ${logPath}`)
    } else if (pattern) {
      logPath = pattern.startsWith('/') || pattern.match(/^[A-Z]:/) 
        ? pattern 
        : join(process.cwd(), pattern)
    } else {
      console.error('使用方法: pnpm fedex:norm <log-file-path> または pnpm fedex:norm --latest')
      process.exit(1)
    }

    const logEntry = loadLogFile(logPath)
    console.log(`📊 正規化開始: ${logEntry.caseId}`)
    
    const normalized = normalizeRateResponse(logEntry.fedexRaw)
    console.log(`✅ 正規化完了: ${Object.keys(normalized).length}サービス`)
    
    const outputFile = saveNormalized(
      logEntry.caseId,
      logEntry.timestamp,
      normalized,
      logPath
    )
    console.log(`💾 保存完了: ${outputFile}`)
    
    // サマリー表示
    for (const [serviceType, breakdown] of Object.entries(normalized)) {
      console.log(`  ${serviceType}:`)
      console.log(`    base: ${breakdown.baseCharge.amount} ${breakdown.baseCharge.currency}`)
      console.log(`    total: ${breakdown.totalNetCharge.amount} ${breakdown.totalNetCharge.currency}`)
      if (breakdown.surcharges.fuel) {
        console.log(`    fuel: ${breakdown.surcharges.fuel.amount}`)
      }
      if (breakdown.surcharges.peak) {
        console.log(`    peak: ${breakdown.surcharges.peak.amount}`)
      }
      if (breakdown.surcharges.deliveryArea) {
        console.log(`    deliveryArea: ${breakdown.surcharges.deliveryArea.amount}`)
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()

