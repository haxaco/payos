# PayOS Deployment Preparation Guide

**Last Updated:** December 19, 2025  
**Status:** Pre-Deployment Checklist

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Variables](#environment-variables)
5. [Deployment Targets](#deployment-targets)
6. [Step-by-Step Deployment](#step-by-step-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Plan](#rollback-plan)

---

## Overview

PayOS is a monorepo application with three deployable components:

| Component | Technology | Port (Dev) | Deployment Target |
|-----------|-----------|------------|-------------------|
| API Server | Hono + Node.js | 4000 | Railway, Render, Fly.io, or AWS |
| Web Dashboard | Next.js 15 | 3000 | Vercel (recommended) |
| Main UI | Vite + React | 3001 | Vercel, Netlify, or Cloudflare Pages |

**Database:** Supabase (already hosted)

---

## Architecture

```
┌─────────────────┐
│   Users/Clients │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌─▼────────┐
│ Web UI │ │ Main UI  │
│(Next)  │ │ (Vite)   │
└───┬────┘ └─┬────────┘
    │        │
    └────┬───┘
         │
    ┌────▼─────┐
    │ API      │
    │ (Hono)   │
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Supabase │
    │ Database │
    └──────────┘
```

---

## Pre-Deployment Checklist

### 🔍 Code Quality

- [ ] **All tests passing**
  ```bash
  pnpm test
  pnpm test:integration
  ```

- [ ] **No linter errors**
  ```bash
  pnpm lint
  pnpm typecheck
  ```

- [ ] **Build succeeds locally**
  ```bash
  pnpm build
  ```

- [ ] **Dependencies updated and secured**
  ```bash
  pnpm audit
  pnpm outdated
  ```

### 🗄️ Database

- [ ] **All migrations applied to production Supabase**
  ```bash
  cd apps/api
  supabase db push
  ```

- [ ] **RLS policies verified and enabled**
  ```bash
  pnpm tsx scripts/check-rls-in-migrations.ts
  ```

- [ ] **Production seed data prepared** (if needed)
  ```bash
  # Review and customize seed scripts for production
  pnpm tsx scripts/seed-database.ts
  ```

- [ ] **Database backups configured** in Supabase Dashboard

### 🔐 Security

- [ ] **API keys rotated** (if using demo keys)
- [ ] **Service role key secured** (not exposed to frontend)
- [ ] **CORS origins configured** for production domains
- [ ] **Rate limiting enabled** (optional: configure Redis)
- [ ] **Environment secrets stored securely** (in deployment platform)
- [ ] **Supabase Auth configured** (email templates, redirects)

### 📝 Documentation

- [ ] **API documentation updated**
- [ ] **Environment variables documented** (see below)
- [ ] **Deployment runbook created** (this document)
- [ ] **Incident response plan prepared**

### 🔧 Configuration Files

- [ ] **Create `.env.example` files** (see below)
- [ ] **Create deployment configs** (see below)
- [ ] **Configure build settings** for each platform
- [ ] **Set up monitoring** (optional: Sentry, LogRocket)

---

## Environment Variables

### 🔴 API Server (`apps/api`)

**Required:**

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # CRITICAL: Keep secret!
SUPABASE_ANON_KEY=eyJhbG...  # For RLS-compliant operations

# API Configuration
API_PORT=4000  # Or dynamic: process.env.PORT
API_HOST=0.0.0.0
NODE_ENV=production

# CORS (Critical for production!)
CORS_ORIGINS=https://your-web-app.vercel.app,https://your-main-ui.vercel.app

# Dashboard URL (for emails, redirects)
DASHBOARD_URL=https://your-main-ui.vercel.app
```

**Optional but Recommended:**

```bash
# Rate Limiting (recommended for production)
REDIS_URL=redis://default:password@redis-server:6379

# Email (for invites, notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
SMTP_FROM=noreply@payos.dev

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# External Services (if used)
CIRCLE_API_KEY=
CIRCLE_API_URL=https://api.circle.com

# Superfluid (if using streaming payments)
SUPERFLUID_HOST_ADDRESS=0x...
SUPERFLUID_USDC_ADDRESS=0x...
SUPERFLUID_USDCX_ADDRESS=0x...

# Scheduled Transfer Worker
MOCK_SCHEDULED_TRANSFERS=false  # Set to true for testing
```

### 🟢 Next.js Web Dashboard (`apps/web`)

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://your-api.railway.app

# Supabase (for client-side auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-web-app.vercel.app
```

### 🔵 Main UI - Vite/React (`payos-ui`)

```bash
# API Connection
VITE_API_URL=https://your-api.railway.app

# Supabase (for client-side auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Optional: Analytics
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## Deployment Targets

### Option 1: Vercel (Recommended for Frontend)

**Best for:** Next.js apps, Vite/React apps  
**Pros:** Zero-config deployments, automatic HTTPS, edge network, great DX  
**Cons:** API/backend requires serverless functions (not ideal for Hono)

**Use for:**
- ✅ `apps/web` (Next.js)
- ✅ `payos-ui` (Vite/React)
- ❌ `apps/api` (use Railway/Render instead)

### Option 2: Railway (Recommended for API)

**Best for:** Node.js API servers, long-running processes  
**Pros:** Simple deployment, built-in PostgreSQL/Redis, great for Hono  
**Cons:** Costs scale with usage

**Use for:**
- ✅ `apps/api` (Hono server)

### Option 3: Render

**Best for:** Full-stack apps, APIs, cron jobs  
**Pros:** Free tier available, simple setup, good for MVP  
**Cons:** Free tier has cold starts

**Use for:**
- ✅ `apps/api` (alternative to Railway)
- ✅ `payos-ui` (alternative to Vercel)

### Option 4: Fly.io

**Best for:** Global deployment, edge computing  
**Pros:** Multiple regions, good for low-latency APIs  
**Cons:** More complex configuration

**Use for:**
- ✅ `apps/api` (for global deployment)

### Option 5: AWS/GCP/Azure

**Best for:** Enterprise deployments, custom infrastructure  
**Pros:** Full control, scalable, enterprise features  
**Cons:** Complex setup, higher maintenance

**Use for:**
- ✅ All components (production/enterprise)

---

## Step-by-Step Deployment

### Phase 1: Deploy API Server (Railway)

#### 1. Create Railway Project

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/haxaco/Dev/PayOS/apps/api
railway init
```

#### 2. Configure Build Settings

Create `railway.json` in `apps/api/`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install && pnpm --filter @sly/api build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create `nixpacks.toml` in `apps/api/`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = ["cd ../.. && pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["cd ../.. && pnpm --filter @sly/types build", "cd ../.. && pnpm --filter @sly/utils build", "pnpm build"]

[start]
cmd = "node dist/index.js"
```

#### 3. Set Environment Variables

In Railway Dashboard, add all API environment variables (see above).

**Critical Variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `NODE_ENV=production`
- `CORS_ORIGINS` (with your frontend URLs)

#### 4. Deploy

```bash
railway up
```

#### 5. Get Deployment URL

```bash
railway domain
# Example: https://payos-api-production.up.railway.app
```

#### 6. Test API

```bash
curl https://your-api.railway.app/health

# Test authenticated endpoint
curl -H "Authorization: Bearer pk_test_demo_fintech_key_12345" \
  https://your-api.railway.app/v1/accounts
```

---

### Phase 2: Deploy Main UI (Vercel)

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Create `vercel.json` in `payos-ui/`

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_SUPABASE_URL": "@vite_supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
  }
}
```

#### 3. Deploy to Vercel

```bash
cd /Users/haxaco/Dev/PayOS/payos-ui
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? (Select your account)
- Link to existing project? **N**
- Project name: `payos-ui`
- Directory: `./`
- Override settings? **N**

#### 4. Set Environment Variables

```bash
# Via CLI
vercel env add VITE_API_URL production
# Enter: https://your-api.railway.app

vercel env add VITE_SUPABASE_URL production
# Enter: https://your-project.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Enter: your_anon_key
```

Or via Vercel Dashboard: **Project Settings → Environment Variables**

#### 5. Deploy to Production

```bash
vercel --prod
```

#### 6. Get Production URL

```bash
# Example: https://payos-ui.vercel.app
```

---

### Phase 3: Deploy Next.js Web Dashboard (Vercel)

#### 1. Create `vercel.json` in `apps/web/`

```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@sly/web",
  "outputDirectory": ".next",
  "devCommand": "pnpm dev",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@next_public_api_url",
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key"
  }
}
```

#### 2. Configure Build Settings

In `apps/web/package.json`, ensure build script exists:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

#### 3. Deploy to Vercel

```bash
cd /Users/haxaco/Dev/PayOS/apps/web
vercel
```

#### 4. Set Environment Variables

Same as Phase 2, but with `NEXT_PUBLIC_*` prefix.

#### 5. Deploy to Production

```bash
vercel --prod
```

---

### Phase 4: Update CORS Settings

After deploying frontends, update API CORS configuration:

**In Railway Dashboard (API):**

```
CORS_ORIGINS=https://payos-ui.vercel.app,https://payos-web.vercel.app
```

Or update in code (`apps/api/src/app.ts`):

```typescript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://payos-ui.vercel.app',
  'https://payos-web.vercel.app',
];
```

Redeploy API:

```bash
railway up
```

---

## Post-Deployment Verification

### ✅ API Health Check

```bash
curl https://your-api.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T12:00:00.000Z"
}
```

### ✅ API Authentication

```bash
curl -H "Authorization: Bearer pk_test_demo_fintech_key_12345" \
  https://your-api.railway.app/v1/accounts
