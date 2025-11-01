> Legacy command (pre-ma_orbit)
> Active QA flows live in .cursor/commands/qa/
# SETUP – PR TEMPLATE (FQL STANDARD)

## PREP
- Purpose: FQL開発標準に準拠したPRテンプレートをリポジトリに導入し、レビュー品質と一貫性を向上させる。
- Impact Scope: `.github/PULL_REQUEST_TEMPLATE.md`
- Rules (as-is):
  - Title: `[WaveX] <summary>`
  - Sections: `Scope / Implementation summary / DoD / Data-test coverage / Review checklist`
  - 自動挿入キーワード: `closes #[issue]`, `E2E PASS required`
- Compatibility/Risks: 既存のPRテンプレートがある場合は置換。GitHubのマルチテンプレート運用は行わない方針。
- Implementation Policy: 最小差分で `.github/PULL_REQUEST_TEMPLATE.md` を新規作成/更新。Markdownのみ。

---

## APPLY
1) `.github/PULL_REQUEST_TEMPLATE.md` を作成/更新し、以下の内容を保存する。

```markdown
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
- [ ] `closes #[issue]` を含む（該当Issue番号に置換）
- [ ] 主要動作に対するE2Eがあり「PASS」確認済み
- [ ] 変更範囲が `Scope` に明記されている
- [ ] セキュリティ/個人情報/鍵の露出なし

---

### Meta
- closes #[issue]
```

2) 既存の自動生成物（例: `scripts/build-pr-body.ts`）との重複有無を確認し、競合があれば本テンプレートを優先。

---

## TEST
- 手動: テンプレートが新規PR作成画面に反映され、各セクションが表示されること。
- 自動: なし（UI層のGitHub機能のため）。

---

## RISK/NEXT
- リスク: レポジトリに既存テンプレートがある場合の上書き影響。
- Next: Waveごとのチーム運用に応じ、`Review checklist` の追加項目検討。

---

## SPEC (原指示の写経)
- Goal: FQL開発標準に準拠したPRテンプレートを生成
- Scope: `.github/PULL_REQUEST_TEMPLATE.md`
- Rules:
  - Title: `[WaveX] <summary>`
  - Sections: `Scope / Implementation summary / DoD / Data-test coverage / Review checklist`
  - 自動挿入するキーワード: `closes #[issue]`, `E2E PASS required`
