import { useState } from 'react'
import { useShippingFormStore } from '@/store/shippingFormStore'
import { supabase } from '@/lib/supabase/client'

export function useDraftSave() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  // Zustandストアから必要なデータを取得
  const shipperInfo = useShippingFormStore((state) => state.shipperInfo)
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)
  const packages = useShippingFormStore((state) => state.packages)
  const items = useShippingFormStore((state) => state.items)
  const shippingPurpose = useShippingFormStore((state) => state.shippingPurpose)
  const selectedRate = useShippingFormStore((state) => state.selectedRate)

  const saveDraft = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      // 認証ヘッダーの取得
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // 下書き保存APIにリクエスト
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shipperInfo,
          recipientInfo,
          packages,
          items,
          shippingPurpose,
          selectedRate,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '下書きの保存に失敗しました')
      }

      setMessage('下書きを保存しました')
      
      // 3秒後にメッセージを消す
      setTimeout(() => {
        setMessage(null)
      }, 3000)

    } catch (error) {
      console.error('下書き保存エラー:', error)
      setMessage('下書きの保存に失敗しました')
      
      // 5秒後にエラーメッセージを消す
      setTimeout(() => {
        setMessage(null)
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    saveDraft,
    isLoading,
    message,
    clearMessage: () => setMessage(null)
  }
} 