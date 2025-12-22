#!/bin/bash

# Script to remove leaked Supabase key from git history
# CRITICAL SECURITY INCIDENT RESPONSE

set -e

echo "🚨 CLEANING GIT HISTORY - LEAKED CREDENTIAL REMOVAL"
echo "=================================================="
echo ""

# The leaked secret
LEAKED_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc3Jlc2h3bnRwZHJ0aGZnd29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTI2MywiZXhwIjoyMDgxMDg3MjYzfQ.dusQbPqen-akM_wIlu-JBWjJGSCTiTlCOkBYEdGHmeg"

# Backup check
echo "⚠️  WARNING: This will rewrite git history!"
echo "Make sure you have:"
echo "1. ✅ Rotated the Supabase key already"
echo "2. ✅ Updated your local .env file with new key"
echo "3. ✅ Backed up your repository (optional but recommended)"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📋 Step 1: Checking for leaked secret in current files..."

# Check if secret exists in current working tree
if git grep -q "$LEAKED_SECRET" 2>/dev/null; then
    echo "❌ ERROR: Leaked secret found in current working tree!"
    echo "Please remove it from files first, then run this script again."
    echo ""
    echo "Files containing the secret:"
    git grep -l "$LEAKED_SECRET"
    exit 1
else
    echo "✅ No leaked secret in current working tree"
fi

echo ""
echo "📋 Step 2: Scanning git history for leaked secret..."

# Check if secret exists in git history
COMMITS_WITH_SECRET=$(git log --all --source --full-history -S "$LEAKED_SECRET" --pretty=format:'%H' | wc -l | tr -d ' ')

if [ "$COMMITS_WITH_SECRET" -eq "0" ]; then
    echo "✅ No leaked secret found in git history!"
    echo "You may still need to force push to update GitHub."
    exit 0
fi

echo "⚠️  Found leaked secret in $COMMITS_WITH_SECRET commit(s)"

echo ""
echo "📋 Step 3: Creating backup branch..."
git branch backup-before-cleaning-$(date +%Y%m%d-%H%M%S) || true

echo ""
echo "📋 Step 4: Cleaning git history..."
echo "This may take a few minutes..."

# Use git filter-branch to remove the secret
git filter-branch --force --index-filter \
  "git ls-files -z | xargs -0 sed -i '' 's/$LEAKED_SECRET/[REDACTED-SERVICE-ROLE-KEY]/g' 2>/dev/null || true" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "📋 Step 5: Cleaning up refs..."

# Remove original refs
rm -rf .git/refs/original/

# Expire reflog
git reflog expire --expire=now --all

# Garbage collect
git gc --prune=now --aggressive

echo ""
echo "📋 Step 6: Verifying cleanup..."

# Verify the secret is gone
if git log --all --source --full-history -S "$LEAKED_SECRET" --pretty=format:'%H' | grep -q .; then
    echo "❌ ERROR: Secret still found in git history!"
    echo "Manual intervention required."
    exit 1
else
    echo "✅ Secret successfully removed from git history!"
fi

echo ""
echo "=================================================="
echo "✅ GIT HISTORY CLEANED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "📋 Next steps:"
echo "1. Force push to GitHub:"
echo "   git push origin main --force"
echo ""
echo "2. Force push all branches and tags:"
echo "   git push origin --all --force"
echo "   git push origin --tags --force"
echo ""
echo "3. Wait 5-10 minutes for GitHub to re-scan"
echo ""
echo "4. Dismiss the security alert on GitHub:"
echo "   https://github.com/haxaco/payos/security"
echo ""
echo "5. Verify new Supabase key works:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "⚠️  IMPORTANT: All collaborators must re-clone the repository!"
echo "   git clone git@github.com:haxaco/payos.git"
echo ""

