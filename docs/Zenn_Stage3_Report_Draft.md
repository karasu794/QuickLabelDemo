## Stage3: 管理トグルを UI→PDF→E2E で貫通させる実装記録（草稿）

### 背景
- 管理者が Phoenix 固定のレターヘッド/署名を強制できるトグルを導入
- これを SSR → UI → PDF → E2E まで一貫

### ポイント
- SSRで `FORCE_PHOENIX_*` を取得し初期描画を決定（クライアント再フェッチなし）
- `data-testid` 統一で安定したE2Eセレクタ運用
- JSX不要のSSRラッパを用いた契約テストで、依存追加なしに UI 分岐を検証
- プレビューAPIは最小・安定実装（ダミーURL返却）

### 実装要点
- Admin/Mypage 資産APIで画像保存とDB記録（RLSに準拠）
- 有効資産解決: user優先→admin fallback（強制ONなら必ずadmin）
- E2Eは Cookie override を非本番限定で許可（`NODE_ENV !== 'production'`）

### 次フェーズ
- PDFビルダーの本格実装（ヘッダ/署名画像の描画）
- MyPage 資産管理UIの拡充


