# Security Incident Response - Leaked Supabase Key

**Date:** December 19, 2025  
**Severity:** CRITICAL  
**Status:** IN PROGRESS

---

## Incident Summary

GitHub detected a leaked Supabase service role key in the repository:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc3Jlc2h3bnRwZHJ0aGZnd29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTI2MywiZXhwIjoyMDgxMDg3MjYzfQ.dusQbPqen-akM_wIlu-JBWjJGSCTiTlCOkBYEdGHmeg
```

**Risk:** This key can bypass Row Level Security and access all data.

---

## IMMEDIATE ACTION REQUIRED (Step 1: Rotate Key)

### Option A: Rotate Service Role Key (Recommended - Faster)

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api

2. **Generate New Service Role Key:**
   - Under "Service role" section
   - Click "Generate new key" or "Rotate key"
   - **Copy the new key immediately** (you won't see it again!)
   - Save it to your password manager

3. **Old key will be invalidated** - This prevents unauthorized access

### Option B: Rotate JWT Secret (More Secure - Slower)

⚠️ **WARNING:** This will invalidate ALL existing tokens (user sessions, API keys, etc.)

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api

2. **Scroll to "JWT Settings"**
   - Click "Generate new JWT secret"
   - Confirm the action
   - **This will invalidate all tokens!**

3. **Wait for deployment** (can take 2-10 minutes)

4. **Get new keys:**
   - New anon key
   - New service_role key

### Recommended: Option A (Rotate Service Role Key)

This is faster and won't affect user sessions.

---

## Step 2: Update Local Environment

After rotating the key in Supabase:

```bash
# Edit your local .env file
nano apps/api/.env

# Replace the old SUPABASE_SERVICE_ROLE_KEY with the new one
# Also update SUPABASE_ANON_KEY if you rotated JWT secret
```

**New values from Supabase Dashboard:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co  # Same
SUPABASE_SERVICE_ROLE_KEY=<NEW_KEY_FROM_SUPABASE>      # NEW!
SUPABASE_ANON_KEY=<YOUR_ANON_KEY>                       # Same (unless JWT rotated)
```

---

## Step 3: Clean Git History

The leaked key is in git history. We must remove it:

### Method 1: Using git filter-repo (Recommended)

```bash
# Install git-filter-repo (if not installed)
brew install git-filter-repo

# OR on Ubuntu/Debian
# sudo apt-get install git-filter-repo

# Backup your repository first!
cd /Users/haxaco/Dev/PayOS
cp -r . ../PayOS-backup

# Create a file with the leaked secret
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc3Jlc2h3bnRwZHJ0aGZnd29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTI2MywiZXhwIjoyMDgxMDg3MjYzfQ.dusQbPqen-akM_wIlu-JBWjJGSCTiTlCOkBYEdGHmeg' > /tmp/secrets.txt

# Remove the secret from git history
git filter-repo --replace-text /tmp/secrets.txt --force

# Clean up
rm /tmp/secrets.txt
```

### Method 2: Using BFG Repo-Cleaner (Alternative)

```bash
# Install BFG
brew install bfg

# Create a file with the leaked secret
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc3Jlc2h3bnRwZHJ0aGZnd29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTI2MywiZXhwIjoyMDgxMDg3MjYzfQ.dusQbPqen-akM_wIlu-JBWjJGSCTiTlCOkBYEdGHmeg' > /tmp/secrets.txt

# Clone a fresh copy
cd ..
git clone --mirror git@github.com:haxaco/payos.git payos-mirror
cd payos-mirror

# Remove the secret
bfg --replace-text /tmp/secrets.txt

# Clean up and push
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push the cleaned history
git push --force

# Go back to your working directory
cd /Users/haxaco/Dev/PayOS

# Pull the cleaned history
git fetch origin
git reset --hard origin/main
```

---

## Step 4: Force Push Cleaned Repository

After cleaning history with either method:

```bash
cd /Users/haxaco/Dev/PayOS

# Verify the secret is gone
git log --all --full-history --source --pretty=format:'%H' | while read commit; do
  if git show $commit | grep -q "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; then
    echo "Found in commit: $commit"
  fi
done

# If no output, the secret is removed!

# Force push to GitHub
git push origin main --force

# Push all branches (if you have others)
git push origin --all --force
git push origin --tags --force
```

---

## Step 5: Verify and Close GitHub Alert

