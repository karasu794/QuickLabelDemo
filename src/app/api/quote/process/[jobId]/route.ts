import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 新しいリクエストボディの型定義
interface QuoteParams {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
  declaredValue: string
  originStateCode: string
  originCityName: string
  destinationStateCode: string
  destinationCityName: string
}

interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
}

// 日本語からローマ字への変換マップ
const japaneseToRomajiMap: { [key: string]: string } = {
  // 都道府県
  '北海道': 'Hokkaido',
  '青森県': 'Aomori',
  '岩手県': 'Iwate',
  '宮城県': 'Miyagi',
  '秋田県': 'Akita',
  '山形県': 'Yamagata',
  '福島県': 'Fukushima',
  '茨城県': 'Ibaraki',
  '栃木県': 'Tochigi',
  '群馬県': 'Gunma',
  '埼玉県': 'Saitama',
  '千葉県': 'Chiba',
  '東京都': 'Tokyo',
  '神奈川県': 'Kanagawa',
  '新潟県': 'Niigata',
  '富山県': 'Toyama',
  '石川県': 'Ishikawa',
  '福井県': 'Fukui',
  '山梨県': 'Yamanashi',
  '長野県': 'Nagano',
  '岐阜県': 'Gifu',
  '静岡県': 'Shizuoka',
  '愛知県': 'Aichi',
  '三重県': 'Mie',
  '滋賀県': 'Shiga',
  '京都府': 'Kyoto',
  '大阪府': 'Osaka',
  '兵庫県': 'Hyogo',
  '奈良県': 'Nara',
  '和歌山県': 'Wakayama',
  '鳥取県': 'Tottori',
  '島根県': 'Shimane',
  '岡山県': 'Okayama',
  '広島県': 'Hiroshima',
  '山口県': 'Yamaguchi',
  '徳島県': 'Tokushima',
  '香川県': 'Kagawa',
  '愛媛県': 'Ehime',
  '高知県': 'Kochi',
  '福岡県': 'Fukuoka',
  '佐賀県': 'Saga',
  '長崎県': 'Nagasaki',
  '熊本県': 'Kumamoto',
  '大分県': 'Oita',
  '宮崎県': 'Miyazaki',
  '鹿児島県': 'Kagoshima',
  '沖縄県': 'Okinawa',
  
  // 主要都市
  '札幌市': 'Sapporo',
  '仙台市': 'Sendai',
  '横浜市': 'Yokohama',
  '川崎市': 'Kawasaki',
  '名古屋市': 'Nagoya',
  '京都市': 'Kyoto',
  '大阪市': 'Osaka',
  '神戸市': 'Kobe',
  '広島市': 'Hiroshima',
  '福岡市': 'Fukuoka',
  
  // 東京23区
  '千代田区': 'Chiyoda-ku',
  '中央区': 'Chuo-ku',
  '港区': 'Minato-ku',
  '新宿区': 'Shinjuku-ku',
  '文京区': 'Bunkyo-ku',
  '台東区': 'Taito-ku',
  '墨田区': 'Sumida-ku',
  '江東区': 'Koto-ku',
  '品川区': 'Shinagawa-ku',
  '目黒区': 'Meguro-ku',
  '大田区': 'Ota-ku',
  '世田谷区': 'Setagaya-ku',
  '渋谷区': 'Shibuya-ku',
  '中野区': 'Nakano-ku',
  '杉並区': 'Suginami-ku',
  '豊島区': 'Toshima-ku',
  '北区': 'Kita-ku',
  '荒川区': 'Arakawa-ku',
  '板橋区': 'Itabashi-ku',
  '練馬区': 'Nerima-ku',
  '足立区': 'Adachi-ku',
  '葛飾区': 'Katsushika-ku',
  '江戸川区': 'Edogawa-ku'
};

// 日本語テキストをローマ字に変換する関数
function convertToRomaji(text: string): string {
  if (!text) return text;
  
  let result = text;
  for (const [japanese, romaji] of Object.entries(japaneseToRomajiMap)) {
    if (result.includes(japanese)) {
      result = result.replace(japanese, romaji);
    }
  }
  return result;
}

