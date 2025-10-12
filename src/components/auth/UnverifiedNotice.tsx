// 未認証案内の再利用可能コンポーネント。

'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function UnverifiedNotice() {
  return (
    <div className="rounded-lg border p-4 bg-amber-50 text-amber-900">
      <p className="mb-3">メール認証が完了していません。受信メールのリンクをクリックして有効化してください。</p>
      <div className="flex gap-3">
        <Link href="/unverified">
          <Button variant="outline">未認証案内へ</Button>
        </Link>
      </div>
    </div>
  )
}


