# 🚨 SECURITY FIX CHECKLIST - Leaked Supabase Key

**FOLLOW THESE STEPS IN ORDER - DO NOT SKIP!**

---

## ✅ STEP 1: Rotate Supabase Key (5 minutes) - **DO THIS FIRST!**

- [ ] Open Supabase Dashboard: https://app.supabase.com/project/lgsreshwntpdrthfgwos/settings/api
- [ ] Scroll to "Service role" section  
- [ ] Click "Generate new key" or "Rotate" button
- [ ] **COPY THE NEW KEY** immediately and save it securely
- [ ] **Verify old key is invalidated** (try using it - should fail)

**New Service Role Key:** `_______________________________` (write it down!)

---

## ✅ STEP 2: Update Local Environment (2 minutes)

```bash
# Edit your .env file
nano /Users/haxaco/Dev/PayOS/apps/api/.env

# Replace this line:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # OLD (leaked)

# With this:
SUPABASE_SERVICE_ROLE_KEY=<NEW_KEY_FROM_STEP_1>  # NEW!
```

- [ ] Updated `apps/api/.env` with new key
- [ ] Saved the file
- [ ] Also update `apps/web/.env.local` if it has the service role key

---

## ✅ STEP 3: Clean Git History (10 minutes)

**IMPORTANT:** Make sure Steps 1 & 2 are complete before proceeding!

### Option A: Using the provided script (Easiest)

```bash
cd /Users/haxaco/Dev/PayOS

# Run the cleanup script
./clean-git-history.sh
```

- [ ] Script ran successfully
- [ ] No errors reported
- [ ] Secret removed from git history (script will verify)

### Option B: Manual method (if script fails)

```bash
cd /Users/haxaco/Dev/PayOS

# Create backup
git branch backup-before-cleaning-$(date +%Y%m%d)

# Remove the secret from all commits
git filter-branch --force --index-filter \
  'git ls-files -z | xargs -0 sed -i "" "s/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnc3Jlc2h3bnRwZHJ0aGZnd29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTI2MywiZXhwIjoyMDgxMDg3MjYzfQ.dusQbPqen-akM_wIlu-JBWjJGSCTiTlCOkBYEdGHmeg/[REDACTED]/g" 2>/dev/null || true' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

- [ ] Manual cleanup completed
- [ ] No errors

---

## ✅ STEP 4: Force Push to GitHub (2 minutes)

```bash
cd /Users/haxaco/Dev/PayOS

# Force push main branch
git push origin main --force

# Force push all branches (if you have any)
git push origin --all --force

# Force push tags (if you have any)
git push origin --tags --force
```

- [ ] Force push completed successfully
- [ ] No errors from GitHub

**Output should show:** `forced update`

---

## ✅ STEP 5: Verify on GitHub (5 minutes)

1. **Wait 5-10 minutes** for GitHub to re-scan the repository

2. **Check the Security tab:**
   - Go to: https://github.com/haxaco/payos/security
   - [ ] Security alert still shows (wait a bit more)
   - [ ] Security alert cleared automatically

3. **If alert persists after 10 minutes:**
   - Click on the alert
   - Click "Dismiss alert"
   - Select "Revoked" as the reason
   - Comment: "Key rotated in Supabase and removed from git history"
   - [ ] Alert dismissed

---

## ✅ STEP 6: Test New Key Works (3 minutes)

```bash
cd /Users/haxaco/Dev/PayOS/apps/api

# Start the API server
pnpm dev
```

**Expected output:**
```
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://0.0.0.0:4000        ║
╚════════════════════════════════════════════╝
```

**Test the API:**
```bash
# In another terminal
curl http://localhost:4000/health
```

- [ ] API server starts without errors
- [ ] Health check returns `{"status":"ok"}`
- [ ] No authentication errors

**If errors occur:** Check your .env file has the correct new key

---

## ✅ STEP 7: Check for Unauthorized Access (10 minutes)

### Check Supabase Logs

1. Go to: https://app.supabase.com/project/lgsreshwntpdrthfgwos/logs

2. Look for suspicious activity:
   - [ ] Unexpected API calls from unknown IPs
   - [ ] Unusual query patterns
   - [ ] Data modifications during the leak period

3. **If suspicious activity found:**
   - Note the IP addresses
   - Note the timestamps
   - Note what data was accessed
   - Consider notifying affected users

### Check Database for Changes

```sql
-- Connect to Supabase SQL Editor
-- https://app.supabase.com/project/lgsreshwntpdrthfgwos/editor

-- Check recent account creations
SELECT * FROM accounts 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check recent user signups
SELECT email, created_at 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check for unusual data modifications
-- (Add queries specific to your schema)
```

- [ ] No suspicious account creations
- [ ] No suspicious user signups  
- [ ] No unusual data modifications
- [ ] **If suspicious activity found:** Document it in SECURITY_INCIDENT_RESPONSE.md

---

## ✅ STEP 8: Update Production (if deployed)

### If API is deployed on Railway:

```bash
# Via CLI
railway variables set SUPABASE_SERVICE_ROLE_KEY="<NEW_KEY>"