// FedEx APIアクセストークンを取得
async function getFedExAccessToken(): Promise<string> {
  const apiKey = process.env.FEDEX_API_KEY;
  const secretKey = process.env.FEDEX_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('FedEx API credentials are not configured');
  }

  const response = await fetch('https://apis-sandbox.fedex.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secretKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FedEx authentication failed: ${response.status} ${errorText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

// FedEx Rate APIリクエストを構築
function buildFedExRateRequest(quoteParams: QuoteParams, packages: Package[]) {
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG'];
  
  // 出荷地住所を構築
  const shipperAddress: any = {
    countryCode: quoteParams.originCountry
  };
  
  if (!postalCodeNotRequiredCountries.includes(quoteParams.originCountry) && quoteParams.originPostalCode) {
    shipperAddress.postalCode = quoteParams.originPostalCode;
  }
  
  // 州コードはUS、CA、PRの場合のみ設定
  if (quoteParams.originStateCode && ['US', 'CA', 'PR'].includes(quoteParams.originCountry)) {
    shipperAddress.stateOrProvinceCode = quoteParams.originStateCode;
  }
  
  if (quoteParams.originCityName) {
    // 日本の都市名をローマ字に変換
    shipperAddress.city = quoteParams.originCountry === 'JP' ? 
      convertToRomaji(quoteParams.originCityName) : 
      quoteParams.originCityName;
  }

  // 仕向地住所を構築
  const recipientAddress: any = {
    countryCode: quoteParams.destinationCountry
  };
  
  if (!postalCodeNotRequiredCountries.includes(quoteParams.destinationCountry)) {
    if (quoteParams.destinationPostalCode) {
      recipientAddress.postalCode = quoteParams.destinationPostalCode;
    }
  } else {
    // 郵便番号不要国にはダミー値を設定
    recipientAddress.postalCode = '00000';
  }
  
  // 州コードはUS、CA、PRの場合のみ設定
  if (quoteParams.destinationStateCode && ['US', 'CA', 'PR'].includes(quoteParams.destinationCountry)) {
    recipientAddress.stateOrProvinceCode = quoteParams.destinationStateCode;
  }
  
  if (quoteParams.destinationCityName) {
    // 日本の都市名をローマ字に変換
    recipientAddress.city = quoteParams.destinationCountry === 'JP' ? 
      convertToRomaji(quoteParams.destinationCityName) : 
      quoteParams.destinationCityName;
  }

  // パッケージ情報を構築
  const requestedPackageLineItems = packages.map(pkg => {
    const packageItem: any = {
      weight: {
        units: 'KG',
        value: parseFloat(pkg.weight)
      }
    };

    // カスタム梱包材の場合は寸法を追加
    if (pkg.packagingType === 'customer') {
      packageItem.dimensions = {
        length: parseInt(pkg.length),
        width: parseInt(pkg.width),
        height: parseInt(pkg.height),
        units: 'CM'
      };
    }

    return packageItem;
  });

  return {
    accountNumber: {
      value: process.env.FEDEX_ACCOUNT_NUMBER
    },
    requestedShipment: {
      shipper: {
        address: shipperAddress
      },
      recipient: {
        address: recipientAddress,
        residential: quoteParams.isResidential
      },
      shipDatestamp: quoteParams.shipDate,
      // serviceTypeを削除して、すべての利用可能なサービスを取得
      packagingType: 'YOUR_PACKAGING',
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      rateRequestType: ['ACCOUNT', 'LIST'], // LISTを追加してより多くのオプションを取得
      requestedPackageLineItems: requestedPackageLineItems
    }
  };
}

// 複数のサービスタイプをリクエストする関数（並列化版）
async function getAllServiceRates(accessToken: string, baseRequest: any, quoteParams: QuoteParams) {
  const allRates: any[] = [];
  
  // 国内配送か国際配送かを判定
  const isDomestic = quoteParams.originCountry === quoteParams.destinationCountry;
  
  let serviceTypes: string[] = [];
  
  if (isDomestic) {
    // 国内配送のサービスタイプ
    if (quoteParams.originCountry === 'US') {
      serviceTypes = [
        'FEDEX_GROUND',
        'FEDEX_EXPRESS_SAVER',
        'FEDEX_2_DAY',
        'STANDARD_OVERNIGHT',
        'PRIORITY_OVERNIGHT',
        'FIRST_OVERNIGHT'
      ];
    } else if (quoteParams.originCountry === 'JP') {
      // 日本国内の場合は国際サービスを使用
      serviceTypes = [
        'FEDEX_INTERNATIONAL_PRIORITY'
      ];
    } else {
      // その他の国の国内配送
      serviceTypes = [
        'FEDEX_GROUND',
        'FEDEX_EXPRESS_SAVER',
        'STANDARD_OVERNIGHT'
      ];
    }
  } else {
    // 国際配送のサービスタイプ（より確実なもののみ）
    serviceTypes = [
      'INTERNATIONAL_PRIORITY',
      'INTERNATIONAL_ECONOMY',
      'INTERNATIONAL_FIRST',
      'FEDEX_INTERNATIONAL_PRIORITY'
    ];
  }
  
  console.log(`${isDomestic ? '国内' : '国際'}配送で見積もりを取得中...`);
  console.log('使用するサービスタイプ:', serviceTypes);
  
  // 各サービスタイプのリクエストを並列実行
  const servicePromises = serviceTypes.map(async (serviceType) => {
    try {
      const requestWithService = {
        ...baseRequest,
        requestedShipment: {
          ...baseRequest.requestedShipment,
          serviceType: serviceType
        }
      };
      
      console.log(`${serviceType}の見積もりを取得中...`);
      const response = await getFedExRates(accessToken, requestWithService);
      
      if (response.output?.rateReplyDetails) {
        console.log(`${serviceType}: ${response.output.rateReplyDetails.length}件の料金を取得`);
        return {
          serviceType,
          rates: response.output.rateReplyDetails,
          success: true
        };
      }
      return { serviceType, rates: [], success: false };
    } catch (error) {
      console.log(`${serviceType}の取得でエラー（スキップして続行）:`, error instanceof Error ? error.message : error);
      return { serviceType, rates: [], success: false, error };
    }
  });

  // 汎用的な見積もりも並列で実行
  const genericPromise = (async () => {
    try {
      console.log('汎用的な見積もりを取得中...');
      const genericResponse = await getFedExRates(accessToken, baseRequest);
      if (genericResponse.output?.rateReplyDetails) {
        console.log(`汎用的な見積もり: ${genericResponse.output.rateReplyDetails.length}件の料金を取得`);
        return {
          serviceType: 'generic',
          rates: genericResponse.output.rateReplyDetails,
          success: true
        };
      }
      return { serviceType: 'generic', rates: [], success: false };
    } catch (error) {
      console.log('汎用的な見積もりでエラー（続行）:', error instanceof Error ? error.message : error);
      return { serviceType: 'generic', rates: [], success: false, error };
    }
  })();

  // 全ての並列リクエストを実行
  console.log('全サービスタイプの料金を並列取得中...');
  const startTime = Date.now();
  
  const results = await Promise.all([...servicePromises, genericPromise]);
  
  const endTime = Date.now();
  console.log(`並列処理完了: ${endTime - startTime}ms`);

  // 成功した結果のみを集約
  results.forEach(result => {
    if (result.success && result.rates.length > 0) {
      allRates.push(...result.rates);
    }
  });
  
  // 重複を除去（serviceNameで判定）
  const uniqueRates = allRates.filter((rate, index, self) => 
    index === self.findIndex(r => r.serviceName === rate.serviceName)
  );
  
  // 料金順でソート（安い順）
  uniqueRates.sort((a, b) => {
    const priceA = a.ratedShipmentDetails?.[0]?.totalNetCharge || 0;
    const priceB = b.ratedShipmentDetails?.[0]?.totalNetCharge || 0;
    return priceA - priceB;
  });
  
  // 輸入見積もりの場合、FEDEX_CONNECT_PLUSを除外
  const isExport = quoteParams.originCountry === 'JP';
  let filteredRates = uniqueRates;
  
  console.log(`発送判定: originCountry=${quoteParams.originCountry}, isExport=${isExport}`);
  
  if (!isExport) {
    // 輸入の場合、FEDEX_CONNECT_PLUSを除外
    const originalCount = filteredRates.length;
    
    // デバッグ用：すべてのサービス名をログ出力
    console.log('フィルタリング前のサービス名一覧:');
    filteredRates.forEach((rate, index) => {
      console.log(`  ${index + 1}. "${rate.serviceName}"`);
    });
    
    // Connect Plusを含むサービスを除外（部分一致で判定）
    filteredRates = filteredRates.filter(rate => {
      const serviceName = rate.serviceName || '';
      const isConnectPlus = serviceName.toLowerCase().includes('connect plus');
      if (isConnectPlus) {
        console.log(`除外対象: "${serviceName}"`);
      }
      return !isConnectPlus;
    });
    
    const filteredCount = filteredRates.length;
    
    if (originalCount > filteredCount) {
      console.log(`輸入見積もりのため、Connect Plusサービスを除外しました (${originalCount} → ${filteredCount}件)`);
    } else {
      console.log('Connect Plusサービスは見つかりませんでした');
    }
  }
  
  console.log(`合計 ${filteredRates.length} 件の一意な配送オプションを取得しました`);
  
  // 料金が取得できなかった場合のエラー
  if (filteredRates.length === 0) {
    // 詳細なエラー情報を提供
    const errorDetails = results
      .filter(r => !r.success && r.error)
      .map(r => `${r.serviceType}: ${r.error}`)
      .join(', ');
    
    throw new Error(`利用可能な配送オプションが見つかりませんでした。${errorDetails ? `エラー詳細: ${errorDetails}` : '入力内容を確認してください。'}`);
  }
  
  return {
    output: {
      rateReplyDetails: filteredRates
    }
  };
}

// FedEx Rate APIを呼び出し
async function getFedExRates(accessToken: string, requestData: any) {
  const response = await fetch('https://apis-sandbox.fedex.com/rate/v1/rates/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-locale': 'ja_JP'
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FedEx API Error Response:', errorText);
    throw new Error(`FedEx Rate API failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  const startTime = Date.now();
  const TIMEOUT_MS = 50000; // 50秒のタイムアウト（Vercelの制限を考慮）
  
  try {
    const { jobId } = params;
    console.log(`バックグラウンド処理開始 - ジョブID: ${jobId}`);

    // 環境変数の確認
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('必要な環境変数が設定されていません');
      return NextResponse.json(
        { error: 'データベース設定エラー' },
        { status: 500 }
      );
    }

    // Service Role Keyを使用したSupabaseクライアントを作成
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('Service Role Keyでのクライアント作成完了');

    // ジョブを取得
    const { data: job, error: fetchError } = await supabase
      .from('quote_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('ジョブ取得エラー:', fetchError);
      return NextResponse.json(
        { error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    // 既に処理済みかチェック
    if (job.status === 'completed') {
      console.log('ジョブは既に完了しています');
      return NextResponse.json({ success: true, message: 'ジョブは既に完了しています' });
    }

    // タイムアウト処理を設定
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('処理がタイムアウトしました')), TIMEOUT_MS);
    });

    // メイン処理をPromiseでラップ
    const mainProcessPromise = (async () => {
      // ステータスを認証処理中に更新
      console.log('FedEx認証処理を開始します...');
      await supabase
        .from('quote_jobs')
        .update({ status: 'processing_auth' })
        .eq('id', jobId);

      // リクエストペイロードを取得
      const { quoteParams, packages } = job.request_payload as any;

      console.log('FedEx API認証開始...');
      
      // FedXアクセストークンを取得
      const accessToken = await getFedExAccessToken();
      console.log('アクセストークン取得完了');

      // 実行時間チェック
      if (Date.now() - startTime > TIMEOUT_MS * 0.8) {
        throw new Error('処理時間が上限に近づいています');
      }

      // ステータスを料金リクエスト処理中に更新
      console.log('料金計算処理を開始します...');
      await supabase
        .from('quote_jobs')
        .update({ status: 'processing_rate_request' })
        .eq('id', jobId);

      // FedX APIリクエストを構築前にデバッグログを追加
      console.log('==== デバッグ: quoteParams検証 ====');
      console.log('originStateCode:', quoteParams.originStateCode);
      console.log('destinationStateCode:', quoteParams.destinationStateCode);
      console.log('destinationCountry:', quoteParams.destinationCountry);
      console.log('destinationCityName:', quoteParams.destinationCityName);
      
      const fedexRequest = buildFedExRateRequest(quoteParams, packages);
      console.log('FedX APIリクエスト:', JSON.stringify(fedexRequest, null, 2));

      // FedX Rate APIを呼び出し（タイムアウト付き）
      const fedexResponse = await getAllServiceRates(accessToken, fedexRequest, quoteParams);
      console.log('FedX APIレスポンス取得完了');

      // レスポンスを変換
      const rates = fedexResponse.output.rateReplyDetails.map((detail: any) => {
        const ratedShipment = detail.ratedShipmentDetails[0];
        return {
          serviceType: detail.serviceName,
          totalNetFedExCharge: Math.round(ratedShipment.totalNetCharge).toString(),
          estimatedDeliveryTimestamp: detail.commit?.dateDetail?.dayFormat,
          deliveryDate: detail.commit?.dateDetail?.dayFormat,
          deliveryDayOfWeek: detail.commit?.dateDetail?.dayOfWeek,
          packagingType: detail.packagingType || 'YOUR_PACKAGING',
          rateType: 'ACCOUNT'
        };
      });

      // 結果をデータベースに保存
      const responsePayload = {
        success: true,
        rates: rates,
        processedAt: new Date().toISOString()
      };

      console.log('処理完了 - 結果をデータベースに保存します...');
      await supabase
        .from('quote_jobs')
        .update({
          status: 'completed',
          response_payload: responsePayload,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return { success: true, rates: rates.length };
    })();

    // タイムアウト処理と実行を競合させる
    const result = await Promise.race([mainProcessPromise, timeoutPromise]);

    console.log(`処理完了: ${Date.now() - startTime}ms`);
    return NextResponse.json(result as any);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'バックグラウンド処理でエラーが発生しました';
    console.error('バックグラウンド処理エラー:', errorMessage);
    
    // エラーをデータベースに記録
    try {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const errorSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await errorSupabase
        .from('quote_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', params.jobId);
    } catch (dbError) {
      console.error('データベース更新エラー:', dbError);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'このエンドポイントはPOSTリクエストのみ対応しています' },
    { status: 405 }
  );
} 