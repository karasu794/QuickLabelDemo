#!/usr/bin/env tsx
/**
 * FedEx Rate 自律学習ループスクリプト
 * 
 * 用途: FedEx本番APIとFQL内部ロジックの完全一致を目指す自律ループ
 * 
 * 実行例:
 *   pnpm fedex:auto-loop
 *   pnpm fedex:auto-loop --max-iterations 10
 *   pnpm fedex:auto-loop --cases C1 C2
 */

// 環境変数を読み込む
import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'child_process'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import type { RateBreakdown } from '@/types/rate'

interface CaseResult {
  caseId: string
  status: 'OK' | 'DIFF'
  diffAmount?: number
  diffBase?: number
  diffTotal?: number
  diffDiscount?: number
  diffFuel?: number
  diffPeak?: number
  diffDeliveryArea?: number
  diffOther?: number
  newSurchargeKeys?: string[]
  fedexTotal?: number
  fqlTotal?: number
}

interface IterationResult {
  iteration: number
  timestamp: string
  caseResults: CaseResult[]
  newSurchargeKeys: string[]
  mappingAdjustments: string[]
  nextHypothesis: string
  status: 'continue' | 'done'
  confidence?: number
}

interface HistoryEntry {
  iteration: number
  timestamp: string
  results: IterationResult
}

const DEFAULT_CASES = ['C1', 'C2', 'C3']
const MAX_ITERATIONS = 20
const CONVERGENCE_THRESHOLD = 0 // 完全一致を目指す

function parseArgs(): { cases: string[]; maxIterations: number } {
  const args = process.argv.slice(2)
  const casesIndex = args.indexOf('--cases')
  const cases = casesIndex >= 0 && casesIndex < args.length - 1
    ? args.slice(casesIndex + 1).filter(arg => !arg.startsWith('--'))
    : DEFAULT_CASES
  
  const maxIterIndex = args.indexOf('--max-iterations')
  const maxIterations = maxIterIndex >= 0 && maxIterIndex < args.length - 1
    ? parseInt(args[maxIterIndex + 1], 10) || MAX_ITERATIONS
    : MAX_ITERATIONS
  
  return { cases, maxIterations }
}

function execCommand(command: string, silent = false): { success: boolean; output?: string; error?: string } {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: process.cwd()
    })
    return { success: true, output }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

function findLatestLogFile(): string | null {
  const baseDir = join(process.cwd(), 'artifacts', 'fedex_logs')
  try {
    const dateDirs = readdirSync(baseDir)
      .filter(f => {
        try {
          return statSync(join(baseDir, f)).isDirectory()
        } catch {
          return false
        }
      })
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
    // ディレクトリが存在しない場合はnullを返す
  }
  return null
}

function findLatestNormalized(): string | null {
  const baseDir = join(process.cwd(), 'artifacts', 'fedex_logs')
  try {
    const dateDirs = readdirSync(baseDir)
      .filter(f => {
        try {
          return statSync(join(baseDir, f)).isDirectory()
        } catch {
          return false
        }
      })
      .sort()
      .reverse()
    
    for (const dateDir of dateDirs) {
      const files = readdirSync(join(baseDir, dateDir))
        .filter(f => f.startsWith('normalized_') && f.endsWith('.json'))
        .sort()
        .reverse()
      
      if (files.length > 0) {
        return join(baseDir, dateDir, files[0])
      }
    }
  } catch (error) {
    // ディレクトリが存在しない場合はnullを返す
  }
  return null
}

function findNormalizedByCaseId(caseId: string): string | null {
  const baseDir = join(process.cwd(), 'artifacts', 'fedex_logs')
  try {
    const dateDirs = readdirSync(baseDir)
      .filter(f => {
        try {
          return statSync(join(baseDir, f)).isDirectory()
        } catch {
          return false
        }
      })
      .sort()
      .reverse()
    
    for (const dateDir of dateDirs) {
      const files = readdirSync(join(baseDir, dateDir))
        .filter(f => f.startsWith(`normalized_${caseId}_`) && f.endsWith('.json'))
        .sort()
        .reverse()
      
      if (files.length > 0) {
        return join(baseDir, dateDir, files[0])
      }
    }
  } catch (error) {
    // ディレクトリが存在しない場合はnullを返す
  }
  return null
}

