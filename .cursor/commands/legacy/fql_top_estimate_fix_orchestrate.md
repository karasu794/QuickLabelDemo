# Goal
ブランチ作成 → パッチ適用 → Unit → E2E → Lint/型/Build → Commit/Push を順に自動実行する。

# Preconditions
- Node / pnpm インストール済み
- Playwright の依存は `pnpm playwright install` 済み（必要なら実行）

# Steps
1. @Command fql_top_estimate_fix_1_branch
2. @Command fql_top_estimate_fix_2_patch
3. shell:
   - pnpm -s lint || exit 1
   - pnpm -s typecheck || exit 1
4. @Command fql_top_estimate_fix_3_unit_tests
5. @Command fql_top_estimate_fix_4_e2e_tests
6. @Command fql_top_estimate_fix_5_build
7. @Command fql_top_estimate_fix_6_commit_push

# Assertions
- すべてのコマンドが 0 終了
- PR 作成可能

# Exit Criteria
- リモートに `feat/quote-top-estimate-fix` が push 済み
