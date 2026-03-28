'use client'

import { useRef } from 'react'
import toast from 'react-hot-toast'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

/**
 * デモモード対応のフォームラッパー
 * デモ時はsubmitを抑止してトースト表示、本番時はServer Actionへそのまま送信
 */
export default function CompanyInfoFormWrapper({
  children,
  action,
}: {
  children: React.ReactNode
  action: (formData: FormData) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (IS_DEMO) {
      e.preventDefault()
      toast('操作デモ 本番では入力した情報をデータベースに反映します', { icon: '✅' })
    }
    // 非デモ時はデフォルト動作（Server Action）がそのまま実行される
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6">
      {children}
    </form>
  )
}
