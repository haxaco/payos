# PayOS Environment Variables Guide

**Complete reference for all environment variables across all applications.**

---

## 📋 Overview

PayOS uses environment variables to configure:
- Database connections (Supabase)
- API server settings
- CORS and security
- External services
- Feature flags

**Security Note:** Never commit `.env` files to git. Use `.env.example` as templates.

---

## 🔴 API Server (`apps/api`)

### Required Variables

These variables **must** be set for the API to function:

```bash
# Database Connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Server Configuration
NODE_ENV=development              # Values: development, production, test
API_PORT=4000                     # Port to run server on
API_HOST=0.0.0.0                  # Host to bind to (0.0.0.0 for all interfaces)

# CORS (Critical for production!)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Where to find Supabase credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **URL:** `SUPABASE_URL`
   - **anon/public key:** `SUPABASE_ANON_KEY`
   - **service_role key:** `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

### Optional Variables

These enhance functionality but aren't required:

```bash
# Dashboard URL (for email links, OAuth redirects)
DASHBOARD_URL=http://localhost:3001

# Scheduled Transfer Worker
MOCK_SCHEDULED_TRANSFERS=true     # true = mock mode, false = real mode

# Rate Limiting (recommended for production)
REDIS_URL=redis://default:password@localhost:6379

# Email (for invites, notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
SMTP_FROM=noreply@payos.dev

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# External Payment Services (Circle)
CIRCLE_API_KEY=
CIRCLE_API_URL=https://api-sandbox.circle.com

# Superfluid (Base Sepolia Streaming Payments)
SUPERFLUID_HOST_ADDRESS=0x...
SUPERFLUID_USDC_ADDRESS=0x...
SUPERFLUID_USDCX_ADDRESS=0x...
```

### Production-Specific

Additional variables for production environments:

```bash
# Production settings
NODE_ENV=production
API_HOST=0.0.0.0
MOCK_SCHEDULED_TRANSFERS=false

# Production CORS (replace with your domains)
CORS_ORIGINS=https://app.payos.dev,https://dashboard.payos.dev

# Production Dashboard URL
DASHBOARD_URL=https://app.payos.dev

# Redis (recommended for production rate limiting)
REDIS_URL=redis://default:xxx@redis-server.railway.internal:6379
```

---

## 🔵 Main UI - Vite/React (`payos-ui`)

### Required Variables

```bash
# API Connection
VITE_API_URL=http://localhost:4000

# Supabase (for client-side auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** 
- Only use `VITE_` prefix for Vite/React apps
- Never use `SUPABASE_SERVICE_ROLE_KEY` in frontend (security risk!)
- Frontend only needs `SUPABASE_ANON_KEY`

### Optional Variables

```bash
# Analytics
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# Monitoring
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Feature Flags
VITE_ENABLE_BETA_FEATURES=false
```

### Production-Specific

```bash
# Production API URL (from Railway)
VITE_API_URL=https://payos-api-production.up.railway.app

# Production Supabase
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

---

## 🟢 Web Dashboard - Next.js (`apps/web`)

### Required Variables

```bash
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:4000

# Supabase (for client-side auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** 
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Variables without `NEXT_PUBLIC_` are server-side only
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in Next.js public env

### Optional Variables

```bash
# Analytics
NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXXXXXX

# Monitoring (server-side)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# Feature Flags
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

### Production-Specific

```bash
# Production URLs
NEXT_PUBLIC_API_URL=https://payos-api-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://payos-web.vercel.app
```

---

## 🛠️ Setting Environment Variables

### Local Development

#### Option 1: Create `.env` files manually

Create `.env` in each app directory:

**API:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/api
touch .env
# Edit with your values
```

**Main UI:**
```bash
cd /Users/haxaco/Dev/PayOS/payos-ui
touch .env
# Edit with your values
```

**Web Dashboard:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/web
touch .env.local  # Next.js uses .env.local
# Edit with your values
```

#### Option 2: Use provided templates

Copy the `.env.example` templates (when created):

```bash
# API
cp apps/api/.env.example apps/api/.env

# Main UI
cp payos-ui/.env.example payos-ui/.env

# Web Dashboard
cp apps/web/.env.example apps/web/.env.local
```

Then edit each file with your actual values.

### Railway (Production API)

Two methods:

#### Via Dashboard:
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add each variable and value

#### Via CLI:
```bash
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set NODE_ENV=production
# etc.
```

### Vercel (Production Frontend)

