#!/bin/bash

echo "🔍 Checking for Next.js security updates..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Current version
CURRENT=$(npm list next --depth=0 2>/dev/null | grep next@ | sed 's/.*next@//' | sed 's/ .*//')
if [ -z "$CURRENT" ]; then
  echo "❌ Could not detect current Next.js version"
  echo "   Run this script from apps/web directory"
  exit 1
fi

echo "📦 Current Next.js version: $CURRENT"

# Latest version
LATEST=$(npm info next version 2>/dev/null)
if [ -z "$LATEST" ]; then
  echo "❌ Could not fetch latest version from npm"
  exit 1
fi

echo "📦 Latest Next.js version:  $LATEST"
echo ""

# React version
REACT_CURRENT=$(npm list react --depth=0 2>/dev/null | grep react@ | head -1 | sed 's/.*react@//' | sed 's/ .*//')
REACT_LATEST=$(npm info react version 2>/dev/null)

echo "⚛️  Current React version:   $REACT_CURRENT"
echo "⚛️  Latest React version:    $REACT_LATEST"
echo ""

# Compare versions
if [ "$CURRENT" != "$LATEST" ]; then
  echo "⚠️  UPDATE AVAILABLE!"
  echo ""
  echo "📝 To update Next.js:"
  echo "   cd apps/web"
  echo "   pnpm update next@latest"
  echo "   pnpm install"
  echo "   npm run build"
  echo "   npm run start  # Test locally first"
  echo ""
  echo "📰 Check release notes at:"
  echo "   https://github.com/vercel/next.js/releases/tag/v$LATEST"
else
  echo "✅ You are on the latest version of Next.js"
fi

if [ "$REACT_CURRENT" != "$REACT_LATEST" ]; then
  echo ""
  echo "⚠️  React update also available (v$REACT_LATEST)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Security Status:"
echo ""

# Check if version is in vulnerable range for React2Shell
MAJOR=$(echo $CURRENT | cut -d. -f1)
MINOR=$(echo $CURRENT | cut -d. -f2)
VERSION_NUM="${MAJOR}.${MINOR}"

if [ "$MAJOR" = "15" ] || ([ "$MAJOR" = "16" ] && [ "$MINOR" = "0" ]); then
  echo "   React2Shell (CVE-2025-55182):  🔴 VULNERABLE - UPDATE NOW!"
  echo "   CVE-2025-55184 (DoS):           🔴 VULNERABLE"
  echo "   CVE-2025-55183 (Code Leak):     🔴 VULNERABLE"
else
  echo "   React2Shell (CVE-2025-55182):  ✅ PATCHED (v$CURRENT)"
  echo "   CVE-2025-55184 (DoS):           🟡 RUN npx fix-react2shell-next TO VERIFY"
  echo "   CVE-2025-55183 (Code Leak):     🟡 RUN npx fix-react2shell-next TO VERIFY"
fi

echo ""
echo "🛠️  Automated Fix Available:"
echo "   npx fix-react2shell-next"
echo ""
echo "📚 Official Bulletin:"
echo "   https://vercel.com/kb/bulletin/react2shell"
echo ""

