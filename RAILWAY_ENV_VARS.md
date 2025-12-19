# Railway Environment Variables for PayOS API

## ✅ **Required Variables**

### Supabase Configuration
```bash
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__
SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
```

### API Configuration
```bash
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0
```

---

## ⚙️ **Optional Feature Flags**

### Scheduled Transfer Worker
```bash
# Default: false (disabled)
# Only enable when your database schema is ready
ENABLE_SCHEDULED_TRANSFERS=false
```

**When to enable:**
- ✅ Database has all required columns (`balance`, etc.)
- ✅ You've tested scheduled transfers in staging
- ✅ You're ready for the worker to process real transfers

**When to disable (default):**
- ❌ During initial deployment
- ❌ Database schema is incomplete
- ❌ Testing healthchecks
- ❌ Troubleshooting deployment issues

### Scheduled Transfer Mock Mode
```bash
# Default: false (real mode in production)
# Only used when ENABLE_SCHEDULED_TRANSFERS=true
MOCK_SCHEDULED_TRANSFERS=false
```

**Real Mode** (`false`): Processes actual scheduled transfers from database  
**Mock Mode** (`true`): Simulates transfers for demo purposes

---

## 🌐 **CORS Configuration**

```bash
# Add your deployed frontend URLs (comma-separated, no spaces)
CORS_ORIGINS=https://payos-web.vercel.app
```

**Default:** Includes `http://localhost:*` and `https://payos-web.vercel.app`

**Note:** The app includes sensible defaults, so you only need to set this if you have additional custom domains.

---

## 🎯 **Current Railway Setup**

For your current deployment, use these settings:

```bash
# Required
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__
SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0

# Optional
ENABLE_SCHEDULED_TRANSFERS=false  # Disabled until schema is ready
# CORS_ORIGINS not needed - Vercel URL included by default
```

---

## 🔍 **Health Check**

The `/health` endpoint now verifies:
- ✅ API is running
- ✅ Database connectivity
- ✅ Returns `200 OK` if healthy
- ❌ Returns `503 Service Unavailable` if unhealthy

**Test it:**
```bash
curl https://your-railway-url.railway.app/health
```

**Healthy response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-19T20:30:00.000Z",
  "version": "0.1.0",
  "checks": {
    "api": "running",
    "database": "connected"
  }
}
```

**Unhealthy response (503):**
```json
{
  "status": "unhealthy",
  "error": "Database connection failed",
  "timestamp": "2025-12-19T20:30:00.000Z",
  "version": "0.1.0"
}
```

---

## 📝 **Notes**

- All environment variables are set in Railway Dashboard → Service → Variables
- Changes to env vars require a redeploy
- The health check runs automatically during deployment
- Worker is disabled by default for safety

