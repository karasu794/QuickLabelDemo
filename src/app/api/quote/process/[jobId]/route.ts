import { NextRequest, NextResponse } from 'next/server'
import { extractResidentialSurchargeFromRateDetail, extractInsuredValueFromRateDetail } from '@/lib/quote/breakdown'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import { computeCharges } from '@/lib/charges/core'
import { groupAndSumByLabel } from '@/lib/rates/surchargeLabels'
import { toArray, withDefaults, mapOrEmpty } from '@/lib/utils/safe'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// サービスロールキーを使用したSupabase client（管理者権限）
const supabaseAdmin = createServiceRoleClient()
// 探索ログ: charges プレビュー計算を追加（WAVE1統合）。app_settings からレートを取得できない場合は既定値にフォールバック。

async function getFeeRatesFromSettings(): Promise<{ serviceRate: number; processingRate: number; taxRate: number }> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('app_settings')
      .select('key, value')
      .in('key', ['service_fee_percentage', 'processing_fee_percentage', 'tax_rate'])
    if (error) throw error
    const rates = { serviceRate: 0.025, processingRate: 0.0325, taxRate: 0.1 }
    for (const row of (data || [])) {
      const v = typeof row.value === 'number' ? row.value : parseFloat(String(row.value))
      if (row.key === 'service_fee_percentage' && Number.isFinite(v)) rates.serviceRate = v / 100
      if (row.key === 'processing_fee_percentage' && Number.isFinite(v)) rates.processingRate = v / 100
      if (row.key === 'tax_rate' && Number.isFinite(v)) rates.taxRate = v / 100
    }
    return rates
  } catch {
    return { serviceRate: 0.025, processingRate: 0.0325, taxRate: 0.1 }
  }
}


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
  declaredValue: string
}

