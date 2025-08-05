/**
 * 📋 Quote バリデーションのテストケース例
 * 
 * 実際のテストランナー（Jest等）を使用する場合に参考になる
 * バリデーションのテストケースです。
 */

import { validateQuoteRequest } from '../quote'

// ✅ 有効なリクエストデータの例
const validQuoteRequest = {
  quoteParams: {
    originCountry: "JP",
    originPostalCode: "100-0001",
    originStateCode: "",
    originCityName: "Tokyo",
    destinationCountry: "US",
    destinationPostalCode: "10001",
    destinationStateCode: "NY",
    destinationCityName: "New York",
    shipDate: "2024-12-31",
    isResidential: false,
    higherInsurance: false,
  },
  packages: [
    {
      id: 1,
      packagingType: "FEDEX_BOX",
      weight: "2.5",
      length: "20",
      width: "15",
      height: "10",
    }
  ]
}

// ❌ 無効なリクエストデータの例
const invalidQuoteRequests = {
  // 必須フィールド不足
  missingFields: {
    quoteParams: {
      originCountry: "JP",
      // originPostalCode が不足
      destinationCountry: "US",
      destinationPostalCode: "10001",
      shipDate: "2024-12-31",
      isResidential: false,
      higherInsurance: false,
    },
    packages: []  // パッケージが空
  },

  // 無効な国コード
  invalidCountryCode: {
    quoteParams: {
      ...validQuoteRequest.quoteParams,
      originCountry: "JAPAN", // 2文字でない
      destinationCountry: "USA" // 2文字でない
    },
    packages: validQuoteRequest.packages
  },

  // 無効な重量
  invalidWeight: {
    quoteParams: validQuoteRequest.quoteParams,
    packages: [
      {
        id: 1,
        packagingType: "FEDEX_BOX",
        weight: "0", // 0は無効
        length: "20",
        width: "15",
        height: "10",
      }
    ]
  },

  // 過去の発送日
  pastShipDate: {
    quoteParams: {
      ...validQuoteRequest.quoteParams,
      shipDate: "2020-01-01" // 過去の日付
    },
    packages: validQuoteRequest.packages
  }
}

/**
 * 🧪 バリデーションテストの実行例
 * 
 * 以下のコードを参考に、実際のテストを作成してください。
 */

// コンソールでのテスト実行例
console.log('=== Zodバリデーション テスト ===')

// 有効なデータのテスト
console.log('\n✅ 有効なデータのテスト:')
const validResult = validateQuoteRequest(validQuoteRequest)
console.log('結果:', validResult.success ? '成功' : '失敗')
if (!validResult.success) {
  console.log('エラー:', validResult.error.format())
}

// 無効なデータのテスト
console.log('\n❌ 無効なデータのテスト:')
Object.entries(invalidQuoteRequests).forEach(([testName, testData]) => {
  console.log(`\n--- ${testName} ---`)
  const result = validateQuoteRequest(testData)
  console.log('結果:', result.success ? '成功' : '失敗')
  if (!result.success) {
    console.log('エラー数:', Object.keys(result.error.format()).length)
    // 詳細なエラーを表示する場合
    // console.log('詳細:', result.error.format())
  }
})

export {
  validQuoteRequest,
  invalidQuoteRequests
}