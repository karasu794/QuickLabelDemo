'use client'

import toast from 'react-hot-toast'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

export default function FeeFormWrapper({
  children,
  action,
}: {
  children: React.ReactNode
  action: (formData: FormData) => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (IS_DEMO) {
      e.preventDefault()
      toast('操作デモ 本番では入力した手数料をデータベースに反映します', { icon: '✅' })
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-6">
      {children}
    </form>
  )
}