Two methods:

#### Via Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add each variable for Production, Preview, and Development

#### Via CLI:
```bash
vercel env add VITE_API_URL production
# Follow prompts to enter value

# Or use echo
echo "https://your-api.railway.app" | vercel env add VITE_API_URL production
```

---

## 🔒 Security Best Practices

### ✅ DO

- **Store secrets in environment variables**, not in code
- **Use different keys for development and production**
- **Add `.env` files to `.gitignore`**
- **Use service role key only on backend**
- **Rotate keys regularly** (every 90 days recommended)
- **Use least-privilege keys** when possible
- **Document required variables** in `.env.example`
- **Validate environment variables** on app startup

### ❌ DON'T

- **Never commit `.env` files** to git
- **Never expose service role key** in frontend
- **Never hardcode secrets** in code
- **Never share production keys** in public channels
- **Never use production keys locally** (use separate dev keys)
- **Never log sensitive variables** (API keys, passwords)

---

## 🧪 Validating Environment Variables

### API Server Validation

The API validates required variables on startup:

```typescript
// apps/api/src/db/client.ts
export function createClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  // ...
}
```

If you see this error, check your `.env` file.

### Frontend Validation

Add validation to catch issues early:

```typescript
// payos-ui/src/main.tsx
const requiredEnvVars = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  // Show user-friendly error
}
```

---

## 🔍 Troubleshooting

### "Missing Supabase environment variables"

**Cause:** API can't find `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`

**Solution:**
1. Check `.env` file exists in `apps/api/`
2. Verify variables are set correctly (no typos)
3. Restart the API server
4. Check for extra spaces or quotes in `.env`

### "CORS error" in browser console

**Cause:** Frontend domain not in API's `CORS_ORIGINS`

**Solution:**
1. Update `CORS_ORIGINS` in API `.env`:
   ```bash
   CORS_ORIGINS=http://localhost:3001,https://your-frontend.vercel.app
   ```
2. Restart API server

### "Unauthorized" or "Invalid API key"

**Cause:** Wrong Supabase keys or API authentication issue

**Solution:**
1. Verify Supabase keys are correct
2. Check you're using the right project
3. Ensure keys aren't expired or revoked
4. Try regenerating anon key in Supabase dashboard

### Vite not picking up environment variables

**Cause:** Vite only exposes variables with `VITE_` prefix

**Solution:**
1. Ensure variable name starts with `VITE_`
2. Restart dev server (`pnpm dev`)
3. Check `import.meta.env.VITE_YOUR_VAR` in code

### Next.js not picking up environment variables

**Cause:** Variables need `NEXT_PUBLIC_` prefix for client-side

**Solution:**
1. Add `NEXT_PUBLIC_` prefix for client-side variables
2. Server-side variables don't need prefix
3. Restart dev server
4. Check `process.env.NEXT_PUBLIC_YOUR_VAR` in code

---

## 📚 Reference Table

### Quick Reference

| App | File | Client Vars Prefix | Example |
|-----|------|-------------------|---------|
| API | `.env` | N/A (server-only) | `SUPABASE_URL` |
| Vite UI | `.env` | `VITE_` | `VITE_API_URL` |
| Next.js | `.env.local` | `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |

### Variable Categories

| Category | Variables | Required |
|----------|-----------|----------|
| Database | `SUPABASE_URL`, `SUPABASE_*_KEY` | ✅ Yes |
| Server | `NODE_ENV`, `API_PORT`, `API_HOST` | ✅ Yes |
| CORS | `CORS_ORIGINS` | ✅ Production |
| Email | `SMTP_*` | ❌ Optional |
| Monitoring | `SENTRY_DSN` | ❌ Optional |
| External Services | `CIRCLE_*`, `SUPERFLUID_*` | ❌ Optional |

---

## 🔗 Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Railway Environment Variables](https://docs.railway.app/deploy/variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## 📝 Creating `.env.example` Files

Since `.env` files are gitignored, create `.env.example` templates for your team:

### For API (`apps/api/.env.example`):

```bash
cat > apps/api/.env.example << 'EOF'
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
NODE_ENV=development
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=
DASHBOARD_URL=
EOF
```

### For UI (`payos-ui/.env.example`):

```bash
cat > payos-ui/.env.example << 'EOF'
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
EOF
```

### For Web (`apps/web/.env.example`):

```bash
cat > apps/web/.env.example << 'EOF'
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
EOF
```

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0

