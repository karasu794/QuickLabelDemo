### 2025-10-15 修正方針（Admin 出荷キャンセル）

#### 前提
- 既存UIは Server Action を直叩き。API ルートは `/api/shipments/:id/cancel`（RPC）も存在。
- 旧パス `/api/ship/cancel` を参照している箇所があれば置換が必要。

#### 最小修正（QUICK_FIX=1 時のみ）
- API ダミー応答（もし未実装やハングがある場合）
  - `/api/ship/cancel` を誤参照しているテスト/UI向けに、405/501 を即時返す薄いルートを暫定追加。
  - 認証/権限は現行方針に合わせる（Admin限定）。
- UI データテストセレクタ
  - 管理画面キャンセルボタンへ `data-test="admin-cancel"` を付与（不足時）。

---

### 2025-10-16 QUICK_FIX 実施内容（追記）

- `/api/ship/cancel` ダミールートを追加（POST:501, 非Admin:403, 他:405）。本実装は別PRにて。
- `AdminCancelShipmentButton` に `data-test="admin-cancel"` を付与。
- E2E/Contract 追加（タイムアウト→即時応答への収束を確認）。

## 通知拡張 (2025-10-17)
- cancelShipmentByTrackingNumber 内で FedEx/Square 成否に応じた日本語通知を自動生成
- createAdminNotification() を追加して notifications に保存
- /admin/notifications ページで success/error を色分け表示
- admin_actions.metadata と整合

#### 本実装の方針（次PR）
- 状態機械
  - `created → labeled → cancel_requested → cancelled` 等を明確にし、API/Action と整合。
- 冪等性
  - 同一出荷への再キャンセルは即時成功（No-op）で 200/204 を返す。
- 監査
  - 管理操作を監査テーブルへ永続化（誰/いつ/対象/結果）。
- エラー整理
  - FedEx: 期限切れ/未発行/既キャンセル等のメッセージ分岐。
  - DB: RLS違反/不存在/ステータス不整合を 4xx に正規化。
- 統一API
  - Admin/API/Actionの役割分担を明確化（ActionはUI向け編成オーケストレーション、APIはプログラマブル用途）。

#### テスト
- Contract
  - `/api/shipments/:id/cancel` の入力/出力固定化（成功/既キャンセル/権限不足）。
- E2E
  - 管理画面からキャンセル→返金→状態反映までの一連フロー。


