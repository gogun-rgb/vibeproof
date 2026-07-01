#!/usr/bin/env bash
set -euo pipefail

npm ls --workspaces --depth=0
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build

echo ""
echo "==> git status and diff"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short
  git diff --stat
elif command -v git >/dev/null 2>&1; then
  echo "not a git repository; skipping repository diff summary."
else
  echo "git was not found; skipping repository diff summary."
fi

echo "VibeProof verification passed."
