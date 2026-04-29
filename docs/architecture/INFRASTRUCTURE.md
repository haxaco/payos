# PayOS Infrastructure Documentation

**Version:** 1.0  
**Last Updated:** December 19, 2025  
**Status:** Production Deployed ✅

---

## 🏗️ Architecture Overview

PayOS is deployed as a modern cloud-native application with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──────────────────────┬─────────────────┐
                     │                      │                 │
              ┌──────▼──────┐        ┌─────▼─────┐    ┌─────▼─────┐
              │   Vercel    │        │  Railway  │    │ Supabase  │
              │  Dashboard  │◄───────┤    API    │◄───┤ Database  │
              │  (Next.js)  │  CORS  │   (Hono)  │    │(Postgres) │
              └─────────────┘        └───────────┘    └───────────┘
                                           │
                                           │
                                     ┌─────▼─────┐
                                     │  GitHub   │
                                     │  Actions  │
                                     │   (CI/CD) │
                                     └───────────┘
```

---

## 🌐 Production URLs

| Component | URL | Status |
|-----------|-----|--------|
| **Dashboard** | https://payos-web.vercel.app | ✅ Live |
| **API** | https://payos-production.up.railway.app | ✅ Live |
| **Database** | https://YOUR_PROJECT.supabase.co | ✅ Live |
| **Repository** | https://github.com/Sly-devs/sly | ✅ Active |

---

## 🚀 Deployment Platforms

### 1. Vercel (Dashboard - Next.js)

**Service:** Web Dashboard  
**Framework:** Next.js 15  
**URL:** https://payos-web.vercel.app

**Configuration:**
- Auto-deploys from `main` branch
- Environment variables configured via Vercel Dashboard
- Build command: `pnpm build` (from monorepo root)
- Output directory: `apps/web/.next`
- Node.js version: 20 LTS

**Environment Variables:**
```bash
NEXT_PUBLIC_API_URL=https://payos-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
```

**Documentation:** [VERCEL_ENV_VARS.md](../VERCEL_ENV_VARS.md)

---

### 2. Railway (API - Hono)

**Service:** REST API  
**Framework:** Hono (Node.js)  
**URL:** https://payos-production.up.railway.app

**Configuration:**
- Auto-deploys from `main` branch via GitHub integration
- Builder: Nixpacks
- Start command: `node apps/api/dist/index.js`
- Health check: `/health` endpoint
- Port: Auto-assigned via `PORT` env var

**Build Process:**
1. Install Node.js 20
2. Install pnpm 9.14.2
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Build packages: `@sly/types`, `@sly/utils`, `@sly/api`
5. Start server

**Environment Variables:**
```bash
# Required
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SECRET_KEY
SUPABASE_ANON_KEY=sb_publishable_YOUR_ANON_KEY
NODE_ENV=production

# Optional
ENABLE_SCHEDULED_TRANSFERS=false  # Disabled until schema ready
```

**Documentation:** 
- [RAILWAY_ENV_VARS.md](../RAILWAY_ENV_VARS.md)
- [RAILWAY_FIX_ENV_VARS.md](../RAILWAY_FIX_ENV_VARS.md)
- [RAILWAY_CONTAINER_STOPPING_FIX.md](../RAILWAY_CONTAINER_STOPPING_FIX.md)

---

### 3. Supabase (Database - PostgreSQL)

**Service:** Database & Authentication  
**Database:** PostgreSQL 15  
**URL:** https://YOUR_PROJECT.supabase.co

**Features Used:**
- PostgreSQL database with Row-Level Security (RLS)
- Authentication (email/password, JWT tokens)
- Realtime subscriptions (not yet implemented)
- Edge Functions (not yet used)

**Security:**
- All tables have RLS policies enabled
- Service role key used by API server (bypasses RLS)
- Publishable key used by dashboard (respects RLS)
- Secret key for admin operations

**Key Management:**
- Legacy keys: `anon` (JWT), `service_role` (JWT)
- New keys: `sb_publishable_*`, `sb_secret_*` (recommended)

**Documentation:** [security/RLS_STRATEGY.md](security/RLS_STRATEGY.md)

---

### 4. GitHub Actions (CI/CD)

**Workflows:**
- **RLS Check** - Validates Row-Level Security policies on PRs
- **Deploy API** - Placeholder for Railway deployment
- **Deploy Dashboard** - Placeholder for Vercel deployment

**Current Status:**
- RLS check: ✅ Active
- Auto-deployment: Manual (via platform integrations)

**Future:**
- Automated testing on PRs
- Deployment previews
- Performance benchmarks

---

## 🔒 Security

### Authentication Flow

```
User Login (Dashboard)
    ↓
Supabase Auth (JWT token)
    ↓
Dashboard stores token
    ↓
API calls include: Authorization: Bearer <JWT>
    ↓
API validates JWT with Supabase
    ↓
RLS policies enforce tenant isolation
```

### API Key Flow

```
User generates API key (pk_test_* or pk_live_*)
    ↓
Stored as hash in database
    ↓
API calls include: Authorization: Bearer <API_KEY>
    ↓
API validates key hash
    ↓
RLS policies enforce tenant isolation
```

### CORS Configuration

**Allowed Origins:**
- `http://localhost:3000` (development)
- `http://localhost:5173` (development)
- `http://localhost:3001` (development)
- `https://payos-web.vercel.app` (production)

**Allowed Methods:** GET, POST, PATCH, DELETE, OPTIONS  
**Credentials:** Enabled (cookies, auth headers)

---

## 📊 Monitoring & Health Checks

### API Health Check

**Endpoint:** `GET /health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-19T21:51:40.176Z",
  "version": "0.1.0",
  "checks": {
    "api": "running",
    "database": "connected"
  }
}
```

