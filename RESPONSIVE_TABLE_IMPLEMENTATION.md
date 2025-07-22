# 管理者ページ レスポンシブテーブル実装ガイド

## 概要
管理者ページのデータテーブルを、スマートフォンでも最適に表示・操作できるよう、2つの異なるアプローチでレスポンシブ対応を実装しました。

## 実装アプローチ

### アプローチA：横スクロール対応（ResponsiveTable）
**最適な用途**: データの完全性が重要で、全ての列を確認する必要がある場合

#### 特徴
- **シンプルな実装**: 既存のテーブル構造をほぼそのまま活用
- **全データ表示**: モバイルでも全ての列が確認可能
- **一貫したUI**: デバイス間でのUIの差が最小限
- **スワイプ操作**: 直感的な横スクロールでナビゲーション

#### 適用場面
- 取引履歴、ログデータなど詳細確認が重要
- 列数が多く、すべての情報が必要
- 表計算ソフトのような使用感を求める場合

### アプローチB：カード化対応（ResponsiveCardTable）
**最適な用途**: モバイルでの読みやすさとUXを優先する場合

#### 特徴
- **モバイル最適化**: スマートフォンでの閲覧性を重視
- **情報の階層化**: 重要な情報を視覚的に強調
- **タッチフレンドリー**: 大きなタップターゲットで操作しやすい
- **カスタマイズ性**: フィールドの表示・非表示を柔軟に制御

#### 適用場面
- ユーザー管理、商品一覧など概要確認が中心
- モバイルユーザーの利用頻度が高い
- 視覚的なデザインを重視する場合

## コンポーネント仕様

### ResponsiveTable（横スクロール）

#### 基本的な使用方法
```tsx
import ResponsiveTable, { TableColumn, TableAction } from '@/components/ResponsiveTable'

const columns: TableColumn[] = [
  {
    key: 'name',
    header: '名前',
    width: 'min-w-[120px]', // 最小幅指定
    className: 'font-medium'
  },
  {
    key: 'email',
    header: 'メール',
    width: 'min-w-[200px]'
  }
]

const actions: TableAction[] = [
  {
    label: '編集',
    onClick: (row) => console.log('編集:', row),
    className: 'text-blue-600 hover:text-blue-900'
  }
]

<ResponsiveTable
  columns={columns}
  data={data}
  keyField="id"
  actions={actions}
  renderCell={customRenderCell}
/>
```

#### TableColumn インターフェース
```typescript
interface TableColumn {
  key: string                 // データのキー
  header: string | ReactNode  // ヘッダー表示内容
  className?: string          // セルのCSSクラス
  headerClassName?: string    // ヘッダーのCSSクラス
  width?: string             // 列幅（Tailwind CSS）
}
```

#### TableAction インターフェース
```typescript
interface TableAction {
  label: string                              // ボタンラベル
  onClick: (row: any) => void               // クリック時の処理
  className?: string                        // ボタンのCSSクラス
  disabled?: (row: any) => boolean          // 無効化条件
}
```

### ResponsiveCardTable（カード化）

#### 基本的な使用方法
```tsx
import ResponsiveCardTable, { CardColumn, CardAction } from '@/components/ResponsiveCardTable'

const columns: CardColumn[] = [
  {
    key: 'name',
    label: '名前',          // カード表示時のラベル
    header: '名前',         // テーブル表示時のヘッダー
    isPrimary: true,       // カードタイトルとして使用
    width: 'min-w-[120px]'
  },
  {
    key: 'email',
    label: 'メール',
    header: 'メールアドレス',
    isSecondary: true,     // カードサブタイトルとして使用
    mobileClassName: 'text-blue-600'
  },
  {
    key: 'details',
    label: '詳細',
    header: '詳細情報',
    hideOnMobile: true     // モバイルカードでは非表示
  }
]

<ResponsiveCardTable
  columns={columns}
  data={data}
  keyField="id"
  actions={actions}
  renderCell={customRenderCell}
/>
```

#### CardColumn インターフェース
```typescript
interface CardColumn {
  key: string                 // データのキー
  label: string              // カード表示時のラベル
  header: string | ReactNode // テーブル表示時のヘッダー
  className?: string         // デスクトップでのCSSクラス
  mobileClassName?: string   // モバイルカードでのCSSクラス
  hideOnMobile?: boolean     // モバイルで非表示にする
  isPrimary?: boolean        // プライマリフィールド（タイトル）
  isSecondary?: boolean      // セカンダリフィールド（サブタイトル）
  width?: string            // 列幅
}
```

## 実装例詳細

### 取引履歴テーブル

