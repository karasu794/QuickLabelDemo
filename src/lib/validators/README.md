# 🛡️ APIバリデーション - Zodライブラリ

このディレクトリには、API エンドポイントの入力値を厳格にバリデーションするためのZodスキーマが含まれています。

## 📋 概要

- **ライブラリ**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **目的**: サーバーサイドでの堅牢な入力値検証
- **メリット**: 型安全性、詳細なエラーメッセージ、宣言的なルール定義

## 🎯 実装済みバリデーション

### `/api/quote` エンドポイント

見積もりリクエストの包括的なバリデーション：

- **国コード**: 正確に2文字（例: JP, US）
- **郵便番号**: 必須、最大20文字
- **都市名**: 必須、最大100文字
- **発送日**: 今日以降の日付
- **パッケージ**: 最低1個、最大10個
- **重量**: 正の数値（文字列形式）

## 📁 ファイル構成

```
src/lib/validators/
├── quote.ts              # Quote API のバリデーションスキーマ
├── __tests__/
│   └── quote.test.ts     # テストケース例
└── README.md             # このファイル
```

## 🚀 使用方法

### 1. バリデーションの実行

```typescript
import { validateQuoteRequest } from '@/lib/validators/quote'

const result = validateQuoteRequest(requestData)

if (!result.success) {
  // バリデーション失敗
  console.error(result.error.format())
  return errorResponse
}

// バリデーション成功 - 型安全なデータとして使用
const { quoteParams, packages } = result.data
```

### 2. エラーレスポンスの作成

```typescript
import { formatValidationErrors } from '@/lib/validators/quote'

if (!validationResult.success) {
  const formattedErrors = formatValidationErrors(validationResult.error.format())
  
  return NextResponse.json({
    error: '入力データが不正です',
    validationErrors: formattedErrors
  }, { status: 400 })
}
```

## ✅ バリデーションルール詳細

### QuoteParams

| フィールド | 型 | 必須 | ルール |
|-----------|---|-----|-------|
| `originCountry` | string | ✓ | 2文字の国コード |
| `originPostalCode` | string | ✓ | 1-20文字 |
| `originCityName` | string | ✓ | 1-100文字 |
| `destinationCountry` | string | ✓ | 2文字の国コード |
| `destinationPostalCode` | string | ✓ | 1-20文字 |
| `destinationCityName` | string | ✓ | 1-100文字 |
| `shipDate` | string | ✓ | 今日以降の日付 |
| `isResidential` | boolean | ✓ | true/false |
| `higherInsurance` | boolean | ✓ | true/false |
| `originStateCode` | string | ❌ | 最大10文字 |
| `destinationStateCode` | string | ❌ | 最大10文字 |

### Package

| フィールド | 型 | 必須 | ルール |
|-----------|---|-----|-------|
| `id` | number | ✓ | 正の整数 |
| `packagingType` | string | ✓ | 1文字以上 |
| `weight` | string | ✓ | 正の数値（文字列） |
| `length` | string | ❌ | 任意の文字列 |
| `width` | string | ❌ | 任意の文字列 |
| `height` | string | ❌ | 任意の文字列 |

## 🧪 テスト

テストケースの例は `__tests__/quote.test.ts` を参照してください。

```bash
# テストの実行例（Jestを使用する場合）
npm test src/lib/validators/__tests__/quote.test.ts
```

## 🔧 新しいバリデーションの追加

1. 新しいスキーマファイルを作成（例: `shipment.ts`）
2. Zodスキーマを定義
3. 型定義とヘルパー関数を追加
4. APIルートで使用
5. テストケースを作成

## 🚨 注意事項

- **サーバーサイド専用**: これらのバリデーションはサーバーサイドでのみ使用
- **型安全性**: バリデーション成功後のデータは完全に型安全
- **パフォーマンス**: Zodは高速ですが、複雑なスキーマは適切に設計
- **エラーメッセージ**: 日本語でユーザーフレンドリーなメッセージを提供

## 🔗 参考リンク

- [Zod公式ドキュメント](https://zod.dev/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)