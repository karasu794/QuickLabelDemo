import { createServiceRoleClient } from '@/lib/supabase/server'
import { ReceiptNumberService } from '@/types/receipt'
import { TransactionType } from '@/types/receipt'
import type { Database } from '@/types/supabase'
type ReceiptNumber = Database['public']['Tables']['receipt_numbers']['Row']
type ReceiptNumberInsert = Database['public']['Tables']['receipt_numbers']['Insert']

/**
 * 領収書番号生成サービス
 * YYMMDD0XXXX形式の領収書番号を生成し、日ごとの連番を管理する
 * 
 * 要件:
 * - 2.1: YYMMDD + 0 + 日ごとの連番4桁の形式で領収書番号を生成
 * - 2.2: 同日に複数の領収書が生成される場合、連番を正しくインクリメント
 * - 2.3: 日付が変わった場合、連番を0001にリセット
 */
export class ReceiptNumberServiceImpl implements ReceiptNumberService {
  private supabase = createServiceRoleClient()

  /**
   * 指定された日付に基づいて領収書番号を生成する
   * @param date 生成日付
   * @param transactionId 取引ID
   * @param transactionType 取引タイプ
   * @returns 生成された領収書番号 (YYMMDD0XXXX形式)
   */
  async generateReceiptNumber(
    date: Date, 
    transactionId: string, 
    transactionType: TransactionType
  ): Promise<string> {
    try {
      // 日付キーを YYMMDD 形式で生成
      const dateKey = this.formatDateKey(date)
      
      // 次の連番を取得
      const sequenceNumber = await this.getNextSequence(dateKey)
      
      // 領収書番号を YYMMDD0XXXX 形式で生成
      const receiptNumber = this.formatReceiptNumber(dateKey, sequenceNumber)
      
      // org_id を解決（shipments → open_shipments の順）し、transaction_id の型も合わせる
      const idNum = Number(transactionId)
      const txId = (Number.isFinite(idNum) ? idNum : transactionId) as ReceiptNumberInsert['transaction_id']

      let orgId: string | null = null
      if (Number.isFinite(idNum)) {
        const { data: shipOrg } = await this.supabase
          .from('shipments')
          .select('org_id')
          .eq('id', idNum)
          .maybeSingle()
        orgId = shipOrg?.org_id ?? null
      }
      if (!orgId) {
        const { data: openOrg } = await this.supabase
          .from('open_shipments')
          .select('org_id')
          .eq('id', transactionId)
          .maybeSingle()
        orgId = openOrg?.org_id ?? null
      }

      await this.saveReceiptNumber({
        date_key: dateKey,
        sequence_number: sequenceNumber,
        receipt_number: receiptNumber,
        transaction_id: txId,
        transaction_type: transactionType,
        org_id: orgId || ''
      } as ReceiptNumberInsert)
      
      return receiptNumber
    } catch (error) {
      console.error('Error generating receipt number:', error)
      throw new Error(`領収書番号の生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 指定された日付キーに対する次の連番を取得する
   * @param dateKey 日付キー (YYMMDD形式)
   * @returns 次の連番
   */
  async getNextSequence(dateKey: string): Promise<number> {
    try {
      // 指定された日付の最大連番を取得
      const { data, error } = await this.supabase
        .from('receipt_numbers')
        .select('sequence_number')
        .eq('date_key', dateKey)
        .order('sequence_number', { ascending: false })
        .limit(1)

      if (error) {
        throw new Error(`連番取得エラー: ${error.message}`)
      }

      // 最大連番が存在しない場合は1を返す（初回）
      // 存在する場合は最大値+1を返す
      const maxSequence = data && data.length > 0 ? data[0].sequence_number : 0
      return maxSequence + 1
    } catch (error) {
      console.error('Error getting next sequence:', error)
      throw new Error(`連番取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 既存の領収書番号を取得する（重複チェック用）
   * @param transactionId 取引ID
   * @param transactionType 取引タイプ
   * @returns 既存の領収書番号（存在しない場合はnull）
   */
  async getExistingReceiptNumber(
    transactionId: string, 
    transactionType: TransactionType
  ): Promise<string | null> {
    try {
      const idNum2 = Number(transactionId)
      const txId2 = (Number.isFinite(idNum2) ? idNum2 : transactionId) as ReceiptNumber['transaction_id']

      const { data, error } = await this.supabase
        .from('receipt_numbers')
        .select('receipt_number')
        .eq('transaction_id', txId2)
        .eq('transaction_type', transactionType)
        .single()

      if (error) {
        // レコードが存在しない場合は null を返す
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`既存領収書番号取得エラー: ${error.message}`)
      }

      return data.receipt_number
    } catch (error) {
      console.error('Error getting existing receipt number:', error)
      throw new Error(`既存領収書番号の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 指定された日付の領収書番号統計を取得する
   * @param date 対象日付
   * @returns 統計情報
   */
  async getDateStatistics(date: Date): Promise<{
    dateKey: string
    totalCount: number
    maxSequence: number
  }> {
    try {
      const dateKey = this.formatDateKey(date)
      
      const { data, error } = await this.supabase
        .from('receipt_numbers')
        .select('sequence_number')
        .eq('date_key', dateKey)

      if (error) {
        throw new Error(`統計取得エラー: ${error.message}`)
      }

      const totalCount = data.length
      const maxSequence = data.length > 0 
        ? Math.max(...data.map(item => item.sequence_number))
        : 0

      return {
        dateKey,
        totalCount,
        maxSequence
      }
    } catch (error) {
      console.error('Error getting date statistics:', error)
      throw new Error(`日付統計の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 日付を YYMMDD 形式の文字列に変換する
   * @param date 変換対象の日付
   * @returns YYMMDD形式の文字列
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear().toString().slice(-2) // 下2桁
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * 領収書番号を YYMMDD0XXXX 形式で生成する
   * @param dateKey 日付キー (YYMMDD)
   * @param sequenceNumber 連番
   * @returns YYMMDD0XXXX形式の領収書番号
   */
  private formatReceiptNumber(dateKey: string, sequenceNumber: number): string {
    // 連番を4桁の文字列に変換（0埋め）
    const paddedSequence = sequenceNumber.toString().padStart(4, '0')
    return `${dateKey}0${paddedSequence}`
  }

  /**
   * 領収書番号をデータベースに保存する
   * @param receiptData 保存する領収書番号データ
   */
  private async saveReceiptNumber(receiptData: ReceiptNumberInsert): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('receipt_numbers')
        .insert(receiptData)

      if (error) {
        throw new Error(`保存エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving receipt number:', error)
      throw new Error(`領収書番号の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 領収書番号の形式を検証する
   * @param receiptNumber 検証対象の領収書番号
   * @returns 有効な形式の場合true
   */
  static validateReceiptNumberFormat(receiptNumber: string): boolean {
    // YYMMDD0XXXX形式の正規表現 (11桁: 6桁日付 + 1桁の0 + 4桁連番)
    const pattern = /^\d{6}0\d{4}$/
    return pattern.test(receiptNumber)
  }

  /**
   * 領収書番号から日付キーを抽出する
   * @param receiptNumber 領収書番号
   * @returns 日付キー (YYMMDD)
   */
  static extractDateKey(receiptNumber: string): string {
    if (!this.validateReceiptNumberFormat(receiptNumber)) {
      throw new Error('無効な領収書番号形式です')
    }
    return receiptNumber.substring(0, 6)
  }

  /**
   * 領収書番号から連番を抽出する
   * @param receiptNumber 領収書番号
   * @returns 連番
   */
  static extractSequenceNumber(receiptNumber: string): number {
    if (!this.validateReceiptNumberFormat(receiptNumber)) {
      throw new Error('無効な領収書番号形式です')
    }
    return parseInt(receiptNumber.substring(7), 10)
  }
}

// デフォルトエクスポート
export const receiptNumberService = new ReceiptNumberServiceImpl()