// 特別オファー検知とnotification作成の関数
async function detectAndNotifySpecialOffers(jobId: string, rateReplyDetails: any[], destinationCountry: string) {
  try {
    console.log('🔍 特別オファー検知開始...', { jobId, rateCount: rateReplyDetails.length, destinationCountry });
    
    // サービス名でグループ化
    const serviceGroups: { [serviceName: string]: any[] } = {};
    
    rateReplyDetails.forEach(detail => {
      const serviceName = detail.serviceName;
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = [];
      }
      serviceGroups[serviceName].push(detail);
    });
    
    console.log('📊 サービスグループ:', Object.keys(serviceGroups));
    
    // 各サービスで特別オファーをチェック
    for (const [serviceName, rates] of Object.entries(serviceGroups)) {
      let accountRate: number | null = null;
      let listRate: number | null = null;
      
      // 各レートタイプをチェック
      rates.forEach(rate => {
        const ratedShipment = rate.ratedShipmentDetails?.[0];
        if (!ratedShipment) return;
        
        const totalCharge = ratedShipment.totalNetCharge;
        const rateType = ratedShipment.rateType;
        
        console.log(`📋 ${serviceName} - Rate Type: ${rateType}, Amount: ${totalCharge}`);
        
        if (rateType === 'PAYOR_ACCOUNT_SHIPMENT') {
          accountRate = totalCharge;
        } else if (rateType === 'PAYOR_LIST_SHIPMENT') {
          listRate = totalCharge;
        }
      });
      
      // 特別オファーの条件チェック
      if (accountRate !== null && listRate !== null && accountRate < listRate) {
        const savings = listRate - accountRate;
        console.log(`💰 特別オファー検知! ${serviceName}: 通常¥${listRate} → アカウント¥${accountRate} (¥${savings}お得)`);
        
        // 24時間ルール: 重複チェック
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        console.log(`🔍 重複チェック開始: ${serviceName} × ${destinationCountry} (24時間以内)`);
        
        const { data: existingNotifications, error: selectError } = await (supabaseAdmin
          .from('notifications') as any)
          .select('id, created_at, metadata')
          .eq('type', 'special_offer')
          .gte('created_at', twentyFourHoursAgo)
          .contains('metadata', { serviceName, destinationCountry });
        
        if (selectError) {
          console.error('❌ 重複チェッククエリエラー:', selectError);
          continue;
        }
        
        if (existingNotifications && (existingNotifications as any[]).length > 0) {
          console.log(`⚠️ 24時間以内に同じ特別オファー通知が存在します (${existingNotifications.length}件)`, {
            serviceName,
            destinationCountry,
            lastNotification: (existingNotifications as any[])[0]?.created_at
          });
          continue; // 重複があるため、新しい通知は作成しない
        }
        
        console.log(`✅ 重複なし - 新しい特別オファー通知を作成します`);
        
        // 通知メッセージを作成
        const message = `「${serviceName}」で通常料金より¥${Math.round(savings)}安い、特別オファーが提示されました。`;
        
        // メタデータを作成（destinationCountryを追加）
        const metadata = {
          jobId,
          serviceName,
          destinationCountry,
          listRate,
          accountRate,
          savings: Math.round(savings)
        };
        
        // notificationsテーブルに保存
        const { error } = await supabaseAdmin
          .from('notifications')
          .insert({
            type: 'special_offer',
            message,
            metadata,
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('❌ 特別オファー通知の保存エラー:', error);
        } else {
          console.log('✅ 特別オファー通知を保存しました:', { serviceName, destinationCountry, savings: Math.round(savings) });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 特別オファー検知処理エラー:', error);
  }
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

// 🚨 基幹仕様: FedEx APIアクセストークンを取得（動的認証情報切り替え対応）
async function getFedExAccessToken(originCountry: string): Promise<string> {
  // 基幹仕様に従って認証情報を動的選択
  const isExport = originCountry === 'JP'
  
  let apiKey: string, secretKey: string
  if (isExport) {
    // 輸出の場合: 日本からの発送
    apiKey = process.env.FEDEX_EXPORT_API_KEY!
    secretKey = process.env.FEDEX_EXPORT_SECRET_KEY!
    console.log('🌏 輸出用認証情報を使用してトークン取得')
  } else {
    // 輸入の場合: 日本以外からの発送
    apiKey = process.env.FEDEX_IMPORT_API_KEY!
    secretKey = process.env.FEDEX_IMPORT_SECRET_KEY!
    console.log(`🏠 輸入用認証情報を使用してトークン取得 (originCountry: ${originCountry})`)
  }

  if (!apiKey || !secretKey) {
    throw new Error(`FedEx ${isExport ? '輸出' : '輸入'}用API認証情報が設定されていません`);
  }

  const response = await fetch('https://apis.fedex.com/oauth/token', {
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
function buildFedExRateRequest(quoteParams: QuoteParams, packages: Package[], jpyToUsd: number) {
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

  // お届け先（国／地域）住所を構築
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

  // パッケージ情報を構築（数値に正規化し必ず配列）
  const normalizedPkgs = (Array.isArray(packages) ? packages : []).map((pkg, i) => ({
    id: (pkg as any)?.id ?? i + 1,
    packagingType: (pkg as any)?.packagingType || 'YOUR_PACKAGING',
    weight: Number((pkg as any)?.weight ?? 0),
    length: Number((pkg as any)?.length ?? 0),
    width: Number((pkg as any)?.width ?? 0),
    height: Number((pkg as any)?.height ?? 0),
    declaredValue: Number((pkg as any)?.declaredValue ?? 0),
  }))
  if (normalizedPkgs.length === 0) {
    throw new Error('NO_PACKAGES_AFTER_NORMALIZE')
  }

  // 同寸法×Nの処理: samePackageCount > 1 かつ packages.length === 1 の場合
  const samePackageCount = quoteParams.samePackageCount ? Math.max(1, Math.min(99, Number(quoteParams.samePackageCount) || 1)) : 1
  const shouldUseGroupPackageCount = samePackageCount > 1 && normalizedPkgs.length === 1

  // 同寸法×Nの場合、同一パッケージをN回展開
  const requestedPackageLineItems = shouldUseGroupPackageCount 
    ? Array(samePackageCount).fill(normalizedPkgs[0]).map((pkg, index) => {
        const packageItem: any = {
          sequenceNumber: index + 1,
          weight: {
            units: 'KG',
            value: Number(pkg.weight) || 0
          }
        };
        // カスタム梱包材の場合は寸法を追加
        if (pkg.packagingType === 'customer' || pkg.packagingType === 'YOUR_PACKAGING') {
          if (pkg.length && pkg.width && pkg.height) {
            packageItem.dimensions = {
              length: Number(pkg.length) || 0,
              width: Number(pkg.width) || 0,
              height: Number(pkg.height) || 0,
              units: 'CM'
            };
          }
        }
        // 申告価額が設定されている場合のみ追加
        if (quoteParams.higherInsurance && pkg.declaredValue && Number(pkg.declaredValue) > 0) {
          const declaredValueJPY = Number(pkg.declaredValue)
          packageItem.declaredValue = { amount: declaredValueJPY, currency: 'JPY' }
          console.log(`📦 荷物${pkg.id}の申告価額: ¥${declaredValueJPY.toLocaleString()} (currency: JPY)`) 
        }
        return packageItem;
      })
    : normalizedPkgs.map((pkg, index) => {
        const packageItem: any = {
          sequenceNumber: index + 1,
          weight: {
            units: 'KG',
            value: Number(pkg.weight) || 0
          }
        };

        // カスタム梱包材の場合は寸法を追加
        if (pkg.packagingType === 'customer' || pkg.packagingType === 'YOUR_PACKAGING') {
          if (pkg.length && pkg.width && pkg.height) {
            packageItem.dimensions = {
              length: Number(pkg.length) || 0,
              width: Number(pkg.width) || 0,
              height: Number(pkg.height) || 0,
              units: 'CM'
            };
          }
        }

        // 申告価額が設定されている場合のみ追加（higherInsurance フラグ確認）
        if (quoteParams.higherInsurance && pkg.declaredValue && Number(pkg.declaredValue) > 0) {
          const declaredValueJPY = Number(pkg.declaredValue)
          packageItem.declaredValue = { amount: declaredValueJPY, currency: 'JPY' }
          console.log(`📦 荷物${pkg.id}の申告価額: ¥${declaredValueJPY.toLocaleString()} (currency: JPY)`) 
        }

        return packageItem;
      });

  // 複数個口の場合のログ出力
  if (normalizedPkgs.length > 1) {
    console.log(`📦 複数個口検出: ${normalizedPkgs.length}個 → groupPackageCount: ${normalizedPkgs.length}`)
    console.log('📦 各荷物のsequenceNumber:', requestedPackageLineItems.map(item => `${item.sequenceNumber}`).join(', '))
  } else {
    console.log('📦 単一荷物: groupPackageCountは追加しません')
  }

  // 高額保険が有効で申告価額が設定されている場合のtotalInsuredValue計算
  let totalInsuredValue = null;
  if (quoteParams.higherInsurance) {
    // 同寸法×Nの場合は単一パッケージの価額×N、別パッケージの場合は合算
    const totalDeclaredValueJPY = shouldUseGroupPackageCount
      ? (normalizedPkgs[0]?.declaredValue || 0) * samePackageCount
      : normalizedPkgs.reduce((sum, pkg) => sum + (pkg.declaredValue || 0), 0);
    
    if (totalDeclaredValueJPY > 0) {
      // JPYをそのまま使用（FedX APIはJPYもサポート）
      totalInsuredValue = {
        amount: totalDeclaredValueJPY,
        currency: 'JPY'
      };
      
      console.log(`💰 高額保険設定: 総申告価額 ¥${totalDeclaredValueJPY.toLocaleString()}${shouldUseGroupPackageCount ? ` (同寸法×${samePackageCount})` : ''}`);
    }
  }

  // 🚨 基幹仕様: アカウント番号を動的選択（ACCOUNT.NUMBER.MISMATCHエラー対策）
  const isExport = quoteParams.originCountry === 'JP'
  let shipperAccountNumber: string
  
  if (isExport) {
    // 輸出の場合: 日本からの発送
    shipperAccountNumber = process.env.FEDEX_EXPORT_ACCOUNT_NUMBER!
    console.log('🌏 輸出用アカウント番号を使用')
  } else {
    // 輸入の場合: 日本以外からの発送
    shipperAccountNumber = process.env.FEDEX_IMPORT_ACCOUNT_NUMBER!
    console.log(`🏠 輸入用アカウント番号を使用 (originCountry: ${quoteParams.originCountry})`)
  }

  return {
    accountNumber: {
      value: shipperAccountNumber
    },
    requestedShipment: {
      shipper: {
        address: shipperAddress
      },
      recipient: {
        address: { 
          ...recipientAddress, 
          residential: Boolean(quoteParams.isResidential) 
        }
      },
      shipDatestamp: quoteParams.shipDate,
      // serviceTypeを削除して、すべての利用可能なサービスを取得
      packagingType: normalizedPkgs[0]?.packagingType || 'YOUR_PACKAGING',
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      rateRequestType: ['ACCOUNT', 'LIST'], // LISTを追加してより多くのオプションを取得
      // ACCOUNT.NUMBER.MISMATCHエラー対策: 送料支払人情報を追加
      shippingChargesPayment: {
        paymentType: 'SENDER',
        payor: {
          responsibleParty: {
            accountNumber: {
              value: shipperAccountNumber
            }
          }
        }
      },
      // groupPackageCount: 同寸法×Nの場合のみ追加（別パッケージ追加の場合は従来どおり複数行）
      ...(shouldUseGroupPackageCount && { groupPackageCount: samePackageCount }),
      // 複数個口（別パッケージ）の場合も従来どおり groupPackageCount を追加
      ...(!shouldUseGroupPackageCount && normalizedPkgs.length > 1 && { groupPackageCount: normalizedPkgs.length }),
      // 高額保険が有効で申告価額が設定されている場合のtotalInsuredValue
      ...(totalInsuredValue && { totalInsuredValue }),
      requestedPackageLineItems: requestedPackageLineItems
    }
  };

  // 送信直前の監査ログ（1回のみ）
  try {
    const once = (buildRateRequest as any).__auditLogged === true
    if (!once) {
      console.debug('[rates][request]', {
        residential: Boolean((recipientAddress as any)?.residential || quoteParams.isResidential),
        declaredEnabled: Array.isArray(requestedPackageLineItems) && requestedPackageLineItems.some((p: any) => Number(p?.declaredValue?.amount) > 0),
        declaredSamples: requestedPackageLineItems.map((p: any) => p?.declaredValue).filter(Boolean),
        rateRequestType: ['ACCOUNT','LIST'],
      })
      ;(buildRateRequest as any).__auditLogged = true
    }
  } catch {}
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
      // 'INTERNATIONAL_FIRST', // FedEx International Firstを除外
      'FEDEX_INTERNATIONAL_PRIORITY'
    ];
  }
  
  console.log(`${isDomestic ? '国内' : '国際'}配送で見積もりを取得中...`);
  console.log('使用するサービスタイプ:', serviceTypes);
  
  // ===== 🚀 並列処理復活（セーフガード付き） =====
  console.log('全サービスタイプの料金を並列取得中（150msクールダウン付き）...');
  const startTime = Date.now();

  // 🛡️ セーフガード: 各サービスタイプのプロミス生成時に150ms遅延を追加
  const servicePromises: Promise<any>[] = [];
  
  for (let i = 0; i < serviceTypes.length; i++) {
    const serviceType = serviceTypes[i];
    
    // プロミス生成前に遅延を追加（最初のリクエストは即座に実行）
    if (i > 0) {
      console.log(`⏳ リクエスト間隔調整: 150ms待機中...`);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    const servicePromise = (async () => {
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
        return { serviceType, rates: [], success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })();
    
    servicePromises.push(servicePromise);
  }

  // 汎用的な見積もりも追加（最後に実行）
  if (serviceTypes.length > 0) {
    console.log(`⏳ 汎用リクエスト前の待機: 150ms...`);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
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
      return { serviceType: 'generic', rates: [], success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })();

  // 全ての並列リクエストを実行
  const results = await Promise.all([...servicePromises, genericPromise]);
  
  const endTime = Date.now();
  console.log(`🎯 セーフガード付き並列処理完了: ${endTime - startTime}ms`);

  // 成功した結果のみを集約
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach(result => {
    if (result.success && result.rates.length > 0) {
      allRates.push(...result.rates);
      successCount++;
    } else {
      errorCount++;
    }
  });
  
  console.log(`📊 並列処理結果: 成功 ${successCount}件, エラー ${errorCount}件, 総料金オプション ${allRates.length}件`);
  
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
  
  // 🚨 重要: INTERNATIONAL_FIRSTを完全除外（汎用見積もり対応）
  const isExport = quoteParams.originCountry === 'JP';
  let filteredRates = uniqueRates;
  
  console.log(`発送判定: originCountry=${quoteParams.originCountry}, isExport=${isExport}`);
  
  // 全ての見積もりからINTERNATIONAL_FIRSTを除外
  const preFilterCount = filteredRates.length;
  console.log('フィルタリング前のサービス名一覧:');
  filteredRates.forEach((rate, index) => {
    console.log(`  ${index + 1}. "${rate.serviceName}" (${rate.serviceType})`);
  });
  
  // ビジネス要件：INTERNATIONAL_FIRSTサービスを完全除外
  filteredRates = filteredRates.filter(rate => {
    const serviceType = rate.serviceType || '';
    const serviceName = rate.serviceName || '';
    
    // INTERNATIONAL_FIRSTの除外（serviceTypeとserviceNameの両方で判定）
    const isInternationalFirst = serviceType === 'INTERNATIONAL_FIRST' || 
                                serviceName.toLowerCase().includes('international first');
    
    if (isInternationalFirst) {
      console.log(`🚫 ビジネス要件により除外: "${serviceName}" (${serviceType})`);
      return false;
    }
    
    return true;
  });
  
  const afterFirstFilterCount = filteredRates.length;
  if (preFilterCount > afterFirstFilterCount) {
    console.log(`✅ INTERNATIONAL_FIRSTサービスを除外しました (${preFilterCount} → ${afterFirstFilterCount}件)`);
  }
  
  if (!isExport) {
    // 輸入の場合、追加でConnect Plusサービスを除外（契約なし）
    const beforeConnectPlusFilter = filteredRates.length;
    
    // Connect Plusサービスを複数パターンで確実に除外
    filteredRates = filteredRates.filter(rate => {
      const serviceType = rate.serviceType || '';
      const serviceName = rate.serviceName || '';
      
      // Connect Plusの除外（複数パターンで判定）
      const isConnectPlus = 
        // サービス名による判定（部分一致）
        serviceName.toLowerCase().includes('connect plus') ||
        serviceName.toLowerCase().includes('connectplus') ||
        // サービスタイプによる判定（完全一致）
        serviceType === 'FEDEX_INTERNATIONAL_CONNECT_PLUS' ||
        serviceType === 'INTERNATIONAL_CONNECT_PLUS' ||
        // その他のパターン
        serviceName.toLowerCase().includes('ficp') ||
        serviceName.toLowerCase().includes('international connect');
      
      if (isConnectPlus) {
        console.log(`🚫 輸入見積もり：Connect Plus契約なしのため除外 "${serviceName}" (${serviceType})`);
        return false;
      }
      
      return true;
    });
    
    const afterConnectPlusFilter = filteredRates.length;
    
    if (beforeConnectPlusFilter > afterConnectPlusFilter) {
      console.log(`✅ 輸入見積もり：Connect Plusサービスを除外しました (${beforeConnectPlusFilter} → ${afterConnectPlusFilter}件)`);
    } else {
      console.log('📋 Connect Plusサービスは見つかりませんでした（既に除外済みまたは該当なし）');
    }
  } else {
    // 輸出の場合はConnect Plus契約ありのため表示
    console.log('📋 輸出見積もり：Connect Plus契約ありのため全サービス表示');
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
  const response = await fetch('https://apis.fedex.com/rate/v1/rates/quotes', {
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

// Delivery Area Level（例: LEVEL A/B → 'A'/'B'）抽出
function extractDeliveryAreaLevelFromRateDetail(detail: any): string | undefined {
  try {
    const ratedShipmentDetails = Array.isArray(detail?.ratedShipmentDetails) ? detail.ratedShipmentDetails : []
    for (const rsd of ratedShipmentDetails) {
      const arrays: any[] = []
      const shipmentRateDetails = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
      for (const srd of shipmentRateDetails) {
        if (Array.isArray(srd?.surcharges)) arrays.push(...srd.surcharges)
      }
      if (Array.isArray(rsd?.surcharges)) arrays.push(...rsd.surcharges)
      for (const s of arrays) {
        const text = [s?.surchargeType, s?.type, s?.code, s?.name, s?.description].filter(Boolean).join(' ').toUpperCase()
        if (/(DELIVERY[_\s-]*AREA|REMOTE|ODA)/.test(text)) {
          // LEVEL A または LEVEL B を抽出（大文字/小文字対応）
          const m = text.match(/LEVEL\s*([AB])/i)
          if (m && m[1]) return m[1].toUpperCase()
        }
      }
    }
    return undefined
  } catch { return undefined }
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  const startTime = Date.now();
  const TIMEOUT_MS = 50000; // 50秒のタイムアウト（Vercelの制限を考慮）
  
  try {
    const { jobId } = params;
    console.log(`バックグラウンド処理開始 - ジョブID: ${jobId}`);

    // 1) ボディ優先で受け取る
    const body = await request.json().catch(() => ({} as any))
    let pkgs: any[] = Array.isArray((body as any).packages) ? (body as any).packages : []
    let qp: any = (body as any).quoteParams || null

    // 環境変数の確認
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('必要な環境変数が設定されていません');
      return NextResponse.json(
        { error: 'データベース設定エラー' },
        { status: 500 }
      );
    }

    // Service Role Keyを使用したSupabaseクライアントを作成
    const { createServiceRoleClient: getSrv } = await import('@/lib/supabase/server');
    const supabase = getSrv();
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

    // ジョブのステータスチェック
    if (job.status !== 'pending') {
      console.log(`ジョブ${jobId}は既に処理済みです (ステータス: ${job.status})`);
      return NextResponse.json(
        { error: 'このジョブは既に処理済みです' },
        { status: 400 }
      );
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

      // ボディ優先: 無ければDBの request_payload から
      const raw = job.request_payload as any
      if (!qp) qp = raw?.quoteParams
      if (!Array.isArray(pkgs) || pkgs.length === 0) pkgs = raw?.packages || []

      const quoteParams = withDefaults(qp as any, {
      originCountry: '',
      originPostalCode: '',
      originStateCode: '',
      originCityName: '',
      originStreet: '',
      destinationCountry: '',
      destinationPostalCode: '',
      destinationStateCode: '',
      destinationCityName: '',
      destinationStreet: '',
      shipDate: '',
      isResidential: false,
      higherInsurance: false,
      declaredValue: '',
    } as any)
      const packages = toArray<any>(pkgs)

      // packages が最終的に空なら 400
      if (packages.length === 0) {
        return NextResponse.json(
          { ok: false, code: 'PACKAGES_REQUIRED', message: 'バックグラウンド処理に packages が渡っていません。' },
          { status: 400 }
        )
      }
    // 数値変換・単位はビルド関数側で統一

      console.log('FedEx API認証開始...');
      
      // 🚨 基幹仕様: FedXアクセストークンを取得（動的認証）
      const accessToken = await getFedExAccessToken(quoteParams.originCountry);
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
      
      // 一度のみ為替取得
      let jpyToUsd = 1/150
      try {
        const { ExchangeRateService } = await import('@/lib/services/exchangeRateService')
        const usdToJpy = await ExchangeRateService.getExchangeRate()
        if (usdToJpy > 0) jpyToUsd = 1 / usdToJpy
      } catch {}
      const fedexRequest = buildFedExRateRequest(quoteParams, packages, jpyToUsd);
      console.log('FedX APIリクエスト:', JSON.stringify(fedexRequest, null, 2));

      // 🚨 基幹仕様: FedX Rate APIを呼び出し（タイムアウト付き）
      const fedexResponse = await getAllServiceRates(accessToken, fedexRequest, quoteParams);
      console.log('FedX APIレスポンス取得完了');

      // 特別オファー検知・通知処理（バックグラウンドで実行）
      if (fedexResponse.output?.rateReplyDetails) {
        detectAndNotifySpecialOffers(jobId, fedexResponse.output.rateReplyDetails, quoteParams.destinationCountry)
          .catch(error => console.error('特別オファー検知でエラー:', error));
      }

      // レスポンスを変換（Residentialサーチャージ抽出 + 診断ログを含む）
      const feeRates = await getFeeRatesFromSettings()
      const rates = mapOrEmpty<any, any>(fedexResponse.output?.rateReplyDetails, (detail) => {
        const ratedShipment = detail.ratedShipmentDetails?.[0] || { totalNetCharge: 0 }
        const residentialSurcharge = extractResidentialSurchargeFromRateDetail(detail)
        const insuredValue = extractInsuredValueFromRateDetail(detail)
        if (typeof quoteParams.isResidential === 'boolean') {
          console.debug('[quote][residential]', {
            isResidential: quoteParams.isResidential,
            residentialSurcharge
          })
        }

        // 診断ログ（フラグON時のみ）: サーチャージ生一覧 + Residential候補
        const DIAG = String(process.env.QUOTE_DIAG_RESIDENTIAL || '').trim() === '1'
        if (DIAG) {
          try {
            type SurchargeLike = { type?: string; code?: string; name?: string; description?: string; amount?: number }
            const collectAllSurcharges = (rateDetail: any): SurchargeLike[] => {
              const arrays: any[][] = []
              const rsdArr = Array.isArray(rateDetail?.ratedShipmentDetails) ? rateDetail.ratedShipmentDetails : []
              for (const rsd of rsdArr) {
                const srdArr = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
                for (const srd of srdArr) {
                  if (Array.isArray(srd?.surcharges)) arrays.push(srd.surcharges)
                  if (Array.isArray(srd?.surCharges)) arrays.push(srd.surCharges)
                }
                if (Array.isArray(rsd?.surcharges)) arrays.push(rsd.surcharges)
                if (Array.isArray(rsd?.surCharges)) arrays.push(rsd.surCharges)
              }
              if (Array.isArray(rateDetail?.surcharges)) arrays.push(rateDetail.surcharges)
              if (Array.isArray(rateDetail?.surCharges)) arrays.push(rateDetail.surCharges)

              return arrays
                .flat()
                .filter(Boolean)
                .map((s: any) => ({
                  type: s?.type ?? s?.surchargeType ?? s?.code,
                  code: s?.code ?? s?.surchargeType ?? s?.type,
                  name: s?.name,
                  description: s?.description,
                  amount: Number(s?.amount ?? s?.totalAmount ?? s?.price ?? 0) || 0,
                }))
            }
            const looksResidential = (s: SurchargeLike): boolean => {
              const t = `${s.type ?? ''} ${s.code ?? ''} ${s.name ?? ''} ${s.description ?? ''}`.toLowerCase()
              return /\bresidential\b/.test(t) || /\bresidential[_\s-]*delivery\b/.test(t)
            }
            const surs = collectAllSurcharges(detail)
            const resi = surs.filter(looksResidential)
            console.debug('[quote][diag][surcharges]', {
              jobId,
              serviceName: detail?.serviceName || detail?.serviceType,
              rateType: ratedShipment?.rateType,
              totalNetCharge: ratedShipment?.totalNetCharge,
              surcharges: surs,
              residentialCandidates: resi,
            })
          } catch (e) {
            console.debug('[quote][diag][surcharges][error]', String(e))
          }
        }
        // charges-core によるプレビュー（isPhoenix 判定は origin JP 簡易とする）
        const isPhoenix = (quoteParams?.originCountry || '').toUpperCase() === 'JP'
        const freightJPY = Math.round(Number(ratedShipment.totalNetCharge || 0))
        const preview = computeCharges({
          freightJPY,
          isPhoenix,
          serviceFeeRate: feeRates.serviceRate,
          processingFeeRate: feeRates.processingRate,
          taxRate: feeRates.taxRate,
          residentialJPY: residentialSurcharge || 0,
          insuredValueJPY: insuredValue || 0,
        })

        // FedEx応答→標準化（ベース/割引/主要サーチャージ）
        const normalized = normalizeFedExRate(detail, 'JPY')
        const baseRate = Math.max(0, normalized.baseCharge.amount)
        let accountDiscount = Math.max(0, normalized.discounts.amount)
        const fuel = Math.max(0, normalized.surcharges.fuel?.amount || 0)
        const peak = Math.max(0, normalized.surcharges.peak?.amount || 0)
        const resi = Math.max(0, normalized.surcharges.residential?.amount || residentialSurcharge || 0)
        const da = Math.max(0, normalized.surcharges.deliveryArea?.amount || 0)
        const daLevel = extractDeliveryAreaLevelFromRateDetail(detail)
        const ah = Math.max(0, normalized.surcharges.additionalHandling?.amount || 0)
        const importProc = Math.max(0, normalized.surcharges.importProcessing?.amount || 0)
        const saturdayDelivery = Math.max(0, normalized.surcharges.saturdayDelivery?.amount || 0)
        let other = Math.max(0, normalized.surcharges.other?.amount || 0)

        // 数量割引: FedEx APIが返す discount（フェニックス割引は feature flag で無効化）
        if (accountDiscount === 0) {
          const rsdArrAll = Array.isArray((detail as any)?.ratedShipmentDetails) ? (detail as any).ratedShipmentDetails : []
          const toNum = (v: any) => {
            const n = Number((v && typeof v === 'object' ? (v.amount ?? v.value) : v) || 0)
            return Number.isFinite(n) ? Math.round(n) : 0
          }
          const pickTotal = (type: string) => {
            let best = 0
            for (const r of rsdArrAll) {
              const t = String((r?.rateType || '')).toUpperCase()
              if (t.includes(type)) {
                const val = toNum(r?.totalNetCharge ?? r?.ratedShipmentDetail?.totalNetCharge)
                if (val > best) best = val
              }
            }
            return best
          }
          const listTotal = pickTotal('LIST')
          const accountTotal = pickTotal('ACCOUNT') || Math.round(Number(ratedShipment?.totalNetCharge || 0))
          if (listTotal > 0 && accountTotal > 0 && listTotal > accountTotal) {
            accountDiscount = Math.max(0, listTotal - accountTotal)
          }
        }

        // deliveryTimestamp を抽出（commit?.dateDetail または commit から）
        let deliveryTimestamp: string | undefined
        let deliveryDateStr: string | undefined
        let deliveryDayOfWeek: string | undefined
        if (detail?.commit?.dateDetail) {
          const dateDetail = detail.commit.dateDetail
          // dayFormat が YYYY-MM-DD 形式の場合、それをそのまま使用
          if (dateDetail.dayFormat) {
            deliveryDateStr = dateDetail.dayFormat
            deliveryTimestamp = dateDetail.dayFormat
          }
          // dayOfWeek を取得
          if (dateDetail.dayOfWeek) {
            deliveryDayOfWeek = dateDetail.dayOfWeek
          }
          // time があれば結合
          if (dateDetail.time) {
            deliveryTimestamp = `${deliveryDateStr} ${dateDetail.time}`
          }
        } else if (detail?.commit?.dayFormat) {
          deliveryDateStr = detail.commit.dayFormat
          deliveryTimestamp = detail.commit.dayFormat
        }

        // --- 追加サーチャージの詳細（既知カテゴリ以外を日本語ラベルで集約） ---

        const collectAllSurcharges = (rateDetail: any) => {
          const arrays: any[] = []
          const rsdArr = Array.isArray(rateDetail?.ratedShipmentDetails) ? rateDetail.ratedShipmentDetails : []
          for (const rsd of rsdArr) {
            const srdArr = Array.isArray(rsd?.shipmentRateDetails) ? rsd.shipmentRateDetails : []
            for (const srd of srdArr) {
              if (Array.isArray(srd?.surcharges)) arrays.push(srd.surcharges)
              if (Array.isArray(srd?.surCharges)) arrays.push(srd.surCharges)
            }
            if (Array.isArray(rsd?.surcharges)) arrays.push(rsd.surcharges)
            if (Array.isArray(rsd?.surCharges)) arrays.push(rsd.surCharges)
          }
          if (Array.isArray(rateDetail?.surcharges)) arrays.push(rateDetail.surcharges)
          if (Array.isArray(rateDetail?.surCharges)) arrays.push(rateDetail.surCharges)
          const flat = arrays.flat().filter(Boolean)
          return flat.map((s: any) => ({
            type: s?.type ?? s?.surchargeType ?? s?.code,
            code: s?.code ?? s?.surchargeType ?? s?.type,
            name: s?.name,
            description: s?.description,
            amount: Number(s?.amount ?? s?.totalAmount ?? s?.price ?? 0) || 0,
          }))
        }

        const U = (s: any) => String(s || '').toUpperCase()
        const toText = (x: any) => U([x?.type, x?.code, x?.name, x?.description].filter(Boolean).join(' '))
        const isFuel = (x: any) => /\bFUEL(\b|_)?\s*(SUR(CHG|CHARGE)?)?/.test(toText(x))
        const isPeak = (x: any) => /(PEAK|DEMAND|SURGE|CONGESTION|混雑)/.test(toText(x))
        const isResi = (x: any) => /(RESIDENTIAL[_\s-]*DELIVERY|RESIDENTIAL)/.test(toText(x))
        const isDA = (x: any) => /(DELIVERY[_\s-]*AREA|REMOTE|ODA)/.test(toText(x))
        const isAH = (x: any) => /(ADDITIONAL[_\s-]*HANDLING|OVERSIZE|DIMENSION|寸法)/.test(toText(x))
        const isImportProc = (x: any) => /(IMPORT[_\s-]*PROCESS(ING)?|CUSTOMS[_\s-]*ENTRY|CLEARANCE)/.test(toText(x))

        const allSurcharges = collectAllSurcharges(detail)
        const extrasRaw = allSurcharges.filter((s: any) => s && s.amount > 0 && !(
          isFuel(s) || isPeak(s) || isResi(s) || isDA(s) || isImportProc(s)
        ))
        const extraSurchargesJa = groupAndSumByLabel(extrasRaw)
        const extrasAdditionalSum = extraSurchargesJa.filter(x => x.group === 'additional').reduce((sum: number, x: any) => sum + (x?.amount || 0), 0)
        const extrasOtherSum = extraSurchargesJa.filter(x => x.group === 'other').reduce((sum: number, x: any) => sum + (x?.amount || 0), 0)
        // 既知の AdditionalHandling 推定額から重複控除
        // （normalizeで推定された分があれば可視化優先で詳細に振り分ける）
        // NOTE: ah は既に小計に含めず表示専用のため、控除は other 側のみでも表示は崩れない。
        other = Math.max(0, other - (extrasAdditionalSum + extrasOtherSum))

        const breakdown = {
          serviceType: detail.serviceName,
          totalNetFedExCharge: Math.round(ratedShipment.totalNetCharge || 0).toString(),
          estimatedDeliveryTimestamp: deliveryTimestamp || detail.commit?.dateDetail?.dayFormat,
          deliveryDate: deliveryDateStr || detail.commit?.dateDetail?.dayFormat,
          deliveryDayOfWeek: deliveryDayOfWeek || detail.commit?.dateDetail?.dayOfWeek,
          packagingType: detail.packagingType || 'YOUR_PACKAGING',
          rateType: 'ACCOUNT',
          breakdown: {
            // UIの行レンダリングで利用する主要項目
            baseRate,
            volumeDiscount: accountDiscount, // FedExの数量割引（フェニックス割引は無効化）
            quantityDiscount: accountDiscount, // 数量割引のエイリアス（ラベル用）
            importProcessingSurcharge: importProc,
            fuelSurcharge: fuel,
            peakSurcharge: peak,
            residentialSurcharge: resi,
            deliveryAreaSurcharge: da,
            deliveryAreaLevel: daLevel || undefined,
            additionalHandlingSurcharge: ah,
            saturdayDeliverySurcharge: saturdayDelivery,
            otherSurcharge: other,
            insuredValue,
            extraSurchargesJa,
            chargesPreview: {
              subtotal: preview.subtotal,
              tax: preview.tax,
              total: preview.total,
              fees: preview.fees,
            }
          }
        }

        try { console.debug('[breakdown]', (breakdown as any).breakdown) } catch {}

        return breakdown
      })

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
      const { createServiceRoleClient: getSrv2 } = await import('@/lib/supabase/server');
      const errorSupabase = getSrv2();
      
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