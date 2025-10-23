# data-test セレクタ規約（SpecWriter用）

本書は E2E/契約テストで使用する `data-test` 属性の命名/配置と、主要ページの既存セレクタ一覧を台帳化します。命名は kebab-case。領域-要素 の順で短く一意にします。

## 規約

- 形式: kebab-case（例: `lh-section`, `preview-button`）
- 配置: ユーザー操作要素/主要表示要素/モーダル root に付与
- 変更: UI変更で意味が変わる場合はセレクタも更新（テスト同期）

## 既存セレクタ一覧（抜粋）

| ページ/コンポーネント | セレクタ |
|---|---|
| shipping/new/shipper | `btn-history-picker`, `btn-addressbook-picker` |
| shipping/new/recipient | `btn-history-picker`, `btn-addressbook-picker`, `submit-ship` |
| shipping/new/review | `disclaimer-error`, `disclaimer-checkbox`, `disclaimer-link` |
| mypage/profile | `jp-full-name`, `jp-phone`, `jp-company`, `jp-postal`, `jp-address1` |
| admin/company-info | `jp-contact`, `jp-company`, `jp-postal`, `jp-address1`, `jp-address2`, `jp-phone`, `jp-email` |
| components/AddressBookPicker | `modal-addressbook-picker`, `empty-addressbook` |
| components/AddressHistoryPicker | `modal-history-picker`, `empty-history` |
| components/QuoteFormComponent | `residential`, `residential-help-trigger`, `declared-limit`, `declared-limit-help-trigger`, `declared-limit-popover`, `dim-longest`, `dim-middle`, `dim-shortest`, `dim-length`, `dim-width`, `dim-height` |
| components/ResponsiveTable | `user-row` |
| components/ui/popover | `popover-close` |
| components/SquarePaymentForm | `confirm-button` |
| components/AdminCancelShipmentButton | `admin-cancel` |

備考:

- `tests/Stage3-TEST-GUIDE.md` にステージ固有の主要IDが明記。
- `PR-PLAN.md` で `data-testid` 方針の導入記載があるが、実コードは `data-test` を使用。

## 追加時の指針

- 目的語中心で短く（例: `confirm-button`）。
- モーダルは `modal-*`、空状態は `empty-*` を接頭辞に。
- 画面単位のルート要素にはページ識別の `*-page` を検討（例: `admin-users-page`）。

## 安定化 Tips

- テキストや構造に依存しない。クラス名や順番ではなく `data-test` を前提にテスト。
- 条件表示のトグル要素は、OFF時も存在する説明要素にセレクタを付ける（例: `*-explainer`）。

---

### Sources

- `src/app/shipping/new/shipper/page.tsx`
- `src/app/shipping/new/recipient/page.tsx`
- `src/app/shipping/new/review/page.tsx`
- `src/app/mypage/profile/page.tsx`
- `src/app/admin/company-info/page.tsx`
- `src/components/address/AddressBookPicker.tsx`
- `src/components/address/AddressHistoryPicker.tsx`
- `src/components/QuoteFormComponent.tsx`
- `src/components/ResponsiveTable.tsx`
- `src/components/ui/popover.tsx`
- `src/components/SquarePaymentForm.tsx`
- `src/components/AdminCancelShipmentButton.tsx`
- `docs/Stage3-TEST-GUIDE.md`

Last-Verified: 2025-10-20
