'use client'

import { ReactNode } from 'react'

export interface CardColumn {
  key: string
  label: string // カード表示時のラベル
  header: string | ReactNode // テーブル表示時のヘッダー
  className?: string
  headerClassName?: string
  mobileClassName?: string // モバイルカード表示用のクラス
  hideOnMobile?: boolean // モバイルで非表示にする
  isPrimary?: boolean // プライマリフィールド（カードタイトルとして使用）
  isSecondary?: boolean // セカンダリフィールド（サブタイトルとして使用）
  width?: string
}

export interface CardAction {
  label: string
  onClick: (row: any) => void
  className?: string
  disabled?: (row: any) => boolean
  icon?: ReactNode
  // 任意のdata-test等を許容
  [key: string]: any
}

interface ResponsiveCardTableProps {
  columns: CardColumn[]
  data: any[]
  keyField?: string
  actions?: CardAction[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  className?: string
  cardClassName?: string
  renderCell?: (column: CardColumn, row: any, value: any) => ReactNode
  renderCard?: (row: any, columns: CardColumn[], actions: CardAction[]) => ReactNode
}

export default function ResponsiveCardTable({
  columns,
  data,
  keyField = 'id',
  actions = [],
  loading = false,
  emptyMessage = 'データがありません',
  onRowClick,
  className = '',
  cardClassName = '',
  renderCell,
  renderCard
}: ResponsiveCardTableProps) {
  // ローディング表示
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // 空データ表示
  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">データなし</h3>
          <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  // プライマリ・セカンダリフィールドを特定
  const primaryField = columns.find(col => col.isPrimary)
  const secondaryField = columns.find(col => col.isSecondary)
  const displayColumns = columns.filter(col => !col.hideOnMobile)

  // モバイル用カードレンダー
  const renderMobileCard = (row: any, index: number) => {
    if (renderCard) {
      return renderCard(row, columns, actions)
    }

    return (
      <div
        key={row[keyField] || index}
        className={`
          bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm
          ${onRowClick ? 'cursor-pointer hover:shadow-md' : ''}
          ${cardClassName}
        `}
        onClick={() => onRowClick?.(row)}
      >
        {/* カードヘッダー（プライマリ・セカンダリフィールド） */}
        <div className="mb-3 border-b border-gray-100 pb-3">
          {primaryField && (
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {renderCell ? renderCell(primaryField, row, row[primaryField.key]) : row[primaryField.key] || '-'}
            </h3>
          )}
          {secondaryField && (
            <p className="text-sm text-gray-600 mt-1">
              {renderCell ? renderCell(secondaryField, row, row[secondaryField.key]) : row[secondaryField.key] || '-'}
            </p>
          )}
        </div>

        {/* カードボディ（その他のフィールド） */}
        <div className="space-y-2">
          {displayColumns
            .filter(col => !col.isPrimary && !col.isSecondary)
            .map((column) => (
              <div key={column.key} className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 flex-shrink-0 mr-3">
                  {column.label}
                </span>
                <span className={`text-sm text-gray-900 text-right break-words ${column.mobileClassName || ''}`}>
                  {renderCell ? renderCell(column, row, row[column.key]) : row[column.key] || '-'}
                </span>
              </div>
            ))}
        </div>

        {/* カードアクション */}
        {actions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {actions.map((action, actionIndex) => (
                <button
                  key={actionIndex}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick(row)
                  }}
                  disabled={action.disabled?.(row)}
                  className={`
                    ${action.className || 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100'}
                    disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50
                    text-xs font-medium px-3 py-1.5 rounded-full transition-colors
                    flex items-center gap-1
                  `}
                  data-test={action['data-test']}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* デスクトップ用テーブル表示 */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* テーブルヘッダー */}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`
                      px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                      ${column.width || ''}
                      ${column.headerClassName || ''}
                    `}
                  >
                    {column.header}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                )}
              </tr>
            </thead>

            {/* テーブルボディ */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr
                  key={row[keyField] || index}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => {
                    const value = row[column.key]
                    return (
                      <td
                        key={column.key}
                        className={`
                          px-6 py-4 text-sm text-gray-900
                          ${column.className || ''}
                        `}
                      >
                        <div className="whitespace-nowrap">
                          {renderCell ? renderCell(column, row, value) : value || '-'}
                        </div>
                      </td>
                    )
                  })}

                  {/* アクション列 */}
                  {actions.length > 0 && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.onClick(row)
                            }}
                            disabled={action.disabled?.(row)}
                            className={`
                              ${action.className || 'text-blue-600 hover:text-blue-900'}
                              disabled:text-gray-400 disabled:cursor-not-allowed
                              transition-colors
                            `}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* デスクトップ用フッター */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            総件数: <span className="font-medium">{data.length}</span>件
          </p>
        </div>
      </div>

      {/* モバイル用カード表示 */}
      <div className="md:hidden">
        <div className="mb-4 bg-white rounded-lg shadow p-3">
          <p className="text-sm text-gray-700 text-center">
            総件数: <span className="font-medium">{data.length}</span>件
          </p>
        </div>
        <div className="space-y-3">
          {data.map((row, index) => renderMobileCard(row, index))}
        </div>
      </div>
    </div>
  )
} 