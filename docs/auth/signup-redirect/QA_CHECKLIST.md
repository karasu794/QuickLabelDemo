## 回帰チェックリスト

- [ ] メール認証復帰で `next` に着地（例: /mypage）
- [ ] 無効な `next`（外部URL等）は `/welcome` or `/mypage` にフォールバック
- [ ] `/auth/callback` がミドルウェアに阻害されない
- [ ] 非認証で保護ルートへアクセスすると `/login?redirect_to=...` へ遷移
- [ ] Open Redirect 不可（`https://evil.com` など）


