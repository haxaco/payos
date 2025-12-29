# PayOS Deployment Roadmap

**Status:** API Deployed ✅ | Frontends Pending ⏳

---

## 🎉 Completed

### ✅ API Deployment to Railway
- [x] Configure Railway with Nixpacks
- [x] Set up monorepo build from root
- [x] Implement proper health check with DB verification
- [x] Add scheduled transfer worker control (ENABLE_SCHEDULED_TRANSFERS)
- [x] Deploy to Railway with Node.js 20
- [x] Configure watch patterns for auto-deployment
- [x] Set up environment variables

**Railway URL:** *Check Railway dashboard for generated domain*

---

## 🚧 Phase 1: Database Schema & Worker (Priority: High)

### 📋 Task 1: Fix Database Schema
**Status:** Pending  
**Priority:** High  
**Estimated Time:** 1-2 hours

**Issue:**
- Scheduled transfer worker fails with: `column "balance" does not exist`
- Need to verify/add missing schema elements

**Steps:**
1. Review current database schema
2. Check if `balance` column exists in `accounts` table
3. Create migration if needed
4. Test in development environment
5. Apply migration to production

**Files to Check:**
- Database migration files
- `apps/api/src/services/balances.ts`
- Account-related types and schemas

---

### 🔄 Task 2: Test Scheduled Transfer Worker
**Status:** Pending  
**Priority:** Medium  
**Depends On:** Task 1 (Database Schema)  
**Estimated Time:** 2-3 hours

**Steps:**
1. Set `ENABLE_SCHEDULED_TRANSFERS=true` locally
2. Create test scheduled transfers in development DB
3. Verify worker processes them correctly
4. Test both mock mode and real mode
5. Verify error handling and retry logic
6. Check audit logs and transaction history

**Test Cases:**
- [ ] Worker starts without errors
- [ ] Scheduled transfers execute at correct time
- [ ] Failed transfers log errors properly
- [ ] Successful transfers update DB correctly
- [ ] Worker handles graceful shutdown

---

### 🚀 Task 3: Enable Worker in Production
**Status:** Pending  
**Priority:** Medium  
**Depends On:** Task 2 (Testing)  
**Estimated Time:** 15 minutes

**Steps:**
1. Go to Railway Dashboard → Variables
2. Add: `ENABLE_SCHEDULED_TRANSFERS=true`
3. Redeploy
4. Monitor logs for worker activity
5. Verify no errors in production

---

## 🎨 Phase 2: Frontend Deployments (Priority: High)

### 📱 Task 4: Deploy Main UI to Vercel
**Status:** Pending  
**Priority:** High  
**Estimated Time:** 30 minutes

**Component:** `payos-ui/` (Vite + React)

**Steps:**
1. Go to Vercel Dashboard
2. Import GitHub repository: `haxaco/payos`
3. Configure project:
   - **Framework:** Vite (auto-detected)
   - **Root Directory:** `payos-ui`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

4. Add environment variables:
   ```bash
   VITE_API_URL=https://YOUR-RAILWAY-URL.railway.app
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
   ```

5. Deploy
6. Get Vercel URL (e.g., `payos-ui.vercel.app`)

**Files to Check:**
- `payos-ui/vercel.json`
- `payos-ui/.env.example`
- Build configuration

---

### 🖥️ Task 5: Deploy Web Dashboard to Vercel
**Status:** Pending  
**Priority:** High  
**Estimated Time:** 30 minutes

**Component:** `apps/web/` (Next.js 15)

**Steps:**
1. Go to Vercel Dashboard
2. Import same GitHub repository
3. Configure project:
   - **Framework:** Next.js (auto-detected)
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `pnpm install`

4. Add environment variables:
   ```bash
   NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.railway.app
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
   ```

5. Deploy
6. Get Vercel URL (e.g., `payos-dashboard.vercel.app`)

**Files to Check:**
- `apps/web/vercel.json`
- `apps/web/.env.example`
- Next.js configuration

---

