## Redirect Trace（雛形）

| Step | URL | Status | Notes |
|---|---|---|---|
| 1 | /signup?redirect_to=/mypage | 200 | signUp submit |
| 2 | (email) /auth/callback?code=...&next=/mypage | 302 | exchangeCodeForSession |
| 3 | /mypage?verified=1 | 200 | landed |


