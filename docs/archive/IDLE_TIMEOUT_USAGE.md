# 自動ログアウト機能（Idle Timeout）の使用方法

## 概要
このプロジェクトでは、セキュリティ向上のためユーザーの無操作状態を監視し、自動でログアウトさせる機能が実装されています。

## 機能の詳細

### デフォルト動作
- **タイムアウト時間**: 30分間無操作
- **警告表示**: 29分経過時点でモーダル表示
- **強制ログアウト**: 警告後1分間操作なしでログアウト
- **監視イベント**: `mousedown`, `mousemove`, `keypress`, `keydown`, `touchstart`, `scroll`, `wheel`

### アクティビティ検知
以下の操作でタイマーがリセットされます：
- マウスの移動・クリック
- キーボード入力
- タッチ操作
- スクロール

## 実装構成

### 1. カスタムフック: `useIdleTimer.ts`
```typescript
import { useIdleTimer } from '@/hooks/useIdleTimer'

const {
  isWarningVisible,  // 警告モーダルの表示状態
  remainingTime,     // 残り時間（秒）
  extendSession,     // セッション延長関数
  isIdle            // アイドル状態
} = useIdleTimer({
  idleTimeout: 30 * 60 * 1000,     // 30分
  warningTimeout: 29 * 60 * 1000,  // 29分
  enabled: true                    // 機能の有効化
})
```

### 2. 警告モーダル: `IdleTimeoutModal.tsx`
- カウントダウン表示
- セッション延長ボタン
- ログアウトボタン

### 3. プロバイダー: `IdleTimeoutProvider.tsx`
- フックとモーダルを統合
- 開発環境でのデバッグ情報表示

## 基本的な使用方法

### アプリケーション全体で有効化（推奨）
```tsx
// src/app/layout.tsx
import IdleTimeoutProvider from '@/components/IdleTimeoutProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <IdleTimeoutProvider>
          <Header />
          <main>{children}</main>
        </IdleTimeoutProvider>
      </body>
    </html>
  )
}
```

## カスタマイズ例

### 1. 管理者画面での短いタイムアウト
```tsx
// src/app/admin/layout.tsx
<IdleTimeoutProvider
  idleTimeout={15 * 60 * 1000}     // 15分でタイムアウト
  warningTimeout={14 * 60 * 1000}  // 14分で警告
  enabled={true}
>
  {children}
</IdleTimeoutProvider>
```

### 2. 特定ページでの機能無効化
```tsx
// 例: 公開ページやログインページ
<IdleTimeoutProvider enabled={false}>
  {children}
</IdleTimeoutProvider>
```

### 3. セキュリティが重要なページでの短いタイムアウト
```tsx
// 例: 決済ページ
<IdleTimeoutProvider
  idleTimeout={5 * 60 * 1000}      // 5分でタイムアウト
  warningTimeout={4 * 60 * 1000}   // 4分で警告
>
  {children}
</IdleTimeoutProvider>
```

## API リファレンス

### `useIdleTimer` オプション
```typescript
interface UseIdleTimerOptions {
  idleTimeout?: number     // アイドルタイムアウト時間（ミリ秒）
  warningTimeout?: number  // 警告表示タイムアウト時間（ミリ秒）
  events?: string[]        // 監視するイベント
  enabled?: boolean        // タイマーの有効/無効
}
```

### `IdleTimeoutProvider` プロパティ
```typescript
interface IdleTimeoutProviderProps {
  children: React.ReactNode
  idleTimeout?: number     // カスタムタイムアウト時間
  warningTimeout?: number  // カスタム警告時間
  enabled?: boolean        // 機能の有効/無効
}
```

## デバッグ情報

開発環境では、画面右下にデバッグ情報が表示されます：
- 自動ログアウト: 有効/無効
- 警告表示: あり/なし
- アイドル状態: はい/いいえ
- 残り時間: XX秒

## セキュリティ設定推奨値

### 一般ユーザー
- タイムアウト: 30分
- 警告: 29分

### 管理者
- タイムアウト: 15分
- 警告: 14分

### 決済・機密情報
- タイムアウト: 5分
- 警告: 4分

### パブリックページ
- 機能無効

## 注意事項

1. **認証済みユーザーのみ**で動作します
2. **ネストした `IdleTimeoutProvider`** では内側の設定が優先されます
3. **警告モーダル表示中**はアクティビティ検知が無効になります
4. **自動ログアウト後**は全てのタイマーが自動的にクリアされます

## トラブルシューティング

### タイマーが動作しない
- 認証状態を確認
- `enabled` プロパティを確認
- コンソールでデバッグログを確認

### モーダルが表示されない
- `IdleTimeoutModal` が正しくインポートされているか確認
- z-indexの競合がないか確認

### セッション延長が機能しない
- `extendSession` 関数が正しく呼ばれているか確認
- ネットワーク接続を確認