```

**Expected:** List of accounts (not 401 error)

### ✅ Frontend Loads

1. Visit `https://payos-ui.vercel.app`
2. Check browser console for errors
3. Verify API connection (Network tab)

### ✅ Authentication Flow

1. Navigate to login page
2. Login with test credentials:
   - Email: `beta@example.com`
   - Password: `Password123!`
3. Verify dashboard loads
4. Check API calls succeed (Network tab)

### ✅ Database Connectivity

1. Login to application
2. Navigate to Accounts page
3. Verify data loads from Supabase
4. Test create/update operations

### ✅ Scheduled Workers (API)

Check Railway logs for:
```
⚙️  Scheduled Transfers: REAL MODE
```

Verify scheduled transfer processing is running.

### ✅ CORS Configuration

Open browser console on frontend, make API call:
- **If CORS error:** Update `CORS_ORIGINS` in Railway
- **If successful:** CORS configured correctly

---

## Monitoring & Logging

### Railway (API)

```bash
# View logs
railway logs

# View specific service
railway logs --service api
```

**Set up alerts:**
- Go to Railway Dashboard → Settings → Notifications
- Configure alerts for:
  - High CPU usage (>80%)
  - High memory usage (>80%)
  - Error rate spikes
  - Deployment failures

### Vercel (Frontend)

