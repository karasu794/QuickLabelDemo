'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DebugAuthPage() {
  const { user, loading, isAuthenticated, authStatus } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      setSessionInfo({ session, error })
    }
    getSession()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">認証デバッグ情報</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">AuthContext状態</h2>
          <pre className="text-sm">
            {JSON.stringify({
              loading,
              isAuthenticated,
              authStatus,
              hasUser: !!user,
              userId: user?.id,
              userEmail: user?.email
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Supabaseセッション情報</h2>
          <pre className="text-sm">
            {JSON.stringify({
              hasSession: !!sessionInfo?.session,
              sessionUserId: sessionInfo?.session?.user?.id,
              sessionUserEmail: sessionInfo?.session?.user?.email,
              error: sessionInfo?.error?.message
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">ブラウザ情報</h2>
          <pre className="text-sm">
            {JSON.stringify({
              url: window.location.href,
              cookies: document.cookie,
              localStorage: Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'))
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}