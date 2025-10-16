## 2025-10-16

- fix(auth): signup verify redirect keeps next param and hardens middleware
- 追加: `isSafePath`, `buildAuthCallbackUrl`, `resolveSafeNext`
- `/auth/callback` の `next` 検証・安全化
- `signUp`/`unverified` の emailRedirectTo を統一
 - E2E/Contract追加（auth.signup.redirect.*）: ALL GREEN（1件flakyリトライ通過）
 - Open Redirect 防止を再確認（外部ドメインは拒否）