```bash
# View logs
vercel logs

# View production logs
vercel logs --prod
```

**Set up monitoring:**
- Go to Vercel Dashboard → Analytics
- Enable Web Analytics
- Monitor:
  - Page load times
  - Error rates
  - Traffic patterns

### Supabase (Database)

- Go to Supabase Dashboard → Logs
- Monitor:
  - API logs
  - Database logs
  - Auth logs
- Set up log retention (7-30 days recommended)

### Optional: Set Up Sentry

```bash
# Install Sentry
pnpm add @sentry/node --filter @sly/api
pnpm add @sentry/react --filter payos-ui
```

Configure in API (`apps/api/src/index.ts`):

```typescript
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
```

Configure in UI (`payos-ui/src/main.tsx`):

```typescript
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}
```

---

## Rollback Plan

### API Server (Railway)

**Quick Rollback:**
```bash
railway logs  # Find last stable deployment
railway deploy --rollback
```

**Via Dashboard:**
1. Go to Railway Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → Redeploy

**Database Rollback:**
```bash
# If migration caused issue
cd apps/api
supabase db reset  # CAUTION: This wipes data!

# Better: Revert specific migration
supabase migration repair <migration_version>
```

### Frontend (Vercel)

**Quick Rollback:**
```bash
vercel rollback
```

**Via Dashboard:**
1. Go to Vercel Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → Promote to Production

### Emergency Procedures

1. **API Down:**
   - Rollback API deployment
   - Check Railway logs for errors
   - Verify Supabase connectivity
   - Check environment variables

2. **Frontend Down:**
   - Rollback frontend deployment
   - Check browser console for errors
   - Verify API URL is correct
   - Check CORS configuration

3. **Database Issues:**
   - Check Supabase Dashboard → Logs
   - Verify RLS policies
   - Check for missing migrations
   - Restore from backup if needed

4. **Communication:**
   - Post status update (status page or social media)
   - Notify affected users via email
   - Update incident log
   - Conduct post-mortem after resolution

---

## Performance Optimization

### API Server

1. **Enable Compression:**

```typescript
// apps/api/src/app.ts
import { compress } from 'hono/compress';

app.use('*', compress());
```

2. **Add Caching:**

```typescript
// Cache frequently accessed data
import { cache } from 'hono/cache';

app.get('/v1/accounts', cache({ cacheName: 'accounts', cacheControl: 'max-age=300' }), async (c) => {
  // ...
});
```

3. **Database Connection Pooling:**