### 🔗 Task 6: Update CORS Origins
**Status:** Pending  
**Priority:** High  
**Depends On:** Tasks 4 & 5 (Frontend Deployments)  
**Estimated Time:** 5 minutes

**Steps:**
1. Get both Vercel URLs from Task 4 & 5
2. Go to Railway Dashboard → Variables
3. Update `CORS_ORIGINS`:
   ```bash
   CORS_ORIGINS=https://payos-ui.vercel.app,https://payos-dashboard.vercel.app
   ```
4. Redeploy Railway service
5. Test CORS from frontends

---

## ⚙️ Phase 3: CI/CD & Automation (Priority: Medium)

### 🔐 Task 7: Configure GitHub Secrets
**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 15 minutes

**GitHub Secrets to Add:**

```bash
# Vercel (if using GitHub Actions for deployment)
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID_UI=<main-ui-project-id>
VERCEL_PROJECT_ID_WEB=<dashboard-project-id>

# Railway (if using GitHub Actions)
RAILWAY_TOKEN=<your-railway-token>

# Supabase (for RLS checks)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-secret-key>
```

**Steps:**
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add each secret above
3. Update `.github/workflows/` files if needed
4. Test workflows

**Files to Check:**
- `.github/workflows/deploy-api.yml`
- `.github/workflows/deploy-ui.yml`
- `.github/workflows/deploy-web.yml`
- `.github/workflows/rls-check.yml`

---

## 🧪 Phase 4: Testing & Verification (Priority: High)

### ✅ Task 8: End-to-End Testing
**Status:** Pending  
**Priority:** High  
**Depends On:** All previous tasks  
**Estimated Time:** 1-2 hours

**Test Scenarios:**

#### 1. Basic Connectivity
- [ ] Frontend loads without errors
- [ ] API health check returns 200 OK
- [ ] Database queries work from API
- [ ] Authentication flow works end-to-end

#### 2. Core Features
- [ ] User can register and login
- [ ] Account creation works
- [ ] Transfer creation and execution
- [ ] Stream creation and monitoring
- [ ] Dashboard displays data correctly

#### 3. Scheduled Transfers (if enabled)
- [ ] Worker processes scheduled transfers
- [ ] Transfers execute at correct time
- [ ] Audit logs are created
- [ ] Error handling works

#### 4. Performance & Monitoring
- [ ] API response times are acceptable
- [ ] Frontend loads quickly
- [ ] No console errors in browser
- [ ] Railway logs show healthy operation
- [ ] Database queries are optimized

---

## 📊 Current Status Summary

| Component | Status | URL | Notes |
|-----------|--------|-----|-------|
| **API** | ✅ Deployed | Railway domain | Worker disabled |
| **Main UI** | ⏳ Pending | - | Ready to deploy |
| **Dashboard** | ⏳ Pending | - | Ready to deploy |
| **Database** | ⚠️ Schema Issue | Supabase | Missing `balance` column |
| **CI/CD** | ⏳ Pending | - | Workflows ready, needs secrets |

---

## 🎯 Quick Start Guide

### For Next Session:

1. **Fix Database Schema** (30 min)
   - Review schema
   - Add missing columns
   - Test migrations

2. **Deploy Frontends** (1 hour)
   - Main UI to Vercel
   - Dashboard to Vercel
   - Update CORS

3. **Test Everything** (1 hour)
   - End-to-end flows
   - Authentication
   - Core features

4. **Enable Worker** (15 min)
   - Only after schema is fixed
   - Only after testing

---

## 📝 Notes

- Keep `ENABLE_SCHEDULED_TRANSFERS=false` until database schema is fixed
- Monitor Railway logs during first deploys
- Test in staging/development before enabling features in production
- Document any issues or gotchas discovered

---

## 📞 Resources

- **Railway Dashboard:** https://railway.app
- **Vercel Dashboard:** https://vercel.com
- **Supabase Dashboard:** https://supabase.com
- **GitHub Repository:** https://github.com/haxaco/payos
- **Environment Variables Reference:** `RAILWAY_ENV_VARS.md`
- **Deployment Guides:** `docs/DEPLOYMENT_*.md`

