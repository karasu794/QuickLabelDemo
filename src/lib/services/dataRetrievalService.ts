// 探索ログ: Wave1統合対応。料率取得は存続、計算は charges-core に委譲・非課税/課税範囲を整理。
import { createServiceRoleClient } from '@/lib/supabase/server'
import { 
  ReceiptData, 
  CustomerInfo, 
  ReceiptItem, 
  ReceiptTotals, 
  PaymentInfo, 
  FeeRates,
  FeeBreakdown,
  TransactionType 
} from '@/types/receipt'
import type { Database } from '@/types/supabase'
type Shipment = Database['public']['Tables']['shipments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type AppSetting = Database['public']['Tables']['app_settings']['Row']
import { RECEIPT_CONFIG } from '@/lib/config/receipt'
import { computeCharges, estimateFreightFromTotal } from '@/lib/charges/core'

/**
 * データ取得サービス
 * 既存のshipmentsテーブルとopen_shipmentsテーブルから取引データを取得し、
 * 領収書生成に必要な形式に変換する
 * 
 * 要件:
 * - 3.1: 取引時点の手数料率を参照して計算を行う
 * - 3.2: Phoenix取引の例外処理ルールを適用
 * - 3.3: 指定された計算式を正確に実装
 * - 3.4: 日本の税制に準拠した計算を行う
 */
export class DataRetrievalService {
  private supabase = createServiceRoleClient()

  /**
   * 取引データを取得して領収書データに変換する
   * @param transactionId 取引ID
   * @param userId ユーザーID（認証・認可チェック用）
   * @returns 領収書データ
   */
  async getReceiptData(transactionId: string, userId: string): Promise<ReceiptData> {
    try {
      // 現在はshipmentタイプのみサポート
      const transactionType: TransactionType = 'shipment'
      
      // 取引データを取得
      const transactionData = await this.getTransactionData(transactionId, transactionType, userId)
      
      // ユーザープロフィール情報を取得
      const userProfile = await this.getUserProfile(userId)
      
      // 手数料率設定を取得
      const feeRates = await this.getFeeRates()
      
      // 料金計算を実行
      const totals = await this.calculateTotals(transactionData, feeRates, transactionType)
      
      // 領収書データを構築
      const receiptData: ReceiptData = {
        receiptNumber: '', // 後で設定される
        issueDate: new Date().toISOString(),
        transactionId,
        customerInfo: this.buildCustomerInfo(userProfile),
        companyInfo: RECEIPT_CONFIG.COMPANY_INFO,
        items: this.buildReceiptItems(transactionData, transactionType),
        totals,
        paymentInfo: this.buildPaymentInfo(transactionData),
        feeRates
      }
      
      return receiptData
    } catch (error) {
      console.error('Error retrieving receipt data:', error)
      throw new Error(`領収書データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 取引タイプを判定する（現在はshipmentのみサポート）
   * @param transactionId 取引ID
   * @returns 取引タイプ
   */
  async getTransactionType(transactionId: string): Promise<TransactionType> {
    return this.determineTransactionType(transactionId)
  }

  /**
   * 取引タイプを判定する（現在はshipmentのみサポート）
   * @param transactionId 取引ID
   * @returns 取引タイプ
   */
  private async determineTransactionType(transactionId: string): Promise<TransactionType> {
    try {
      // shipmentsテーブルを確認
      const { data: shipment, error: shipmentError } = await this.supabase
        .from('shipments')
        .select('id')
        .eq('id', Number(transactionId))
        .single()

      if (!shipmentError && shipment) {
        return 'shipment'
      }

      throw new Error('取引が見つかりません')
    } catch (error) {
      console.error('Error determining transaction type:', error)
      throw new Error(`取引タイプの判定に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 取引データを取得し、所有者確認を行う
   * @param transactionId 取引ID
   * @param transactionType 取引タイプ
   * @param userId ユーザーID
   * @returns 取引データ
   */
  private async getTransactionData(
    transactionId: string, 
    transactionType: TransactionType, 
    userId: string
  ): Promise<Shipment> {
    try {
      // 現在はshipmentタイプのみサポート
      const { data, error } = await this.supabase
        .from('shipments')
        .select('*')
        .eq('id', Number(transactionId))
        .eq('user_id', userId) // 所有者確認
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('取引が見つからないか、アクセス権限がありません')
        }
        throw new Error(`取引データ取得エラー: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting transaction data:', error)
      throw error
    }
  }

  /**
   * ユーザープロフィール情報を取得する
   * @param userId ユーザーID
   * @returns プロフィール情報
   */
  private async getUserProfile(userId: string): Promise<Profile> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(`プロフィール取得エラー: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw new Error(`ユーザープロフィールの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 手数料率設定を取得する
   * @returns 手数料率設定
   */
  private async getFeeRates(): Promise<FeeRates> {
    try {
      const { data: settings, error } = await this.supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['service_fee_percentage', 'processing_fee_percentage', 'tax_rate', 'exchange_rate'])

      if (error) {
        console.warn('手数料率設定の取得に失敗しました。デフォルト値を使用します:', error.message)
      }

      // デフォルト値
      const defaultRates: FeeRates = {
        serviceRate: 0.025, // 2.5% (第三者請求)
        processingRate: 0.0325, // 3.25%（クレジットカード）
        taxRate: 0.1, // 10%
        exchangeRate: 150 // 1USD = 150JPY
      }

      if (!settings || settings.length === 0) {
        return defaultRates
      }

      // 設定値を適用
      const rates = { ...defaultRates }
      settings.forEach((setting: AppSetting) => {
        const value = typeof setting.value === 'number' ? setting.value : parseFloat(setting.value as string)
        
        switch (setting.key) {
          case 'service_fee_percentage':
            rates.serviceRate = value / 100 // パーセンテージを小数に変換
            break
          case 'processing_fee_percentage':
            rates.processingRate = value / 100
            break
          case 'tax_rate':
            rates.taxRate = value / 100
            break
          case 'exchange_rate':
            rates.exchangeRate = value
            break
        }
      })

      return rates
    } catch (error) {
      console.error('Error getting fee rates:', error)
      // エラーが発生した場合はデフォルト値を返す
      return {
        serviceRate: 0.025,
        processingRate: 0.0325,
        taxRate: 0.1,
        exchangeRate: 150
      }
    }
  }

  /**
   * 料金計算を実行する
   * @param transactionData 取引データ
   * @param feeRates 手数料率
   * @param transactionType 取引タイプ
   * @returns 計算結果
   */
  private async calculateTotals(
    transactionData: Shipment,
    feeRates: FeeRates,
    transactionType: TransactionType
  ): Promise<ReceiptTotals> {
    try {
      const totalAmount = transactionData.total_amount || 0
      const isPhoenixTransaction = await this.isPhoenixTransaction(transactionData, transactionType)

      // 既存データからは運賃（税抜）を直接取得できないため、charges-coreの近似逆算を用いる
      const estimatedFreight = estimateFreightFromTotal(totalAmount, {
        serviceFeeRate: feeRates.serviceRate,
        processingFeeRate: feeRates.processingRate,
        taxRate: feeRates.taxRate,
        isPhoenix: isPhoenixTransaction,
      })

      // サーチャージは取引データからは取得不能のため 0 を入力（将来連携時に拡張）
      const result = computeCharges({
        freightJPY: estimatedFreight,
        isPhoenix: isPhoenixTransaction,
        serviceFeeRate: feeRates.serviceRate,
        processingFeeRate: feeRates.processingRate,
        taxRate: feeRates.taxRate,
        residentialJPY: 0,
        insuredValueJPY: 0,
      })

      const feeBreakdown: FeeBreakdown = {
        serviceFee: result.fees.serviceFee,
        processingFee: result.fees.processingFee,
        exchangeRate: feeRates.exchangeRate,
        phoenixException: isPhoenixTransaction,
      }

      return {
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total,
        fees: feeBreakdown,
      }
    } catch (error) {
      console.error('Error calculating totals:', error)
      throw new Error(`料金計算に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Phoenix取引かどうかを判定する
   * @param transactionData 取引データ
   * @param transactionType 取引タイプ
   * @returns Phoenix取引の場合true
   */
  private async isPhoenixTransaction(
    transactionData: Shipment,
    transactionType: TransactionType
  ): Promise<boolean> {
    try {
      // Phoenix取引の判定ロジック
      // shipper_countryがJPの場合、またはshipperのJSONBデータを確認
      if (transactionData.shipper_country === 'JP') {
        return true
      }
      
      // shipperのJSONBデータからも確認（型外プロパティのため安全にキャスト）
      const shipperData = (transactionData as any)?.shipper
      if (shipperData) {
        if (shipperData.country === 'JP' || shipperData.countryCode === 'JP') {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error determining Phoenix transaction:', error)
      return false
    }
  }

  /**
   * サービス手数料を計算する
   * @param amount 基本料金
   * @param rate 手数料率
   * @param isPhoenix Phoenix取引かどうか
   * @returns サービス手数料
   */
  private calculateServiceFee(amount: number, rate: number, isPhoenix: boolean): number {
    let fee = amount * rate
    
    // Phoenix取引の場合は手数料を減額（例：20%割引）
    if (isPhoenix) {
      fee = fee * 0.8
    }
    
    return Math.floor(fee)
  }

  /**
   * 処理手数料を計算する
   * @param amount 基本料金
   * @param rate 手数料率
   * @param isPhoenix Phoenix取引かどうか
   * @returns 処理手数料
   */
  private calculateProcessingFee(amount: number, rate: number, isPhoenix: boolean): number {
    let fee = amount * rate
    
    // Phoenix取引の場合は手数料を減額（例：30%割引）
    if (isPhoenix) {
      fee = fee * 0.7
    }
    
    return Math.floor(fee)
  }

  /**
   * 顧客情報を構築する
   * @param profile ユーザープロフィール
   * @returns 顧客情報
   */
  private buildCustomerInfo(profile: Profile): CustomerInfo {
    const addressCombined = [
      profile.address_prefecture,
      profile.address_city,
      profile.address_line1,
      profile.address_line2,
    ]
      .filter((v): v is string => !!v && v.length > 0)
      .join(' ')

    return {
      name: profile.full_name || '名前未設定',
      companyName: profile.company_name || undefined,
      address: addressCombined || undefined,
      phone: profile.phone_number || undefined
    }
  }

  /**
   * 領収書項目を構築する
   * @param transactionData 取引データ
   * @param transactionType 取引タイプ
   * @returns 領収書項目リスト
   */
  private buildReceiptItems(
    transactionData: Shipment,
    transactionType: TransactionType
  ): ReceiptItem[] {
    const items: ReceiptItem[] = []
    
    // 現在はshipmentタイプのみサポート
    const shipment = transactionData
    
    // 基本的な配送サービス項目
    items.push({
      description: `国際配送サービス (追跡番号: ${shipment.tracking_number || 'N/A'})`,
      quantity: 1,
      unitPrice: shipment.total_amount || 0,
      amount: shipment.total_amount || 0
    })

    // 追加サービスがある場合（例：保険、特別取扱など） - 型外プロパティのため安全にキャスト
    const hasCustomsDetails = (shipment as any)?.customs_details
    if (hasCustomsDetails) {
      // カスタム詳細がある場合は追加項目として表示
      items.push({
        description: '通関手続きサービス',
        quantity: 1,
        unitPrice: 0, // 基本料金に含まれる
        amount: 0
      })
    }
    
    return items
  }

  /**
   * 支払い情報を構築する
   * @param transactionData 取引データ
   * @param transactionType 取引タイプ
   * @returns 支払い情報
   */
  private buildPaymentInfo(transactionData: Shipment): PaymentInfo {
    // 型外フィールドのため安全にアクセス
    const paymentStatus = (transactionData as any)?.payment_status as string | undefined
    let status = '完了'
    if (paymentStatus) {
      switch (paymentStatus) {
        case 'completed':
          status = '完了'
          break
        case 'pending':
          status = '保留'
          break
        case 'failed':
          status = '失敗'
          break
      }
    }

    return {
      method: 'クレジットカード',
      transactionId: transactionData.payment_id || transactionData.square_payment_id || 'N/A',
      paymentDate: transactionData.created_at || new Date().toISOString(),
      status,
    }
  }



  /**
   * 取引データの存在確認（キャッシュ無効化用）
   * @param transactionId 取引ID
   * @returns 存在する場合true
   */
  async transactionExists(transactionId: string): Promise<boolean> {
    try {
      await this.determineTransactionType(transactionId)
      return true
    } catch {
      return false
    }
  }

  /**
   * 取引データが変更されたかどうかを確認
   * @param transactionId 取引ID
   * @param lastUpdated 最後の更新日時
   * @returns 変更されている場合true
   */
  async isTransactionModified(transactionId: string, lastUpdated: string): Promise<boolean> {
    try {
      const transactionType = await this.determineTransactionType(transactionId)
      
      if (transactionType === 'shipment') {
        const { data, error } = await this.supabase
          .from('shipments')
          .select('updated_at')
          .eq('id', Number(transactionId))
          .single()
          
        if (error || !data) return true
        
        return new Date(data.updated_at || '').getTime() > new Date(lastUpdated).getTime()
      } else {
        const { data, error } = await this.supabase
          .from('open_shipments')
          .select('updated_at')
          .eq('id', transactionId)
          .single()
          
        if (error || !data) return true
        
        return new Date(data.updated_at || '').getTime() > new Date(lastUpdated).getTime()
      }
    } catch {
      return true // エラーの場合は変更されたものとして扱う
    }
  }
}

// デフォルトエクスポート
export const dataRetrievalService = new DataRetrievalService()