#### 横スクロール版の特徴
```tsx
// 幅を固定してスクロール時の見栄えを制御
const columns = [
  {
    key: 'created_at',
    header: '作成日時',
    width: 'min-w-[140px]',  // 日時に十分な幅
    className: 'whitespace-nowrap'
  },
  {
    key: 'user_info',
    header: 'ユーザー',
    width: 'min-w-[160px]'   // 名前+メールに対応
  }
]

// 複雑なデータの表示
const renderCell = (column, row, value) => {
  switch (column.key) {
    case 'user_info':
      return (
        <div className="max-w-[160px]">
          <div className="font-medium text-gray-900 truncate">
            {row.user_name || 'ゲストユーザー'}
          </div>
          <div className="text-gray-500 text-xs truncate">
            {row.user_email || '未登録'}
          </div>
        </div>
      )
  }
}
```

#### カード版の特徴
```tsx
// 情報の階層化
const columns = [
  {
    key: 'user_name',
    label: 'ユーザー',
    header: 'ユーザー',
    isPrimary: true        // カードタイトル
  },
  {
    key: 'total_amount',
    label: '請求額',
    header: '請求額',
    isSecondary: true,     // カードサブタイトル
    mobileClassName: 'font-semibold text-green-600'
  }
]

// カード固有のアクション
const actions = [
  {
    label: '追跡',
    onClick: (row) => window.open(`https://fedex.com/track/${row.tracking_number}`),
    icon: <TrackingIcon />,
    className: 'text-blue-600 bg-blue-50'
  }
]
```

## パフォーマンス最適化

### 仮想化の実装
大量データ（1000件以上）の場合は、仮想化を検討：

```tsx
// react-window を使用した例
import { FixedSizeList as List } from 'react-window'

const VirtualizedTable = ({ data }) => (
  <List
    height={600}
    itemCount={data.length}
    itemSize={60}
  >
    {({ index, style }) => (
      <div style={style}>
        <ResponsiveTable data={[data[index]]} />
      </div>
    )}
  </List>
)
```

### メモ化の活用
```tsx
import { useMemo } from 'react'

const MemoizedTable = ({ data, filters }) => {
  const filteredData = useMemo(() => 
    data.filter(item => 
      Object.entries(filters).every(([key, value]) => 
        !value || item[key]?.includes(value)
      )
    ), [data, filters]
  )

  return <ResponsiveTable data={filteredData} />
}
```

## アクセシビリティ対応

### キーボードナビゲーション
```tsx
// フォーカス管理の実装例
const handleKeyDown = (e, rowIndex) => {
  switch (e.key) {
    case 'ArrowDown':
      focusRow(rowIndex + 1)
      break
    case 'ArrowUp':
      focusRow(rowIndex - 1)
      break
    case 'Enter':
      activateRow(rowIndex)
      break
  }
}
```

### スクリーンリーダー対応
```tsx
// ARIA属性の追加
<table role="table" aria-label="取引データテーブル">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">
        作成日時
      </th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-rowindex={index + 1}>
      <td role="cell">{data}</td>
    </tr>
  </tbody>
</table>
```

## カスタマイズ例

### テーマのカスタマイズ
```tsx
// カスタムテーマの適用
const customTheme = {
  primary: 'bg-indigo-600 text-white',
  secondary: 'bg-gray-100 text-gray-800',
  accent: 'bg-green-50 text-green-700'
}

<ResponsiveTable
  className="custom-table"
  // カスタムスタイル適用
/>
```

### 条件付きスタイリング
```tsx
const renderCell = (column, row, value) => {
  // 条件に応じたスタイリング
  if (column.key === 'status') {
    const isUrgent = row.priority === 'high'
    return (
      <span className={`
        px-2 py-1 rounded text-xs font-medium
        ${isUrgent ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-gray-100 text-gray-800'}
      `}>
        {value}
      </span>
    )
  }
}
```

## トラブルシューティング

### よくある問題と解決法

#### 1. 横スクロールが効かない
```tsx
// 解決: 親要素の overflow 設定を確認
<div className="overflow-x-auto">
  <ResponsiveTable />
</div>
```

#### 2. カードレイアウトが崩れる
```tsx
// 解決: flexbox の設定を調整
.card-container {
  @apply flex flex-col space-y-2;
}
```

#### 3. パフォーマンスが悪い
```tsx
// 解決: renderCell のメモ化
const memoizedRenderCell = useCallback((column, row, value) => {
  // レンダリング処理
}, [/* 依存配列 */])
```

## 今後の拡張計画

### 予定している機能
1. **ソート機能**: 列ヘッダークリックでのソート
2. **フィルタリング**: 各列での絞り込み機能
3. **エクスポート**: CSV/Excel形式でのデータ出力
4. **ページネーション**: 大量データの分割表示
5. **リアルタイム更新**: WebSocketでのデータ同期

### 拡張可能性
- **カスタムフィルター**: 複雑な検索条件に対応
- **一括操作**: 複数行の選択・一括処理
- **ドラッグ&ドロップ**: 行の並び替え機能
- **インライン編集**: セル内での直接編集

この実装により、管理者ページのテーブルは、デスクトップからモバイルまで、すべてのデバイスで最適なユーザー体験を提供できるようになりました。 