1. **Wait 5-10 minutes** for GitHub to re-scan

2. **Check the Security tab** on GitHub:
   - Go to: https://github.com/haxaco/payos/security

3. **If alert still shows:**
   - Click on the alert
   - Click "Dismiss alert"
   - Select "Revoked" as the reason
   - Add comment: "Key rotated in Supabase and removed from git history"

4. **Verify new key works:**
   ```bash
   cd /Users/haxaco/Dev/PayOS/apps/api
   pnpm dev
   # Test API endpoints
   ```

---

## Step 6: Check for Unauthorized Access

1. **Check Supabase Logs:**
   - Go to: https://app.supabase.com/project/YOUR_PROJECT_ID/logs

2. **Look for suspicious activity:**
   - Unexpected API calls
   - Data modifications
   - User account changes
   - Unusual query patterns

3. **Check API Logs (if running):**
   ```bash
   # Review recent API access
   # Look for unexpected IP addresses or patterns
   ```

4. **Review Database:**
   ```sql
   -- Check for unexpected data changes
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;
   
   -- Check user accounts
   SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 20;
   
   -- Check for new accounts created recently
   SELECT * FROM accounts WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

---

## Step 7: Update Production/Staging (if deployed)

If you've already deployed to production:

### Railway (API)

1. Go to Railway Dashboard
2. Select your project
3. Go to Variables
4. Update `SUPABASE_SERVICE_ROLE_KEY` with new value
5. Redeploy: `railway up` or use dashboard

### Vercel (Frontend)

If you used the anon key and rotated JWT secret:

1. Go to Vercel Dashboard
2. Select each project (payos-ui, payos-web)
3. Settings → Environment Variables
4. Update `VITE_SUPABASE_ANON_KEY` (if changed)
5. Redeploy

---

## Prevention Measures

### Immediate (Next 24 Hours)

- [ ] Rotate the Supabase service role key
- [ ] Clean git history
- [ ] Force push cleaned repository
- [ ] Update local .env files
- [ ] Update production environment variables
- [ ] Check logs for unauthorized access
- [ ] Close GitHub security alert

### Short-term (This Week)

- [ ] Set up git hooks to prevent credential commits
- [ ] Use git-secrets or similar tool
- [ ] Review all team members' local .env files
- [ ] Update documentation on credential handling
- [ ] Set up Supabase alerts for unusual activity

### Long-term (This Month)

- [ ] Implement secret scanning in CI/CD
- [ ] Set up branch protection rules
- [ ] Require code review before merge
- [ ] Set up automated secret rotation
- [ ] Create incident response playbook
- [ ] Train team on security best practices

---

## Git Hooks to Prevent Future Leaks

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for common secret patterns
if git diff --cached | grep -E 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'; then
  echo "ERROR: Potential JWT token found in commit!"
  echo "Please remove sensitive credentials before committing."
  exit 1
fi

if git diff --cached | grep -E 'SUPABASE_SERVICE_ROLE_KEY.*=.*eyJ'; then
  echo "ERROR: Supabase service role key found in commit!"
  echo "Please remove sensitive credentials before committing."
  exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Install git-secrets (Recommended)

```bash
# Install git-secrets
brew install git-secrets

# Set up for repository
cd /Users/haxaco/Dev/PayOS
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'
git secrets --add 'SUPABASE_SERVICE_ROLE_KEY.*=.*[A-Za-z0-9]'
git secrets --add '[Ss][Ee][Rr][Vv][Ii][Cc][Ee].*[Kk][Ee][Yy].*eyJ'

# Scan existing history (optional)
git secrets --scan-history
```

---

## Contact Information

**Incident Lead:** [Your Name]  
**Date Opened:** December 19, 2025  
**Status:** IN PROGRESS  

### Timeline

- **12:00 PM** - GitHub alert received
- **12:05 PM** - Incident response initiated
- **[TIME]** - Supabase key rotated
- **[TIME]** - Git history cleaned
- **[TIME]** - Force push completed
- **[TIME]** - GitHub alert dismissed
- **[TIME]** - Incident resolved

---

## Lessons Learned (To Complete After Incident)

1. **What went wrong?**
   - 

2. **What went right?**
   - 

3. **What can we improve?**
   - 

4. **Action items:**
   - 

---

**Status:** ONGOING - Complete steps above immediately!