function loadLogFile(path: string): any {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`ログファイル読み込み失敗: ${path}: ${error}`)
  }
}

function calculateDiff(fedexRaw: any, normalized: RateBreakdown): CaseResult {
  // FedEx APIの生レスポンスからtotalNetChargeを取得
  let fedexTotal = 0
  let fedexBase = 0
  let fedexDiscounts = 0
  
  const rateReplyDetails = fedexRaw?.rateReplyDetails || fedexRaw?.output?.rateReplyDetails || []
  if (rateReplyDetails.length > 0) {
    // 最初のサービス（通常はINTERNATIONAL_PRIORITY）を使用
    const ratedShipment = rateReplyDetails[0]?.ratedShipmentDetails?.[0]
    if (ratedShipment) {
      const shipmentRateDetail = ratedShipment?.shipmentRateDetails?.[0] || ratedShipment?.shipmentRateDetail
      if (shipmentRateDetail) {
        fedexTotal = Math.round(Number(shipmentRateDetail.totalNetCharge?.amount || shipmentRateDetail.totalNetCharge || 0))
        fedexBase = Math.round(Number(shipmentRateDetail.totalBaseCharge?.amount || shipmentRateDetail.totalBaseCharge || 0))
        fedexDiscounts = Math.round(Number(shipmentRateDetail.totalDiscounts?.amount || shipmentRateDetail.totalDiscounts || 0))
      }
    }
  }
  
  // FQL正規化済みデータ
  const fqlTotal = normalized.totalNetCharge.amount
  const fqlBase = normalized.baseCharge.amount
  const fqlDiscounts = normalized.discounts?.amount || 0
  const fqlFuel = normalized.surcharges.fuel?.amount || 0
  const fqlPeak = normalized.surcharges.peak?.amount || 0
  const fqlDeliveryArea = normalized.surcharges.deliveryArea?.amount || 0
  const fqlOther = normalized.surcharges.other?.amount || 0
  
  // 差分計算
  const diffTotal = Math.abs(fedexTotal - fqlTotal)
  const diffBase = Math.abs(fedexBase - fqlBase)
  const diffDiscount = Math.abs(fedexDiscounts - fqlDiscounts)
  
  // FedEx APIからsurchargeを抽出（簡易版）
  let fedexFuel = 0
  let fedexPeak = 0
  let fedexDeliveryArea = 0
  
  if (rateReplyDetails.length > 0) {
    const ratedShipment = rateReplyDetails[0]?.ratedShipmentDetails?.[0]
    const surcharges = ratedShipment?.shipmentRateDetails?.[0]?.surcharges || 
                      ratedShipment?.shipmentRateDetail?.surcharges || 
                      []
    
    for (const surcharge of surcharges) {
      const surchargeType = (surcharge.surchargeType || surcharge.type || '').toUpperCase()
      const amount = Math.round(Number(surcharge.amount?.amount || surcharge.amount || 0))
      
      if (surchargeType.includes('FUEL')) {
        fedexFuel += amount
      } else if (surchargeType.includes('PEAK') || surchargeType.includes('DEMAND')) {
        fedexPeak += amount
      } else if (surchargeType.includes('DELIVERY_AREA') || surchargeType.includes('ODA')) {
        fedexDeliveryArea += amount
      }
    }
  }
  
  const diffFuel = Math.abs(fedexFuel - fqlFuel)
  const diffPeak = Math.abs(fedexPeak - fqlPeak)
  const diffDeliveryArea = Math.abs(fedexDeliveryArea - fqlDeliveryArea)
  
  // 最大差分をdiffAmountとして使用
  const diffAmount = Math.max(diffTotal, diffBase, diffDiscount, diffFuel, diffPeak, diffDeliveryArea)
  
  // 新規surcharge keyの検出（簡易版）
  const newSurchargeKeys: string[] = []
  if (rateReplyDetails.length > 0) {
    const ratedShipment = rateReplyDetails[0]?.ratedShipmentDetails?.[0]
    const surcharges = ratedShipment?.shipmentRateDetails?.[0]?.surcharges || 
                      ratedShipment?.shipmentRateDetail?.surcharges || 
                      []
    
    const knownKeys = ['fuel', 'peak', 'delivery_area', 'residential', 'import_processing', 
                      'saturday_delivery', 'insured_value', 'oversize', 'dimension', 
                      'weight', 'packaging', 'non_stackable']
    
    for (const surcharge of surcharges) {
      const surchargeType = (surcharge.surchargeType || surcharge.type || surcharge.code || '').toLowerCase()
      if (surchargeType && !knownKeys.some(k => surchargeType.includes(k))) {
        if (!newSurchargeKeys.includes(surchargeType)) {
          newSurchargeKeys.push(surchargeType)
        }
      }
    }
  }
  
  return {
    caseId: fedexRaw.caseId || 'UNKNOWN',
    status: diffAmount <= CONVERGENCE_THRESHOLD ? 'OK' : 'DIFF',
    diffAmount,
    diffBase,
    diffTotal,
    diffDiscount,
    diffFuel,
    diffPeak,
    diffDeliveryArea,
    diffOther: Math.abs((fedexTotal - fedexBase + fedexDiscounts) - (fqlTotal - fqlBase + fqlDiscounts)),
    newSurchargeKeys: newSurchargeKeys.length > 0 ? newSurchargeKeys : undefined,
    fedexTotal,
    fqlTotal,
  }
}

