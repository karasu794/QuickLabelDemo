import { NextRequest, NextResponse } from 'next/server'

// 新しいリクエストボディの型定義
interface QuoteParams {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
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

interface QuoteRequest {
  quoteParams: QuoteParams
  packages: Package[]
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
  
  if (quoteParams.originStateCode) {
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
  
  if (quoteParams.destinationStateCode) {
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

// 複数のサービスタイプをリクエストする関数
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
      serviceTypes = [
        'FEDEX_INTERNATIONAL_PRIORITY', // 日本国内でも利用可能
        'FEDEX_INTERNATIONAL_ECONOMY'
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
    // 国際配送のサービスタイプ
    serviceTypes = [
      'INTERNATIONAL_PRIORITY',
      'INTERNATIONAL_ECONOMY',
      'INTERNATIONAL_FIRST',
      'INTERNATIONAL_PRIORITY_EXPRESS',
      'FEDEX_INTERNATIONAL_PRIORITY',
      'FEDEX_INTERNATIONAL_ECONOMY',
      'INTERNATIONAL_GROUND'
    ];
  }
  
  console.log(`${isDomestic ? '国内' : '国際'}配送で見積もりを取得中...`);
  console.log('使用するサービスタイプ:', serviceTypes);
  
  // 各サービスタイプに対してリクエストを送信
  for (const serviceType of serviceTypes) {
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
        allRates.push(...response.output.rateReplyDetails);
        console.log(`${serviceType}: ${response.output.rateReplyDetails.length}件の料金を取得`);
      }
    } catch (error) {
      console.log(`${serviceType}の取得でエラー:`, error);
      // エラーが発生してもサービス毎に続行
      continue;
    }
    
    // APIレート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // サービスタイプを指定せずに汎用的な見積もりも取得
  try {
    console.log('汎用的な見積もりを取得中...');
    const genericResponse = await getFedExRates(accessToken, baseRequest);
    if (genericResponse.output?.rateReplyDetails) {
      allRates.push(...genericResponse.output.rateReplyDetails);
      console.log(`汎用的な見積もり: ${genericResponse.output.rateReplyDetails.length}件の料金を取得`);
    }
  } catch (error) {
    console.log('汎用的な見積もりでエラー:', error);
  }
  
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
  
  console.log(`合計 ${uniqueRates.length} 件の一意な配送オプションを取得しました`);
  
  return {
    output: {
      rateReplyDetails: uniqueRates
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

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    console.log('受信したリクエスト:', JSON.stringify(body, null, 2));

    const { quoteParams, packages } = body;

    // バリデーション
    if (!quoteParams.originCountry || !quoteParams.destinationCountry) {
      return NextResponse.json(
        { error: '出荷地と仕向地の国を選択してください' },
        { status: 400 }
      );
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json(
        { error: 'パッケージ情報が必要です' },
        { status: 400 }
      );
    }

    // パッケージの重量をチェック
    for (const pkg of packages) {
      if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
        return NextResponse.json(
          { error: 'すべてのパッケージの重量を入力してください' },
          { status: 400 }
        );
      }
    }

    console.log('FedEx API呼び出し開始...');
    
    // FedExアクセストークンを取得
    const accessToken = await getFedExAccessToken();
    console.log('アクセストークン取得完了');

    // FedEx APIリクエストを構築
    const fedexRequest = buildFedExRateRequest(quoteParams, packages);
    console.log('FedEx APIリクエスト:', JSON.stringify(fedexRequest, null, 2));

    // FedEx Rate APIを呼び出し
    const fedexResponse = await getAllServiceRates(accessToken, fedexRequest, quoteParams);
    console.log('FedEx APIレスポンス:', JSON.stringify(fedexResponse, null, 2));

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

    console.log('処理された料金データ:', rates);

    return NextResponse.json({
      success: true,
      rates: rates
    });

  } catch (error) {
    console.error('見積もり処理エラー:', error);
    
    let errorMessage = '見積もりの取得に失敗しました';
    if (error instanceof Error) {
      errorMessage = error.message;
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