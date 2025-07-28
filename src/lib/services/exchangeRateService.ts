import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface ExchangeRate {
  id: number
  currency_pair: string
  rate: number
  fetched_at: string
  created_at: string
  updated_at: string
}

export class ExchangeRateService {
  private static readonly CACHE_DURATION_HOURS = 24
  private static readonly DEFAULT_RATE = 150.0

  /**
   * ExchangeRate-APIから為替レートを取得
   */
  private static async fetchFromExchangeRateAPI(): Promise<number> {
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY
      if (!apiKey) {
        console.warn('⚠️ EXCHANGERATE_API_KEY環境変数が設定されていません。デフォルトレートを使用します。')
        return this.DEFAULT_RATE
      }

      console.log('🌐 ExchangeRate-APIを呼び出し中...')
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`)
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.result !== 'success') {
        throw new Error(`API error: ${data['error-type'] || 'Unknown error'}`)
      }

      const usdToJpyRate = data.conversion_rates?.JPY
      if (!usdToJpyRate || typeof usdToJpyRate !== 'number') {
        throw new Error('Invalid JPY rate in API response')
      }

      console.log(`✅ ExchangeRate-API レスポンス受信`)
      console.log(`💱 USD→JPYレート: ${usdToJpyRate}`)
      
      return usdToJpyRate

    } catch (error) {
      console.error('❌ ExchangeRate-API取得エラー:', error)
      console.log(`📊 デフォルトレート${this.DEFAULT_RATE}を使用します`)
      return this.DEFAULT_RATE
    }
  }

  /**
   * データベースから最新の為替レートを取得
   */
  private static async getFromDatabase(): Promise<ExchangeRate | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exchange_rates')
        .select('*')
        .eq('currency_pair', 'USD_JPY')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.log('📊 データベースに為替レート情報がありません')
          return null
        }
        throw error
      }

      return data as ExchangeRate

    } catch (error) {
      console.error('❌ データベースから為替レート取得エラー:', error)
      return null
    }
  }

  /**
   * データベースに為替レートを保存
   */
  private static async saveToDatabase(rate: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('exchange_rates')
        .insert({
          currency_pair: 'USD_JPY',
          rate: rate,
          fetched_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      console.log(`💾 データベースに為替レート保存完了: ${rate}`)

    } catch (error) {
      console.error('❌ データベースへの為替レート保存エラー:', error)
      throw error
    }
  }

  /**
   * 為替レートが24時間以内かチェック
   */
  private static isRateValid(fetchedAt: string): boolean {
    const fetchedTime = new Date(fetchedAt).getTime()
    const now = new Date().getTime()
    const diffHours = (now - fetchedTime) / (1000 * 60 * 60)
    
    const isValid = diffHours < this.CACHE_DURATION_HOURS
    
    console.log(`⏰ 為替レート有効性チェック:`)
    console.log(`  取得時刻: ${new Date(fetchedAt).toLocaleString('ja-JP')}`)
    console.log(`  経過時間: ${diffHours.toFixed(1)}時間`)
    console.log(`  有効: ${isValid ? 'はい' : 'いいえ'}`)
    
    return isValid
  }

  /**
   * 為替レートを取得（メイン関数）
   * データベースから取得し、24時間経過していればAPIから最新データを取得
   */
  public static async getExchangeRate(): Promise<number> {
    try {
      console.log('💱 為替レート取得開始')

      // 1. データベースから最新の為替レートを取得
      const dbRate = await this.getFromDatabase()

      // 2. データベースにデータがあり、24時間以内の場合はそれを使用
      if (dbRate && this.isRateValid(dbRate.fetched_at)) {
        console.log(`📦 データベースから為替レート返却: ${dbRate.rate}`)
        return dbRate.rate
      }

      // 3. データベースにない、または24時間経過している場合はAPIから取得
      console.log('🔄 為替レートを更新します')
      const newRate = await this.fetchFromExchangeRateAPI()

      // 4. 新しいレートをデータベースに保存
      try {
        await this.saveToDatabase(newRate)
      } catch (saveError) {
        // 保存エラーがあってもレートは返す
        console.warn('⚠️ データベース保存に失敗しましたが、レートは返却します', saveError)
      }

      return newRate

    } catch (error) {
      console.error('❌ 為替レート取得で予期しないエラー:', error)
      
      // エラーの場合、データベースから最後の有効なレートを試す
      const dbRate = await this.getFromDatabase()
      if (dbRate) {
        console.log(`📊 エラー時フォールバック: データベースから最後のレート ${dbRate.rate} を使用`)
        return dbRate.rate
      }

      // 最終的にデフォルトレートを返す
      console.log(`📊 最終フォールバック: デフォルトレート ${this.DEFAULT_RATE} を使用`)
      return this.DEFAULT_RATE
    }
  }

  /**
   * 為替レートを強制更新（管理者機能等で使用）
   */
  public static async forceUpdateExchangeRate(): Promise<number> {
    console.log('🔄 為替レート強制更新開始')
    
    const newRate = await this.fetchFromExchangeRateAPI()
    await this.saveToDatabase(newRate)
    
    console.log(`✅ 為替レート強制更新完了: ${newRate}`)
    return newRate
  }

  /**
   * データベースの為替レート履歴を取得（管理者機能等で使用）
   */
  public static async getExchangeRateHistory(limit: number = 10): Promise<ExchangeRate[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exchange_rates')
        .select('*')
        .eq('currency_pair', 'USD_JPY')
        .order('fetched_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data as ExchangeRate[]

    } catch (error) {
      console.error('❌ 為替レート履歴取得エラー:', error)
      return []
    }
  }
} 