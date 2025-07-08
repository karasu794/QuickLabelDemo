'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface DebugJobData {
  job: {
    id: string
    status: string
    error_message?: string
    created_at: string
    updated_at: string
    completed_at?: string
    request_payload: any
    response_payload: any
  }
  environment: Record<string, string>
  recentFailedJobs: Array<{
    id: string
    status: string
    error_message?: string
    created_at: string
    updated_at: string
    completed_at?: string
  }>
  todayStats: Record<string, number>
  debug: {
    timestamp: string
    nodeEnv: string
    region: string
  }
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing_auth':
      case 'processing_rate_request':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing_auth':
      case 'processing_rate_request':
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
      {getStatusIcon(status)}
      {status.toUpperCase()}
    </Badge>
  )
}

export default function DebugJobPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const [data, setData] = useState<DebugJobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/debug/job/${jobId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (jobId) {
      fetchDebugData()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">デバッグ情報を読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">エラー: {error}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">データが見つかりません</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">デバッグ情報</h1>
            <p className="text-gray-600">ジョブID: {jobId}</p>
          </div>
          <Button onClick={fetchDebugData} className="flex items-center gap-2">
            <Loader2 className="h-4 w-4" />
            更新
          </Button>
        </div>

        {/* ジョブ詳細 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ジョブ詳細
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700">ステータス</label>
                <div className="mt-1">
                  <StatusBadge status={data.job.status} />
                </div>
              </div>
              <div>
                <label className="font-medium text-gray-700">作成日時</label>
                <p className="text-gray-600 mt-1">{new Date(data.job.created_at).toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">更新日時</label>
                <p className="text-gray-600 mt-1">{new Date(data.job.updated_at).toLocaleString('ja-JP')}</p>
              </div>
              {data.job.completed_at && (
                <div>
                  <label className="font-medium text-gray-700">完了日時</label>
                  <p className="text-gray-600 mt-1">{new Date(data.job.completed_at).toLocaleString('ja-JP')}</p>
                </div>
              )}
            </div>

            {data.job.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="font-medium text-red-800">エラーメッセージ</label>
                <p className="text-red-700 mt-1 font-mono text-sm">{data.job.error_message}</p>
              </div>
            )}

            <div>
              <label className="font-medium text-gray-700">リクエストペイロード</label>
              <pre className="mt-1 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(data.job.request_payload, null, 2)}
              </pre>
            </div>

            {data.job.response_payload && (
              <div>
                <label className="font-medium text-gray-700">レスポンスペイロード</label>
                <pre className="mt-1 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(data.job.response_payload, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 環境変数 */}
        <Card>
          <CardHeader>
            <CardTitle>環境変数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.environment).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <Badge className={value === '設定済み' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 今日の統計 */}
        <Card>
          <CardHeader>
            <CardTitle>今日のジョブ統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.todayStats).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近の失敗したジョブ */}
        {data.recentFailedJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>最近の失敗したジョブ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentFailedJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{job.id}</p>
                        <p className="text-sm text-gray-600">{new Date(job.created_at).toLocaleString('ja-JP')}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    {job.error_message && (
                      <p className="mt-2 text-sm text-red-700 font-mono">{job.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 