function saveHistory(iteration: number, result: IterationResult): string {
  const historyDir = join(process.cwd(), 'artifacts', 'fedex_logs', 'history')
  mkdirSync(historyDir, { recursive: true })
  
  const historyFile = join(historyDir, `history_${iteration}_${Date.now()}.json`)
  const entry: HistoryEntry = {
    iteration,
    timestamp: new Date().toISOString(),
    results: result,
  }
  
  writeFileSync(historyFile, JSON.stringify(entry, null, 2), 'utf8')
  return historyFile
}

function generateHypothesis(caseResults: CaseResult[], newSurchargeKeys: string[]): string {
  const hasDiffs = caseResults.some(r => r.status === 'DIFF')
  const hasNewKeys = newSurchargeKeys.length > 0
  
  if (!hasDiffs && !hasNewKeys) {
    return '差分なし。完全一致を達成。'
  }
  
  const hypotheses: string[] = []
  
  if (hasNewKeys) {
    hypotheses.push(`新規surcharge keyを検出: ${newSurchargeKeys.join(', ')}。mapping.tsに追加が必要。`)
  }
  
  const baseDiffs = caseResults.filter(r => r.diffBase && r.diffBase > 0)
  if (baseDiffs.length > 0) {
    hypotheses.push(`base chargeの差分を検出。totalBaseChargeの取得ロジックを確認。`)
  }
  
  const fuelDiffs = caseResults.filter(r => r.diffFuel && r.diffFuel > 0)
  if (fuelDiffs.length > 0) {
    hypotheses.push(`fuel surchargeの差分を検出。surchargeType='FUEL'のマッピングを確認。`)
  }
  
  const peakDiffs = caseResults.filter(r => r.diffPeak && r.diffPeak > 0)
  if (peakDiffs.length > 0) {
    hypotheses.push(`peak surchargeの差分を検出。surchargeType='PEAK'のマッピングを確認。`)
  }
  
  const deliveryAreaDiffs = caseResults.filter(r => r.diffDeliveryArea && r.diffDeliveryArea > 0)
  if (deliveryAreaDiffs.length > 0) {
    hypotheses.push(`delivery area surchargeの差分を検出。surchargeType='DELIVERY_AREA'のマッピングを確認。`)
  }
  
  return hypotheses.join(' ')
}

function calculateConfidence(caseResults: CaseResult[]): number {
  const totalCases = caseResults.length
  const okCases = caseResults.filter(r => r.status === 'OK').length
  return Math.round((okCases / totalCases) * 100)
}