**Response (Unhealthy - 503):**
```json
{
  "status": "unhealthy",
  "error": "Database connection failed",
  "timestamp": "2025-12-19T21:51:40.176Z",
  "version": "0.1.0"
}
```

### Railway Monitoring

- Health check runs every 30 seconds
- Timeout: 300 seconds
- Restart policy: ON_FAILURE (max 10 retries)
- Logs available in Railway Dashboard

### Rate Limiting

- **Current Limit:** 1000 requests/minute per IP + API key
- **Strict Limit:** 30 requests/minute (sensitive operations)
- **Auth Limit:** 10 requests/minute (login attempts)

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait (on 429 error)

---

## 🛠️ Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start API (localhost:4000)
cd apps/api && pnpm dev

# Start Dashboard (localhost:3000)
cd apps/web && pnpm dev

# Run database migrations
cd apps/api && pnpm db:migrate

# Seed database
cd apps/api && pnpm seed:all
```

### Deployment Process

**API (Railway):**
1. Push to `main` branch
2. Railway auto-detects changes
3. Builds via Nixpacks
4. Deploys with health check
5. ~2-3 minutes total

**Dashboard (Vercel):**
1. Push to `main` branch
2. Vercel auto-detects changes
3. Builds Next.js app
4. Deploys to edge network
5. ~1-2 minutes total

### Environment Variables

**Never commit:**
- `.env` files
- API keys
- Database credentials
- JWT secrets

**Use instead:**
- Railway Dashboard → Variables
- Vercel Dashboard → Environment Variables
- GitHub Secrets (for CI/CD)

---

## 📈 Performance

### Current Metrics

| Metric | Value |
|--------|-------|
| API Response Time | <100ms (p50) |
| Dashboard Load Time | <2s (initial) |
| Database Queries | <50ms (p95) |
| Rate Limit | 1000 req/min |

### Optimization Status

**Completed:**
- ✅ Rate limit increased (500 → 1000/min)
- ✅ CORS optimized
- ✅ Health checks with DB connectivity

**In Progress (Epic 23):**
- 🔄 React Query caching
- 🔄 Server-side filtering
- 🔄 Lazy loading tabs
- 🔄 Request deduplication

---

## 🐛 Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway (Railway)
**Symptom:** API returns 502 errors  
**Causes:**
- App not listening on correct port
- Health check failing
- Container crashed

**Fix:** Check Railway logs, verify `PORT` env var

**Documentation:** [RAILWAY_CONTAINER_STOPPING_FIX.md](../RAILWAY_CONTAINER_STOPPING_FIX.md)

---

#### 2. CORS Errors (Dashboard)
**Symptom:** "No 'Access-Control-Allow-Origin' header"  
**Causes:**
- Vercel URL not in CORS whitelist
- API not running

**Fix:** Verify CORS origins in API code

---

#### 3. 429 Rate Limit Errors
**Symptom:** "Too many requests"  
**Causes:**
- Inefficient data fetching
- Multiple parallel requests
- No caching

**Fix:** Implement optimizations from Epic 23

**Documentation:** [DASHBOARD_429_RATE_LIMIT_FIX.md](../DASHBOARD_429_RATE_LIMIT_FIX.md)

---

#### 4. Database Connection Failed
**Symptom:** Health check returns 503  
**Causes:**
- Invalid Supabase credentials
- Network issues
- Supabase maintenance

**Fix:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

## 📚 Related Documentation

### Deployment Guides
- [DEPLOY_NOW.md](../DEPLOY_NOW.md) - Quick deployment guide
- [DEPLOYMENT_QUICK_START.md](../DEPLOYMENT_QUICK_START.md) - Detailed setup
- [DEPLOYMENT_STATUS_AND_NEXT_STEPS.md](../DEPLOYMENT_STATUS_AND_NEXT_STEPS.md) - Current status

### Configuration
- [VERCEL_ENV_VARS.md](../VERCEL_ENV_VARS.md) - Vercel environment variables
- [RAILWAY_ENV_VARS.md](../RAILWAY_ENV_VARS.md) - Railway environment variables
- [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - Complete reference

### Troubleshooting
- [RAILWAY_CONTAINER_STOPPING_FIX.md](../RAILWAY_CONTAINER_STOPPING_FIX.md) - Container issues
- [RAILWAY_FIX_ENV_VARS.md](../RAILWAY_FIX_ENV_VARS.md) - Environment cleanup
- [DASHBOARD_429_RATE_LIMIT_FIX.md](../DASHBOARD_429_RATE_LIMIT_FIX.md) - Rate limit optimization

### Security
- [SECURITY_INCIDENT_RESPONSE.md](../SECURITY_INCIDENT_RESPONSE.md) - Security procedures
- [QUICK_FIX.md](../QUICK_FIX.md) - Security quick fixes
- [security/RLS_STRATEGY.md](security/RLS_STRATEGY.md) - Row-Level Security

---

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Review Railway logs for errors
- Check rate limit metrics
- Monitor database performance
- Review Supabase advisors

**Monthly:**
- Update dependencies
- Review and rotate API keys
- Audit RLS policies
- Performance optimization review

**As Needed:**
- Scale Railway resources
- Optimize database queries
- Update CORS origins
- Rotate secrets

---

## 🎯 Future Improvements

**Planned:**
- [ ] Add Redis for caching
- [ ] Implement CDN for static assets
- [ ] Add APM (Application Performance Monitoring)
- [ ] Set up error tracking (Sentry)
- [ ] Add database read replicas
- [ ] Implement blue-green deployments
- [ ] Add automated backups
- [ ] Set up staging environment

---

**For questions or issues, refer to the troubleshooting guides or check Railway/Vercel logs.**

