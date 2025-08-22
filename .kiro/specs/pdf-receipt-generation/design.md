# 設計文書 - PDF領収書生成機能

## 概要

本機能は、既存のQuickLabelシステムに統合されるPDF領収書生成機能です。Puppeteerを使用したHTML→PDF変換方式を採用し、Vercelサーバーレス環境での最適化、Vercel Blobを使用したキャッシュ機能、セキュリティ機能を統合した包括的なソリューションを提供します。

既存のSupabaseデータベース構造（`shipments`、`open_shipments`テーブル）と統合し、取引データに基づいて日本の商習慣に準拠したPDF領収書を生成します。

## アーキテクチャ

### システム構成図

```mermaid
graph TB
    A[ユーザー] --> B[領収書要求]
    B --> C[API Route: /api/receipts/[transactionId]]
    C --> D{キャッシュ確認}
    D -->|存在| E[Vercel Blob]
    D -->|不存在| F[PDF生成プロセス]
    F --> G[データ取得]
    F --> H[HTML生成]
    F --> I[Puppeteer PDF変換]
    F --> J[Vercel Blob保存]
    E --> K[署名付きURL生成]
    J --> K
    K --> L[PDFレスポンス]
    L --> A
    
    M[取引データ変更] --> N[キャッシュ無効化]
    N --> O[Vercel Blob削除]
```

### データフロー

1. **要求受信**: ユーザーが領収書生成を要求
2. **キャッシュ確認**: Vercel Blobでキャッシュ済みPDFを確認
3. **データ取得**: Supabaseから取引データと関連情報を取得
4. **HTML生成**: Reactコンポーネントを使用してHTML領収書を生成
5. **PDF変換**: Puppeteerを使用してHTMLをPDFに変換
6. **キャッシュ保存**: 生成したPDFをVercel Blobに保存
7. **レスポンス**: 署名付きURLまたはPDFデータを返却

## コンポーネントと インターフェース

### 1. APIルート

#### `/api/receipts/[transactionId]/route.ts`
- **目的**: PDF領収書の生成とダウンロード
- **メソッド**: GET
- **パラメータ**: 
  - `transactionId`: 取引ID（shipment.id または open_shipment.id）
  - クエリパラメータ: `format=url|pdf`（デフォルト: url）

#### `/api/receipts/[transactionId]/invalidate/route.ts`
- **目的**: キャッシュの無効化
- **メソッド**: POST
- **用途**: 取引データ変更時のキャッシュクリア

### 2. コアサービス

#### `ReceiptService`
```typescript
interface ReceiptService {
  generateReceipt(transactionId: string, userId: string): Promise<ReceiptResult>
  invalidateCache(transactionId: string): Promise<void>
  getReceiptData(transactionId: string, userId: string): Promise<ReceiptData>
}

interface ReceiptResult {
  success: boolean
  url?: string
  pdfBuffer?: Buffer
  error?: string
}
```

#### `ReceiptNumberService`
```typescript
interface ReceiptNumberService {
  generateReceiptNumber(date: Date): Promise<string>
  getNextSequence(dateKey: string): Promise<number>
}
```

#### `PDFGenerationService`
```typescript
interface PDFGenerationService {
  generatePDF(html: string): Promise<Buffer>
  optimizePuppeteer(): Promise<Browser>
}
```

#### `CacheService`
```typescript
interface CacheService {
  get(key: string): Promise<Buffer | null>
  set(key: string, data: Buffer): Promise<string>
  delete(key: string): Promise<void>
  generateSignedUrl(key: string): Promise<string>
}
```

### 3. Reactコンポーネント

#### `ReceiptTemplate`
- **目的**: HTML領収書テンプレートの生成
- **特徴**: 
  - インラインCSS
  - Noto Sans JP フォント使用
  - 日本の商習慣に準拠したレイアウト
  - 社印画像の埋め込み

#### `CustomerInfoForm`
- **目的**: 不足している宛名情報の入力
- **機能**: バリデーション、自動保存

### 4. データモデル

#### `ReceiptData`
```typescript
interface ReceiptData {
  receiptNumber: string
  issueDate: string
  transactionId: string
  customerInfo: CustomerInfo
  companyInfo: CompanyInfo
  items: ReceiptItem[]
  totals: ReceiptTotals
  paymentInfo: PaymentInfo
  feeRates: FeeRates
}

interface CustomerInfo {
  name: string
  companyName?: string
  address?: string
  phone?: string
}

interface ReceiptItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface ReceiptTotals {
  subtotal: number
  tax: number
  total: number
  fees: FeeBreakdown
}

interface FeeBreakdown {
  serviceFee: number
  processingFee: number
  exchangeRate?: number
  phoenixException?: boolean
}
```