async function runIteration(iteration: number, cases: string[]): Promise<IterationResult> {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔄 Iteration ${iteration}`)
  console.log(`${'='.repeat(80)}\n`)
  
  const caseResults: CaseResult[] = []
  const allNewSurchargeKeys = new Set<string>()
  
  // 1. 各ケースに対してFedEx APIリクエスト
  for (const caseId of cases) {
    console.log(`📦 ケース実行: ${caseId}`)
    const result = execCommand(`pnpm fedex:request --case-id ${caseId}`, false)
    if (!result.success) {
      console.warn(`⚠️  ケース ${caseId} のリクエストに失敗しました。続行します...`)
      caseResults.push({
        caseId,
        status: 'DIFF',
        diffAmount: Infinity,
      })
      continue
    }
    
    // API制限対策の待機
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // 2. 正規化処理（各ケースごとに個別実行）
  console.log(`\n🔄 正規化処理`)
  const caseLogPaths: { [caseId: string]: string } = {}
  
  // 各ケースのログファイルを検索
  const baseDir = join(process.cwd(), 'artifacts', 'fedex_logs')
  const dateDirs = readdirSync(baseDir)
    .filter(f => {
      try {
        return statSync(join(baseDir, f)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()
    .reverse()
  
  for (const caseId of cases) {
    let found = false
    for (const dateDir of dateDirs) {
      const files = readdirSync(join(baseDir, dateDir))
        .filter(f => f.startsWith('run_') && f.endsWith('.json'))
        .sort()
        .reverse()
      
      for (const file of files) {
        const logPath = join(baseDir, dateDir, file)
        const logData = loadLogFile(logPath)
        if (logData.caseId === caseId) {
          caseLogPaths[caseId] = logPath
          found = true
          break
        }
      }
      if (found) break
    }
  }
  
  // 各ケースごとに正規化を実行
  const normalizedDataByCase: { [caseId: string]: any } = {}
  for (const caseId of cases) {
    const logPath = caseLogPaths[caseId]
    if (!logPath) {
      console.warn(`⚠️  ケース ${caseId} のログファイルが見つかりません`)
      continue
    }
    
    console.log(`  正規化中: ${caseId}`)
    const normResult = execCommand(`pnpm fedex:norm "${logPath}"`, true)
    if (!normResult.success) {
      console.warn(`⚠️  ケース ${caseId} の正規化に失敗しました`)
      continue
    }
    
    // 正規化済みファイルを検索
    const normalizedPath = findNormalizedByCaseId(caseId)
    if (normalizedPath) {
      normalizedDataByCase[caseId] = loadLogFile(normalizedPath)
    }
  }
  
  // 3. 差分計算（各ケースごと）
  console.log(`\n🔍 差分計算`)
  for (const caseId of cases) {
    const logPath = caseLogPaths[caseId]
    if (!logPath) {
      caseResults.push({
        caseId,
        status: 'DIFF',
        diffAmount: Infinity,
      })
      continue
    }
    
    const logData = loadLogFile(logPath)
    const normalizedData = normalizedDataByCase[caseId]
    
    if (!normalizedData || !normalizedData.normalized) {
      caseResults.push({
        caseId,
        status: 'DIFF',
        diffAmount: Infinity,
      })
      continue
    }
    
    // 最初のサービス（通常はINTERNATIONAL_PRIORITY）を使用
    const serviceType = Object.keys(normalizedData.normalized)[0] || 'INTERNATIONAL_PRIORITY'
    const normalized = normalizedData.normalized[serviceType]
    
    if (normalized) {
      const diff = calculateDiff(logData.fedexRaw, normalized)
      caseResults.push(diff)
      
      if (diff.newSurchargeKeys) {
        diff.newSurchargeKeys.forEach(k => allNewSurchargeKeys.add(k))
      }
    } else {
      caseResults.push({
        caseId,
        status: 'DIFF',
        diffAmount: Infinity,
      })
    }
  }
  
  // 4. Reconcile（新規surcharge keyの検出）
  console.log(`\n🔍 Reconcile処理`)
  const reconcileResult = execCommand('pnpm fedex:reconcile', true)
  
  // 5. 差分があれば自動反映
  const hasNewKeys = allNewSurchargeKeys.size > 0
  if (hasNewKeys) {
    console.log(`\n📝 マッピング自動更新`)
    const applyResult = execCommand('pnpm fedex:reconcile --apply', false)
    if (!applyResult.success) {
      console.warn('⚠️  マッピング更新に失敗しました（手動で確認してください）')
    }
  }
  
  // 6. 結果判定
  const allOk = caseResults.every(r => r.status === 'OK')
  const status: 'continue' | 'done' = (allOk && !hasNewKeys) ? 'done' : 'continue'
  
  const result: IterationResult = {
    iteration,
    timestamp: new Date().toISOString(),
    caseResults,
    newSurchargeKeys: Array.from(allNewSurchargeKeys),
    mappingAdjustments: hasNewKeys ? Array.from(allNewSurchargeKeys) : [],
    nextHypothesis: generateHypothesis(caseResults, Array.from(allNewSurchargeKeys)),
    status,
    confidence: calculateConfidence(caseResults),
  }
  
  return result
}

function printReport(result: IterationResult): void {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`[Learning Report]`)
  console.log(`${'='.repeat(80)}`)
  console.log(`Step: ${result.iteration}`)
  console.log(`\nCase Results:`)
  result.caseResults.forEach(r => {
    if (r.status === 'OK') {
      console.log(`  - ${r.caseId}: OK`)
    } else {
      console.log(`  - ${r.caseId}: Δ${r.diffAmount || 0}JPY`)
      if (r.diffBase) console.log(`    base: Δ${r.diffBase}JPY`)
      if (r.diffTotal) console.log(`    total: Δ${r.diffTotal}JPY`)
      if (r.diffFuel) console.log(`    fuel: Δ${r.diffFuel}JPY`)
      if (r.diffPeak) console.log(`    peak: Δ${r.diffPeak}JPY`)
      if (r.diffDeliveryArea) console.log(`    deliveryArea: Δ${r.diffDeliveryArea}JPY`)
    }
  })
  
  if (result.newSurchargeKeys.length > 0) {
    console.log(`\nNew Surcharge Keys: [${result.newSurchargeKeys.join(', ')}]`)
  }
  
  if (result.mappingAdjustments.length > 0) {
    console.log(`\nMapping Adjustments: [${result.mappingAdjustments.join(', ')}]`)
  }
  
  console.log(`\nNext Hypothesis: "${result.nextHypothesis}"`)
  console.log(`\nStatus: ${result.status}`)
  if (result.confidence !== undefined) {
    console.log(`Confidence: ${result.confidence}%`)
  }
  console.log(`${'='.repeat(80)}\n`)
}

async function main() {
  try {
    const { cases, maxIterations } = parseArgs()
    
    console.log('🚀 FedEx Rate Matching 自律ループ開始')
    console.log(`   ケース: ${cases.join(', ')}`)
    console.log(`   最大反復数: ${maxIterations}`)
    console.log(`   目標: 完全一致（差分=0）`)
    
    const history: HistoryEntry[] = []
    let iteration = 1
    
    while (iteration <= maxIterations) {
      const result = await runIteration(iteration, cases)
      printReport(result)
      
      const historyFile = saveHistory(iteration, result)
      history.push({
        iteration,
        timestamp: new Date().toISOString(),
        results: result,
      })
      
      if (result.status === 'done') {
        console.log('\n✅ FedEx Rate Matching COMPLETE')
        console.log(`- Total iterations: ${iteration}`)
        console.log(`- Learned surcharge rules: ${Array.from(new Set(history.flatMap(h => h.results.newSurchargeKeys))).join(', ') || 'none'}`)
        console.log(`- Confidence: ${result.confidence || 0}%`)
        console.log(`\nGenerated files:`)
        console.log(`- ${historyFile}`)
        console.log(`- Updated mapping.ts (if applicable)`)
        break
      }
      
      iteration++
      
      // 次の反復前の待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    if (iteration > maxIterations) {
      console.log(`\n⚠️  最大反復数（${maxIterations}）に達しました`)
      console.log(`   最終状態を確認してください`)
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()

