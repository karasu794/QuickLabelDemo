#!/usr/bin/env bash
set -euo pipefail

PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
CURR="${VERCEL_GIT_COMMIT_SHA:-}"

# If previous commit is unknown or unreachable, require build
if [[ -z "$PREV" ]] || ! git cat-file -e "${PREV}^{commit}" 2>/dev/null; then
  echo "Previous commit unknown or unreachable; Build required"
  exit 1
fi

CHANGED="$(git diff --name-only "$PREV" "$CURR" || true)"

ALLOW_REGEX='^(docs/|README\.md$|\.github/|\.vscode/|.*\.(md|png|jpg|jpeg|svg|gif)$|test/|tests/|playwright/|e2e/|recordings/|artifacts/)'

if echo "$CHANGED" | egrep -qv "$ALLOW_REGEX"; then
  echo "Build required"; exit 1
else
  echo "Skipping build"; exit 0
fi
