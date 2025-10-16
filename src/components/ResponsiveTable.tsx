'use client'

import { ReactNode } from 'react'

export interface TableColumn {
  key: string
  header: string | ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
  width?: string // 列幅指定（例: "w-32", "min-w-[200px]"）
}

export interface TableAction {
  label: string
  onClick: (row: any) => void
  className?: string
  disabled?: (row: any) => boolean
  // 任意のdata-test等を許容
  [key: string]: any
}

interface ResponsiveTableProps {
  columns: TableColumn[]
  data: any[]
  keyField?: string
  actions?: TableAction[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  className?: string
  showMobileHint?: boolean
  renderCell?: (column: TableColumn, row: any, value: any) => ReactNode
}

export default function ResponsiveTable({
  columns,
  data,
  keyField = 'id',
  actions = [],
  loading = false,
  emptyMessage = 'データがありません',
  onRowClick,
  className = '',
  showMobileHint = true,
  renderCell
}: ResponsiveTableProps) {
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

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {/* モバイル向けヒントメッセージ */}
      {showMobileHint && (
        <div className="md:hidden bg-blue-50 border-b border-blue-200 px-4 py-2">
          <p className="text-xs text-blue-700 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            左右にスワイプして全ての項目を確認できます
          </p>
        </div>
      )}

      {/* テーブル本体（横スクロール対応） */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* テーブルヘッダー */}
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.width || ''}
                    ${column.headerClassName || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                data-test="user-row"
              >
                {columns.map((column) => {
                  const value = row[column.key]
                  return (
                    <td
                      key={column.key}
                      className={`
                        px-4 md:px-6 py-4 text-sm text-gray-900
                        ${column.className || ''}
                      `}
                    >
                      {renderCell ? renderCell(column, row, value) : (
                        <div className="whitespace-nowrap">
                          {value || '-'}
                        </div>
                      )}
                    </td>
                  )
                })}

                {/* アクション列 */}
                {actions.length > 0 && (
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                          data-test={action['data-test']}
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

      {/* テーブルフッター（データ件数表示） */}
      <div className="bg-gray-50 px-4 md:px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-700">
            総件数: <span className="font-medium">{data.length}</span>件
          </p>
          <div className="md:hidden text-xs text-gray-500">
            横スクロールで全項目を確認
          </div>
        </div>
      </div>
    </div>
  )
} 