## データモデル

### 既存テーブルとの統合

#### `shipments`テーブル
- 主要な取引データソース
- `payment_id`, `square_payment_id`, `total_amount`を使用
- `user_id`でユーザー認証

#### `open_shipments`テーブル
- 複数パッケージ取引のデータソース
- `payment_id`, `total_amount`を使用

#### 新規テーブル: `receipt_numbers`
```sql
CREATE TABLE receipt_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key VARCHAR(6) NOT NULL, -- YYMMDD
  sequence_number INTEGER NOT NULL,
  receipt_number VARCHAR(12) NOT NULL UNIQUE, -- YYMMDD0XXXX
  transaction_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'shipment' or 'open_shipment'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date_key, sequence_number)
);
```

#### 新規テーブル: `receipt_cache`
```sql
CREATE TABLE receipt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  blob_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(transaction_id, transaction_type)
);
```

## エラーハンドリング

### エラー分類と対応

#### 1. データ取得エラー
- **原因**: 存在しない取引ID、権限不足
- **対応**: 404エラー、適切なエラーメッセージ

#### 2. PDF生成エラー
- **原因**: Puppeteerの起動失敗、メモリ不足
- **対応**: リトライ機構、フォールバック処理

#### 3. キャッシュエラー
- **原因**: Vercel Blob接続エラー
- **対応**: 直接PDF生成、ログ記録

#### 4. 認証エラー
- **原因**: 無効なユーザー、セッション期限切れ
- **対応**: 401エラー、再認証要求

### エラーレスポンス形式
```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}
```

## テスト戦略

### 1. 単体テスト
- **対象**: 各サービスクラス、ユーティリティ関数
- **ツール**: Jest
- **カバレッジ**: 90%以上

### 2. 統合テスト
- **対象**: API エンドポイント、データベース連携
- **ツール**: Jest + Supertest
- **シナリオ**: 
  - 正常なPDF生成フロー
  - キャッシュヒット/ミス
  - エラーハンドリング

### 3. E2Eテスト
- **対象**: ユーザーフロー全体
- **ツール**: Playwright
- **シナリオ**:
  - 領収書生成から表示まで
  - 宛名情報入力フロー
  - キャッシュ無効化

### 4. パフォーマンステスト
- **対象**: PDF生成速度、メモリ使用量
- **指標**:
  - 初回生成: 5秒以内
  - キャッシュヒット: 1秒以内
  - メモリ使用量: 512MB以内

### 5. セキュリティテスト
- **対象**: 認証、認可、データアクセス
- **項目**:
  - 不正アクセス防止
  - 署名付きURL有効期限
  - データ漏洩防止

## パフォーマンス最適化

### 1. Puppeteer最適化
```typescript
// 軽量化設定
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process'
  ],
  headless: true
})
```

### 2. HTML最適化
- インラインCSS使用
- 外部リソース依存の最小化
- 画像の最適化とBase64埋め込み

### 3. キャッシュ戦略
- Vercel Blobでの永続化
- 適切な有効期限設定
- 変更検知による無効化

### 4. メモリ管理
- Puppeteerインスタンスの適切な終了
- 大きなオブジェクトの早期解放
- ストリーミング処理の活用

## セキュリティ考慮事項

### 1. アクセス制御
- ユーザー認証の必須化
- 取引データの所有者確認
- 管理者権限の分離

### 2. データ保護
- Vercel Blobのプライベート設定
- 署名付きURLの短期有効期限（1時間）
- 機密情報のログ出力防止

### 3. 入力検証
- 取引IDの形式検証
- SQLインジェクション対策
- XSS対策（HTMLエスケープ）

### 4. 監査ログ
- PDF生成履歴の記録
- アクセスログの保存
- 異常アクセスの検知

## 運用考慮事項

### 1. モニタリング
- PDF生成成功率の監視
- レスポンス時間の監視
- エラー率の監視

### 2. ログ管理
- 構造化ログの採用
- 適切なログレベル設定
- 機密情報の除外

### 3. バックアップ
- キャッシュデータの定期クリーンアップ
- 重要な設定データのバックアップ

### 4. スケーラビリティ
- Vercelの同時実行制限への対応
- 大量リクエスト時の負荷分散
- キャッシュヒット率の最適化