Already configured in Supabase client, but verify:

```typescript
// apps/api/src/db/client.ts
export function createClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'public' },
      auth: { persistSession: false },
      global: { headers: { 'x-client-info': 'payos-api' } },
    }
  );
}
```

### Frontend

1. **Enable React Query Caching:**

Already configured in `payos-ui`, verify settings:

```typescript
// payos-ui/src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

2. **Code Splitting:**

Vite handles this automatically, but you can add manual splits:

```typescript
// Lazy load pages
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
```

3. **Image Optimization:**

```bash
# Install image optimization plugin
pnpm add vite-plugin-imagemin --filter payos-ui
```

---

## Security Hardening

### Production Checklist

- [ ] **Rotate all demo/test API keys**
- [ ] **Enable HTTPS only** (automatic on Vercel/Railway)
- [ ] **Set secure headers:**

```typescript
// apps/api/src/app.ts
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  await next();
});
```

- [ ] **Enable rate limiting:**

```typescript
// apps/api/src/middleware/rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter';

app.use('/v1/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
}));
```

- [ ] **Configure Supabase Auth:**
  - Email verification required
  - Password strength requirements
  - Session timeout (default: 7 days)
  - Multi-factor authentication (optional)

- [ ] **Review RLS policies:**

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
```

- [ ] **Set up database backups:**
  - Go to Supabase Dashboard → Database → Backups
  - Enable daily automated backups
  - Test restore procedure

---

## CI/CD Setup (Optional)

### GitHub Actions for API

Create `.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API to Railway

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm i -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --service api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### GitHub Actions for Frontend

Create `.github/workflows/deploy-ui.yml`:

```yaml
name: Deploy UI to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'payos-ui/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./payos-ui
```

---

## Cost Estimation

### Railway (API)

| Tier | Price | Resources |
|------|-------|-----------|
| Free | $0/mo | Limited hours |
| Hobby | $5/mo | 500 hours, 512MB RAM, 1GB disk |
| Pro | $20/mo | Unlimited, 8GB RAM, 100GB disk |

**Estimated for MVP:** $5-20/month

### Vercel (Frontend)

| Tier | Price | Resources |
|------|-------|-----------|
| Hobby | $0/mo | 100GB bandwidth, unlimited requests |
| Pro | $20/mo | 1TB bandwidth, team features |

**Estimated for MVP:** $0-20/month

### Supabase (Database)

| Tier | Price | Resources |
|------|-------|-----------|
| Free | $0/mo | 500MB database, 5GB bandwidth |
| Pro | $25/mo | 8GB database, 250GB bandwidth |

**Estimated for MVP:** $0-25/month

### Total Monthly Cost

**MVP/Development:** $5-45/month  
**Production (Small):** $45-100/month  
**Production (Medium):** $100-500/month

---

## Support & Resources

### Documentation

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Hono Docs](https://hono.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [Vite Docs](https://vitejs.dev)

### Community

- [Railway Discord](https://discord.gg/railway)
- [Vercel Discord](https://discord.gg/vercel)
- [Supabase Discord](https://discord.supabase.com)

### Monitoring Tools

- [Railway Dashboard](https://railway.app/dashboard)
- [Vercel Analytics](https://vercel.com/analytics)
- [Supabase Dashboard](https://app.supabase.com)
- [Sentry](https://sentry.io) (optional)
- [LogRocket](https://logrocket.com) (optional)

---

## Next Steps

1. **Review this guide** and ensure you understand each step
2. **Complete Pre-Deployment Checklist** (see above)
3. **Set up deployment accounts:**
   - Railway account
   - Vercel account
   - Supabase production project (if separate from dev)
4. **Create `.env.example` files** for each component
5. **Deploy API first** (Phase 1)
6. **Deploy frontends** (Phases 2-3)
7. **Configure CORS** (Phase 4)
8. **Verify deployment** (Post-Deployment Verification)
9. **Set up monitoring** (Monitoring & Logging)
10. **Document any issues** and update this guide

---

## Questions or Issues?

If you encounter problems during deployment:

1. **Check logs first:**
   - Railway: `railway logs`
   - Vercel: `vercel logs`
   - Supabase: Dashboard → Logs

2. **Verify environment variables** are set correctly

3. **Review CORS configuration** if API calls fail

4. **Check database migrations** are applied

5. **Consult deployment status** in respective dashboards

6. **Refer to rollback plan** if needed

---

**Last Updated:** December 19, 2025  
**Maintained by:** PayOS Team  
**Version:** 1.0.0

