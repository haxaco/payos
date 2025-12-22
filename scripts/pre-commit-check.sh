#!/bin/bash
# Pre-commit TypeScript check script
# Run this before committing to catch TypeScript errors

set -e

echo "🔍 Running TypeScript checks..."
echo ""

# Detect which packages have changes
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Check if web files changed
if echo "$CHANGED_FILES" | grep -q "apps/web/"; then
  echo "📦 Checking web package..."
  cd apps/web && pnpm tsc --noEmit && cd ../..
  echo "✅ Web package: No TypeScript errors"
  echo ""
fi

# Check if API files changed
if echo "$CHANGED_FILES" | grep -q "apps/api/"; then
  echo "📦 Checking API package..."
  cd apps/api && pnpm tsc --noEmit && cd ../..
  echo "✅ API package: No TypeScript errors"
  echo ""
fi

# Check if api-client files changed
if echo "$CHANGED_FILES" | grep -q "packages/api-client/"; then
  echo "📦 Checking api-client package..."
  cd packages/api-client && pnpm tsc --noEmit && cd ../..
  echo "✅ API client package: No TypeScript errors"
  echo ""
fi

# Check if ui files changed
if echo "$CHANGED_FILES" | grep -q "packages/ui/"; then
  echo "📦 Checking UI package..."
  cd packages/ui && pnpm tsc --noEmit && cd ../..
  echo "✅ UI package: No TypeScript errors"
  echo ""
fi

echo "✨ All TypeScript checks passed!"