# OR via Railway Dashboard:
# 1. Go to Railway Dashboard
# 2. Select your project
# 3. Go to Variables tab
# 4. Update SUPABASE_SERVICE_ROLE_KEY
# 5. Save (will auto-redeploy)
```

- [ ] Updated Railway environment variable
- [ ] Deployment succeeded
- [ ] Production API works with new key

### If Frontend is deployed on Vercel:

Only needed if you rotated the JWT secret (which changes anon key):

```bash
# For each project (payos-ui, payos-web)
# 1. Go to Vercel Dashboard
# 2. Select project
# 3. Settings → Environment Variables
# 4. Update VITE_SUPABASE_ANON_KEY (if changed)
# 5. Redeploy
```

- [ ] Updated Vercel environment variables (if needed)
- [ ] Redeployed frontend (if needed)
- [ ] Production frontend works

---

## ✅ STEP 9: Prevent Future Leaks (15 minutes)

### Install git-secrets

```bash
# Install git-secrets
brew install git-secrets

# Set up for repository
cd /Users/haxaco/Dev/PayOS
git secrets --install

# Add patterns to detect
git secrets --add 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'
git secrets --add 'SUPABASE_SERVICE_ROLE_KEY.*=.*[A-Za-z0-9]'
git secrets --add '[Ss][Ee][Rr][Vv][Ii][Cc][Ee].*[Rr][Oo][Ll][Ee].*[Kk][Ee][Yy]'
```

- [ ] git-secrets installed
- [ ] Patterns added
- [ ] Test: Try to commit a fake secret (should be blocked)

### Set up pre-commit hook

Already created in `clean-git-history.sh` output, or manually:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Prevent committing secrets

if git diff --cached | grep -E 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'; then
  echo "❌ ERROR: Potential JWT token found!"
  exit 1
fi

if git diff --cached | grep -E 'SERVICE_ROLE_KEY.*=.*eyJ'; then
  echo "❌ ERROR: Supabase service role key found!"
  exit 1
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

- [ ] Pre-commit hook created
- [ ] Hook is executable
- [ ] Tested (try committing a fake secret)

---

## ✅ STEP 10: Document Incident (5 minutes)

Update `SECURITY_INCIDENT_RESPONSE.md`:

- [ ] Document when key was rotated
- [ ] Document when git history was cleaned
- [ ] Document when force push completed
- [ ] Document findings from access logs
- [ ] Document any suspicious activity
- [ ] Mark incident as RESOLVED

---

## 📋 Final Checklist

Before marking this incident as complete:

- [ ] ✅ Supabase key rotated
- [ ] ✅ Local .env files updated
- [ ] ✅ Git history cleaned
- [ ] ✅ Force push completed
- [ ] ✅ GitHub security alert dismissed/cleared
- [ ] ✅ New key works locally
- [ ] ✅ Checked for unauthorized access
- [ ] ✅ Production environment updated (if deployed)
- [ ] ✅ git-secrets installed
- [ ] ✅ Pre-commit hook installed
- [ ] ✅ Incident documented
- [ ] ✅ No suspicious activity found

---

## ⏱️ Timeline Template

**Fill this in as you go:**

- **12:00 PM** - GitHub alert received
- **____** - Started incident response
- **____** - Supabase key rotated
- **____** - Local .env files updated
- **____** - Git history cleaned
- **____** - Force push completed
- **______ - GitHub alert cleared
- **____** - Incident resolved

**Total time:** _______ minutes

---

## 🆘 If You Get Stuck

### Git history cleanup failed

**Solution:** Try the manual method or use GitHub's UI:
1. Delete the repository on GitHub
2. Create a new repository with the same name
3. Push cleaned history

### Force push rejected

**Solution:**
```bash
# Make sure you have permission
git remote -v

# Try again with force
git push origin main --force --no-verify
```

### API doesn't work with new key

**Solution:**
1. Double-check the key in .env file
2. Make sure you copied the full key from Supabase
3. Restart the API server
4. Check Supabase Dashboard that key is active

---

## ✅ INCIDENT RESOLVED

When all checkboxes above are complete:

- [ ] All steps completed successfully
- [ ] No unauthorized access detected
- [ ] New key works in all environments
- [ ] Prevention measures in place
- [ ] Team notified (if applicable)

**Status:** RESOLVED  
**Resolved at:** _______  
**Resolved by:** _______

---

**Remember:** If you have any collaborators, they must re-clone the repository after force push!

```bash
# Tell collaborators to run:
cd ..
rm -rf PayOS
git clone git@github.com:haxaco/payos.git
cd payos
# Then set up their .env files
```

