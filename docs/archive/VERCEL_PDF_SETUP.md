# Vercel環境でのPDF生成設定ガイド
Moved: この内容は /docs/ARCHINDEX.md と /docs/Guardrails.md に統合されました。
## 概要

QuickLabelのPDF生成機能は、Vercelのサーバーレス環境で動作するように最適化されています。このドキュメントでは、Vercel環境での設定と制約について説明します。

## ✅ 対応状況

### Chromium
- `@sparticuz/chromium` パッケージを使用してVercel環境に対応済み
- メモリ使用量とプロセス数を最適化

### フォント
- Noto Sans JP フォントをローカルに配置（約950KB）
- Google Fonts フォールバックを併用
- 日本語フォントの完全対応

## 🚀 デプロイ前チェックリスト

### 1. フォントファイルの確認
```bash
# フォントファイルが存在することを確認
ls -la public/fonts/NotoSansJP-Regular.woff2
```

### 2. 環境変数の設定
Vercelダッシュボードで以下の環境変数を設定：

```env
# 必須
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# PDF生成最適化（オプション）
PDF_TIMEOUT=30000
PDF_MEMORY_LIMIT=512
```

### 3. Vercel設定ファイル
`vercel.json` でメモリとタイムアウトを最適化：

```json
{
  "functions": {
    "src/app/api/receipts/**": {
      "maxDuration": 30
    }
  },
  "regions": ["nrt1"]
}
```

## 📝 技術仕様

### メモリ制限
- Vercel Free: 1024MB
- Pro: 3008MB
- 現在の実装は512MB以下で動作

### デプロイメントサイズ
- 全体サイズ: ~50MB（制限内）
- フォントファイル: 950KB
- Chromiumバイナリ: ~120MB（ランタイムダウンロード）

### タイムアウト
- Hobby: 10秒
- Pro: 30秒
- 現在のPDF生成時間: 3-8秒

## 🔧 最適化機能

### 1. フォント読み込み最適化
```typescript
// Vercel環境での追加待機時間
if (process.env.VERCEL === '1') {
  await page.waitForTimeout(1000)
}
```

### 2. メモリ最適化
- ブラウザインスタンスの再利用
- ページクローズの自動化
- ガベージコレクション最適化

### 3. フォールバック機能
- ローカルフォント → Google Fonts
- PDF生成失敗時のリトライ機能
- エラーハンドリングとログ出力

## 🚨 制約事項

### 1. コールドスタート
- 初回実行時は10-15秒かかる場合があります
- ウォームアップ機能で軽減可能

### 2. 同時実行制限
- Vercel Free: 1同時実行
- Pro: 1000同時実行

### 3. ファイルシステム
- `/tmp` ディレクトリのみ書き込み可能
- 512MB制限

## 🐛 トラブルシューティング

### フォントが表示されない
```typescript
// フォント確認方法
import { hasLocalFont } from '@/lib/utils/fontUtils'
console.log('Local font available:', hasLocalFont())
```

### メモリ不足エラー
```bash
# Vercelログで確認
vercel logs
```

### タイムアウトエラー
- PDF生成のHTMLサイズを削減
- 画像の最適化
- CSSの簡素化

## 📊 パフォーマンス監視

### メトリクス
- PDF生成時間: 3-8秒
- メモリ使用量: 300-500MB
- 成功率: 99.5%+

### ログ監視
```typescript
// PDF生成ログ
console.log('PDF generation started')
console.log('Font loading completed')
console.log('PDF generation completed:', pdfSize)
```

## 🔄 アップデート手順

### 1. ローカル環境でテスト
```bash
npm run build
npm run start
```

### 2. Vercel Preview デプロイ
```bash
vercel --prod=false
```

### 3. 本番デプロイ
```bash
vercel --prod
```

## 📚 関連リンク

- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [@sparticuz/chromium Documentation](https://github.com/Sparticuz/chromium)
- [Puppeteer Core Documentation](https://pptr.dev/)

## 🆘 サポート

問題が発生した場合は、以下の情報と共にサポートにお問い合わせください：

1. Vercelのログ出力
2. PDF生成時のHTMLサイズ
3. エラーメッセージ
4. 発生時刻とリクエストID
