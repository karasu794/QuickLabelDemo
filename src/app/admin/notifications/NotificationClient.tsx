'use client'

import { useState, useOptimistic, useMemo } from 'react'
import { markNotificationAsRead, markAllNotificationsAsRead } from './actions'
import toast from 'react-hot-toast'

// 通知データの型定義
export interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  metadata: any
  created_at: string
  updated_at: string
  read_at?: string
}

interface NotificationClientProps {
  initialNotifications: Notification[]
}

export default function NotificationClient({ initialNotifications }: NotificationClientProps) {
  // フィルタ & 検索
  const [level, setLevel] = useState<'all'|'info'|'warn'|'error'>('all')
  const [status, setStatus] = useState<'all'|'unread'|'read'>('all')
  const [query, setQuery] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // 楽観的更新のためのhook
  const [optimisticNotifications, updateOptimisticNotifications] = useOptimistic(
    initialNotifications,
    (state, { id, action }: { id: string; action: 'mark_read' | 'mark_unread' | 'delete' }) => {
      if (action === 'mark_read') {
        return state.map(notification =>
          notification.id === id
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      }
      if (action === 'mark_unread') {
        return state.map(notification =>
          notification.id === id
            ? { ...notification, is_read: false, read_at: undefined }
            : notification
        )
      }
      if (action === 'delete') {
        return state.filter(n => n.id !== id)
      }
      return state
    }
  )

  // 通知を既読にする関数
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(notificationId))
      
      // 楽観的更新
      updateOptimisticNotifications({ id: notificationId, action: 'mark_read' })
      
      // Server Actionを呼び出し
      const result = await markNotificationAsRead(notificationId)
      
      // statusプロパティをチェックして成功・失敗を判定
      if (result.status !== 'success') {
        throw new Error(result.error || '更新に失敗しました')
      }

      console.log('✅ 通知が正常に既読になりました')

    } catch (error) {
      console.error('通知更新エラー:', error)
      // エラー時はページをリロードして状態をリセット
      window.location.reload()
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  // 全ての未読通知を既読にする関数
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = optimisticNotifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) return

    try {
      setIsMarkingAllAsRead(true)
      
      // 楽観的更新（全ての未読通知を既読にする）
      unreadNotifications.forEach(notification => {
        updateOptimisticNotifications({ id: notification.id, action: 'mark_read' })
      })
      
      // Server Actionを呼び出し
      const result = await markAllNotificationsAsRead()
      
      // statusプロパティをチェックして成功・失敗を判定
      if (result.status !== 'success') {
        throw new Error(result.error || '一括更新に失敗しました')
      }

      toast.success('全ての未読を既読にしました')

    } catch (error) {
      console.error('一括既読処理エラー:', error)
      toast.error('一括既読に失敗しました')
      // エラー時はページをリロードして状態をリセット
      window.location.reload()
    } finally {
      setIsMarkingAllAsRead(false)
    }
  }

  // 一括操作: read/unread/delete
  const bulkAction = async (action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    // 楽観更新
    const snapshot = optimisticNotifications
    try {
      ids.forEach(id => {
        updateOptimisticNotifications({ id, action: action === 'read' ? 'mark_read' : action === 'unread' ? 'mark_unread' : 'delete' })
      })
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids })
      })
      if (!res.ok) throw new Error('bulk failed')
      const { updated } = await res.json()
      toast.success(`${updated}件を${action === 'delete' ? '削除' : action === 'read' ? '既読' : '未読'}にしました`)
      // 成功後に選択解除
      setSelected(new Set())
      setSelectAll(false)
    } catch (e) {
      toast.error('一括操作に失敗しました')
      // リバート
      window.location.reload()
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const filtered = useMemo(() => (
    optimisticNotifications.filter(notification => {
      if (filter === 'unread') return !notification.is_read
      if (filter === 'read') return notification.is_read
      return true
    })
  ), [optimisticNotifications, filter])

  const headerToggleAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(filtered.map(n => n.id)))
      setSelectAll(true)
    }
  }

  // 通知タイプのアイコンを取得する関数
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'special_offer':
        return '🎉'
      case 'system':
        return '⚙️'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return '📢'
    }
  }

  // 通知タイプの色を取得する関数
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'special_offer':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'system':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  // 日時フォーマット関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // フィルタリングされた通知（レベル/ステータス/検索）
  const filteredNotifications = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matchLevel = (n: Notification) => {
      if (level === 'all') return true
      // type を level にマッピング: error -> error, warning -> warn, その他 -> info
      const mapped: 'info'|'warn'|'error' = n.type === 'error' ? 'error' : n.type === 'warning' ? 'warn' : 'info'
      return mapped === level
    }
    const matchStatus = (n: Notification) => {
      if (status === 'all') return true
      if (status === 'unread') return !n.is_read && !n.read_at
      return !!n.read_at || n.is_read
    }
    const matchQuery = (n: Notification) => {
      if (!q) return true
      const hay = `${n.type} ${n.message ?? ''}`.toLowerCase()
      return hay.includes(q)
    }
    return optimisticNotifications.filter(n => matchLevel(n) && matchStatus(n) && matchQuery(n))
  }, [optimisticNotifications, level, status, query])

  // 統計情報
  const stats = {
    total: optimisticNotifications.length,
    unread: optimisticNotifications.filter(n => !n.is_read).length,
    read: optimisticNotifications.filter(n => n.is_read).length,
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通知一覧</h1>
          <p className="text-gray-600">システムからの通知を管理します</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            🔄 更新
          </button>
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
              className="px-4 py-2 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isMarkingAllAsRead ? '処理中...' : '全て既読にする'}
            </button>
          )}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">総通知数</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">未読</h3>
          <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">既読</h3>
          <p className="text-2xl font-bold text-green-600">{stats.read}</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <label className="text-sm text-gray-700 inline-flex items-center gap-2" aria-label="レベルフィルタ">
            <span>Level</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
          </label>
          <label className="text-sm text-gray-700 inline-flex items-center gap-2" aria-label="状態フィルタ">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="unread">unread</option>
              <option value="read">read</option>
            </select>
          </label>
          <label className="text-sm text-gray-700 inline-flex items-center gap-2 flex-1" aria-label="検索">
            <span className="hidden md:inline">Search</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="event / message を検索"
              className="border border-gray-300 rounded px-3 py-1 text-sm w-full"
            />
          </label>
        </div>
      </div>

      {/* アクションバー（選択時） */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 bg-white border border-gray-300 rounded-md p-3 flex items-center gap-3 shadow-sm">
          <span className="text-sm text-gray-700">{selected.size} 件選択中</span>
          <button onClick={() => bulkAction('read')} className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700">既読にする</button>
          <button onClick={() => bulkAction('unread')} className="px-3 py-1 text-sm rounded bg-yellow-600 text-white hover:bg-yellow-700">未読にする</button>
          <button onClick={() => bulkAction('delete')} className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700">削除する</button>
        </div>
      )}

      {/* 通知リスト */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            通知リスト
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredNotifications.length}件の通知
          </p>
          {/* 全選択 */}
          <label className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700">
            <input type="checkbox" checked={selectAll} onChange={headerToggleAll} /> 全選択（表示分）
          </label>
        </div>

        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors duration-200 ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 通知ヘッダー */}
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        aria-label={`select notification ${notification.id}`}
                        checked={selected.has(notification.id)}
                        onChange={() => toggleOne(notification.id)}
                      />
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNotificationColor(notification.type)}`}>
                        {notification.type}
                      </span>
                      {!notification.is_read && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          未読
                        </span>
                      )}
                    </div>

                    {/* 通知メッセージ */}
                    <p className="text-gray-900 mb-3">{notification.message}</p>

                    {/* メタデータ表示 */}
                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">詳細情報</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {notification.metadata.serviceName && (
                            <p>サービス: {notification.metadata.serviceName}</p>
                          )}
                          {notification.metadata.offerType && (
                            <p>オファータイプ: {notification.metadata.offerType}</p>
                          )}
                          {notification.metadata.savings && notification.metadata.savings > 0 && (
                            <p>節約額: ¥{notification.metadata.savings.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 日時情報 */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>受信: {formatDate(notification.created_at)}</span>
                      {notification.read_at && (
                        <span>既読: {formatDate(notification.read_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="ml-4">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={updatingIds.has(notification.id)}
                        className="px-3 py-1 bg-[#4D148C] text-white text-sm rounded-md hover:bg-[#3D0F6B] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {updatingIds.has(notification.id) ? '処理中...' : '既読にする'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5h-5V7h5l-5-5 5-5V2h-5v5h-5v5h5z" />
              </svg>
            </div>
            <p className="text-gray-500">
              {filter === 'all' ? '通知がありません' :
               filter === 'unread' ? '未読の通知がありません' :
               '既読の通知がありません'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 