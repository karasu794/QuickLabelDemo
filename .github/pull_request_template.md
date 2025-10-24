<!-- Title format: [WaveX] <summary> -->

## Scope
- 変更範囲／影響箇所の要約。

## Implementation summary
- 実装の要点、設計判断、主要な副作用（あれば）。

## DoD (Definition of Done)
- [ ] 要件を満たす
- [ ] 既存CI/CDグリーン
- [ ] 破壊的変更なし（あれば記載）

## Data-test coverage
- E2E: PASS required
- 対象ケース: （重要フロー・エッジケースを列挙）

## Review checklist
- [ ] Title形式が `[WaveX] <summary>` である
- [ ] closes #[issue] を含む（該当Issue番号に置換）
- [ ] 主要動作に対するE2Eがあり「PASS」確認済み
- [ ] 変更範囲が `Scope` に明記されている
- [ ] セキュリティ/個人情報/鍵の露出なし
- [ ] FedEx関連変更の場合、`docs/fedex_api_specs/` 参照（`md/`, `samples/docs-examples`, `*.sample.json`, `index.md`）を実施し根拠を記載

---

### Meta
- closes #[issue]
