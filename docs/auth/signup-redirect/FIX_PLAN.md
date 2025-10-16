## 修正方針

### 選択肢比較
- A) コールバック統一 + `next`をクエリで連結保持 + 安全判定（採用）
- B) ミドルウェアで復帰URLを特判（過剰複雑化の懸念）
- C) ページごとに個別ハンドリング（保守コスト増）

採用: A

### 採用案の設計（擬似コード）

```
signUp(next) {
  emailRedirectTo = buildAuthCallbackUrl(next, 'signup')
}

GET /auth/callback?code&next {
  session = exchangeCodeForSession(code)
  safeNext = resolveSafeNext(next, '/mypage')
  redirect(origin + safeNext + '&verified=1')
}

unverified resend {
  emailRedirectTo = buildAuthCallbackUrl(sessionStorage.signup_next, 'signup')
}
```

### 実装差分
- `src/lib/auth/redirect.ts`: `isSafePath`, `buildAuthCallbackUrl`, `resolveSafeNext`
- `src/app/auth/callback/route.ts`: `resolveSafeNext` で `next` を検証
- `src/lib/supabase/client.ts`: `buildAuthCallbackUrl` を使用
- `src/app/signup/SignUpForm.tsx`: `sessionStorage.signup_next` 保存
- `src/app/unverified/page.tsx`: 再送時も `buildAuthCallbackUrl` を使用

### ミドルウェア
- 現状はセッション同期のみで問題なし。`/auth/callback` を阻害しないため変更なし。


