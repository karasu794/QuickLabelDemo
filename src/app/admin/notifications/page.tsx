'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  metadata: any
  created_at: string
  updated_at: string
  read_at?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  // ページ読み込み時に通知を取得
  useEffect(() => {
    fetchNotifications()
  }, [])

  // 通知を取得する関数
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      
      // Supabaseから通知を取得（新しい順）
      const response = await fetch('/api/notifications', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('通知の取得に失敗しました')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('通知取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 通知を既読にする関数
  const markAsRead = async (notificationId: string) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(notificationId))

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: notificationId,
          action: 'mark_as_read'
        }),
      })

      if (!response.ok) {
        throw new Error('通知の更新に失敗しました')
      }

      // ローカル状態を更新
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )

    } catch (error) {
      console.error('通知更新エラー:', error)
      alert('通知の更新に失敗しました')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  // 全ての未読通知を既読にする関数
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) return

    try {
      const promises = unreadNotifications.map(notification => 
        markAsRead(notification.id)
      )
      await Promise.all(promises)
    } catch (error) {
      console.error('一括既読処理エラー:', error)
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

  // フィルタリングされた通知
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'read') return notification.is_read
    return true
  })

  // 統計情報
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    read: notifications.filter(n => n.is_read).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
          <p className="text-gray-600">通知を読み込み中...</p>
        </div>
      </div>
    )
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
            onClick={fetchNotifications}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            🔄 更新
          </button>
          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] transition-colors duration-200"
            >
              全て既読にする
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
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === 'all' 
                ? 'bg-[#4D148C] text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            全て ({stats.total})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === 'unread' 
                ? 'bg-red-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            未読 ({stats.unread})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === 'read' 
                ? 'bg-green-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            既読 ({stats.read})
          </button>
        </div>
      </div>

      {/* 通知リスト */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            通知リスト {filter !== 'all' && `(${filter === 'unread' ? '未読のみ' : '既読のみ'})`}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredNotifications.length}件の通知
          </p>
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
                        onClick={() => markAsRead(notification.id)}
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