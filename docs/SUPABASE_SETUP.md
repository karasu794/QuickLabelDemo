# Supabase セットアップガイド

## 必要な依存関係のインストール

```bash
# Supabase関連
npm install @supabase/supabase-js @supabase/ssr

# TypeScript関連（開発依存関係）
npm install --save-dev @types/node

# 既にNext.js 14プロジェクトなので、next/headersは利用可能です
```

## 環境変数の設定

`.env.local` ファイルに以下の環境変数を追加してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## TypeScript設定

`tsconfig.json` でパスエイリアスが設定されていることを確認してください：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Supabase型定義の生成

Supabaseプロジェクトから型定義を生成するには：

```bash
# Supabase CLIをインストール
npm install -g supabase

# 型定義を生成
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

または、手動で型定義ファイルを作成することもできます（次の手順で作成します）。

## 使用例

### サーバーコンポーネントでの使用

```tsx
import { getUser, getUserProfile } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const user = await getUser()
  const profile = await getUserProfile()

  if (!user) {
    return <div>ログインしてください</div>
  }

  return (
    <div>
      <h1>プロフィール</h1>
      <p>Email: {user.email}</p>
      <p>名前: {profile?.contact_name}</p>
    </div>
  )
}
```

### Route Handlerでの使用

```tsx
// app/api/profile/route.ts
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
``` 