#!/usr/bin/env tsx
/**
 * FedEx レート差分検出・マッピング更新スクリプト
 * 
 * 用途: 正規化済みデータとmapping.tsを比較し、新しいsurcharge keyを検出・提案
 * 
 * 実行例:
 *   pnpm fedex:reconcile
 *   pnpm fedex:reconcile --apply
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fedexChargeMap } from '@/lib/rates/mapping'

interface NormalizedEntry {
  caseId: string
  timestamp: string
  sourceFile: string
  normalized: { [serviceType: string]: any }
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
    console.error('正規化ファイル検索エラー:', error)
  }
  return null
}

function loadNormalized(path: string): NormalizedEntry {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content) as NormalizedEntry
  } catch (error) {
    throw new Error(`正規化ファイル読み込み失敗: ${path}: ${error}`)
  }
}

function extractSurchargeKeys(normalized: { [serviceType: string]: any }): Set<string> {
  const keys = new Set<string>()
  
  for (const serviceData of Object.values(normalized)) {
    if (serviceData.surcharges) {
      for (const key of Object.keys(serviceData.surcharges)) {
        if (serviceData.surcharges[key]?.amount && serviceData.surcharges[key].amount > 0) {
          keys.add(key)
        }
      }
    }
    if (serviceData.specialHandling) {
      for (const key of Object.keys(serviceData.specialHandling)) {
        if (serviceData.specialHandling[key]?.amount && serviceData.specialHandling[key].amount > 0) {
          keys.add(`specialHandling.${key}`)
        }
      }
    }
  }
  
  return keys
}

function findUnknownKeys(observedKeys: Set<string>, mappedKeys: Set<string>): string[] {
  const unknown: string[] = []
  
  for (const key of observedKeys) {
    // mapping.tsに存在するかチェック
    let found = false
    for (const mappedKey of mappedKeys) {
      if (key.toLowerCase().includes(mappedKey.toLowerCase()) || 
          mappedKey.toLowerCase().includes(key.toLowerCase())) {
        found = true
        break
      }
    }
    
    // 既知のキーもチェック
    const knownKeys = ['fuel', 'peak', 'deliveryArea', 'residential', 'importProcessing', 
                       'saturdayDelivery', 'insuredValue', 'other', 'oversize', 
                       'dimension', 'weight', 'packaging', 'nonStackable']
    if (!found && !knownKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      unknown.push(key)
    }
  }
  
  return unknown
}

function updateMapping(unknownKeys: string[]): void {
  const mappingPath = join(process.cwd(), 'src', 'lib', 'rates', 'mapping.ts')
  let content = readFileSync(mappingPath, 'utf8')
  
  // 既存のmappingに追加
  const additions = unknownKeys.map(key => {
    return `  "${key}": "other", // 自動追加: ${new Date().toISOString()}`
  }).join('\n')
  
  // export const fedexChargeMap の閉じ括弧の前に追加
  // 既存のエントリの後に追加（最後のエントリの後にカンマを追加）
  const regex = /(export const fedexChargeMap: Record<string, ChargeKey> = \{[\s\S]*?)(\n\};)/m
  if (regex.test(content)) {
    content = content.replace(regex, (match, before, closing) => {
      // 最後の行にカンマがあるかチェック
      const trimmedBefore = before.trimEnd()
      const needsComma = !trimmedBefore.endsWith(',') && !trimmedBefore.endsWith('{')
      const comma = needsComma ? ',' : ''
      return before + comma + '\n' + additions + closing
    })
    writeFileSync(mappingPath, content, 'utf8')
    console.log(`✅ mapping.ts を更新しました`)
  } else {
    console.error('❌ mapping.ts の形式が予期しない形式です')
    console.error('   手動で追加してください')
  }
}

async function main() {
  try {
    const apply = process.argv.includes('--apply')
    
    const normalizedPath = findLatestNormalized()
    if (!normalizedPath) {
      console.log('ℹ️  正規化済みファイルが見つかりません。先に pnpm fedex:norm を実行してください。')
      process.exit(0)
    }
    
    console.log(`📂 正規化ファイルを使用: ${normalizedPath}`)
    const normalized = loadNormalized(normalizedPath)
    
    // 観測されたキーを抽出
    const observedKeys = extractSurchargeKeys(normalized.normalized)
    console.log(`🔍 観測されたキー: ${Array.from(observedKeys).join(', ')}`)
    
    // mapping.tsの既存キーを取得
    const mappedKeys = new Set(Object.keys(fedexChargeMap))
    
    // 未知のキーを検出
    const unknownKeys = findUnknownKeys(observedKeys, mappedKeys)
    
    if (unknownKeys.length === 0) {
      console.log('✅ 新しい未知のキーは見つかりませんでした')
      console.log('   既存のmappingでカバーされています')
      process.exit(0)
    }
    
    console.log(`\n📋 新しいキー候補 (${unknownKeys.length}件):`)
    unknownKeys.forEach(key => {
      console.log(`  - ${key}`)
    })
    
    if (apply) {
      updateMapping(unknownKeys)
      console.log('\n✅ mapping.ts への追加が完了しました')
    } else {
      console.log('\n💡 mapping.ts に追加するには: pnpm fedex:reconcile --apply')
      console.log('\n提案される追加内容:')
      unknownKeys.forEach(key => {
        console.log(`  "${key}": "other",`)
      })
    }
    
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

main()

