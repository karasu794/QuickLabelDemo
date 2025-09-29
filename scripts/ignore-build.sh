#!/usr/bin/env bash
set -euo pipefail

CHANGED="$(git diff --name-only "${VERCEL_GIT_PREVIOUS_SHA:-}" "${VERCEL_GIT_COMMIT_SHA:-}" || true)"

if [ -z "$CHANGED" ]; then
  echo "Build required"; exit 1
fi

PATTERN='^(docs/|README\.md|.*\.md|.*\.(png|jpg|jpeg|svg|gif)|\.github/|\.vscode/|test/|tests/|playwright/|e2e/)'
if echo "$CHANGED" | egrep -qv "$PATTERN"; then
  echo "Build required"; exit 1
else
  echo "Skipping build"; exit 0
fi
