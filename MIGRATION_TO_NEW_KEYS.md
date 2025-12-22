# Migration to New Supabase API Keys

**Date:** December 19, 2025  
**Status:** Recommended - Migrate from legacy to new keys

---

## 🎯 Overview

Migrating from legacy JWT-based keys to new publishable/secret keys:

| Old (Legacy) | New (Recommended) |
|--------------|-------------------|
| `anon` key (JWT) | Publishable key (`sb_publishable_...`) |
| `service_role` key (JWT) | Secret key (`sb_secret_...`) |

**Benefits:**
- ✅ Independent rotation (no downtime)
- ✅ Better security (secret keys blocked in browser)
- ✅ Easier to manage
- ✅ Mobile-friendly (no forced app updates)
- ✅ Can rollback if needed

---

## 📋 Migration Steps

### Step 1: Get New Keys from Supabase

1. Go to: https://app.supabase.com/project/lgsreshwntpdrthfgwos/settings/api

2. Click **"API Keys"** tab

3. **Create Secret Key** (replaces `service_role`):
   - Click "Create new API Key"
   - Type: Secret key
   - Copy and save: `sb_secret_...`

4. **Get Publishable Key** (replaces `anon`):
   - Already exists or create new
   - Copy and save: `sb_publishable_...`

---

### Step 2: Update Backend Environment Variables

#### For Local Development

**File:** `apps/api/.env`

```bash
# OLD (Legacy - JWT-based)
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
# SUPABASE_ANON_KEY=eyJhbGci...

# NEW (Recommended)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx  # Your new secret key
SUPABASE_ANON_KEY=sb_publishable_xxx     # Your new publishable key

# Keep the same
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
NODE_ENV=development
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### For Production (Railway)

```bash
# Via Railway Dashboard or CLI
railway variables set SUPABASE_SERVICE_ROLE_KEY="sb_secret_xxx"
railway variables set SUPABASE_ANON_KEY="sb_publishable_xxx"
```

---

### Step 3: Update Frontend Environment Variables

#### For Main UI (payos-ui)

**File:** `payos-ui/.env`

```bash
# OLD (Legacy)
# VITE_SUPABASE_ANON_KEY=eyJhbGci...

# NEW (Recommended)
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx  # Your new publishable key

# Keep the same
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
```

#### For Web Dashboard (apps/web)

**File:** `apps/web/.env.local`

```bash
# OLD (Legacy)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# NEW (Recommended)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx  # Your new publishable key

# Keep the same
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Step 4: Update Production Deployments

#### Railway (API)

1. Go to Railway Dashboard
2. Select your project
3. Go to **Variables**
4. Update:
   - `SUPABASE_SERVICE_ROLE_KEY` → `sb_secret_xxx`
   - `SUPABASE_ANON_KEY` → `sb_publishable_xxx`
5. Save (auto-redeploys)

#### Vercel (Frontend)

For each project (`payos-ui`, `payos-web`):

1. Go to Vercel Dashboard
2. Select project
3. **Settings → Environment Variables**
4. Update:
   - `VITE_SUPABASE_ANON_KEY` → `sb_publishable_xxx` (for UI)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_xxx` (for Web)
5. Redeploy

---

### Step 5: Test Everything Works

#### Test API Locally

```bash
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev
```

**Expected:** Server starts without errors

```bash
# Test health endpoint
curl http://localhost:4000/health

# Test with new key
curl -H "apikey: sb_secret_xxx" \
  http://localhost:4000/v1/accounts
```

#### Test Frontend Locally

```bash
cd /Users/haxaco/Dev/PayOS/payos-ui
pnpm dev
```

1. Open http://localhost:3001
2. Login with test credentials
3. Verify data loads
4. Check browser console (no errors)

---

### Step 6: Deactivate Legacy Keys (Optional)

Once everything works with new keys:

1. Go to: https://app.supabase.com/project/lgsreshwntpdrthfgwos/settings/api
2. Click **"Legacy API Keys"** tab
3. Check **"Last Used"** indicators
4. Verify they show "Never" or old dates
5. Click **"Deactivate"** for each legacy key

⚠️ **Important:** Only deactivate after confirming new keys work everywhere!

You can re-activate them if needed.

---

## 🔄 Comparison: Old vs New

### Using Legacy Keys

```typescript
// Backend (apps/api)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Frontend (payos-ui)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Using New Keys

```typescript
// Backend (apps/api)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Value: sb_secret_1a2b3c4d...

// Frontend (payos-ui)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Value: sb_publishable_1a2b3c4d...
```

**No code changes needed!** Just environment variable values.

---

## 📚 Known Limitations

### Edge Functions

⚠️ Edge Functions **only support JWT verification** with legacy keys.

**Workaround:**
```bash
# When deploying Edge Functions with new keys
supabase functions deploy my-function --no-verify-jwt
```

Then implement your own `apikey` header validation inside the function.

### Realtime Connections

With publishable keys:
- Public Realtime connections limited to **24 hours**
- Must upgrade connection with user authentication for longer

With legacy `anon` key:
- No time limit (but harder to rotate)

---

## ✅ Checklist

- [ ] Got new secret key from Supabase (`sb_secret_...`)
- [ ] Got new publishable key from Supabase (`sb_publishable_...`)
- [ ] Updated `apps/api/.env` with new keys
- [ ] Updated `payos-ui/.env` with new publishable key
- [ ] Updated `apps/web/.env.local` with new publishable key
- [ ] Tested API locally (server starts, endpoints work)
- [ ] Tested frontend locally (login works, data loads)
- [ ] Updated Railway environment variables
- [ ] Updated Vercel environment variables
- [ ] Tested production API (health check passes)
- [ ] Tested production frontend (app loads, works)
- [ ] Verified legacy keys show "Never" or old "Last Used" date
- [ ] Deactivated legacy keys in Supabase Dashboard
- [ ] Updated team documentation
- [ ] Notified team members

---

## 🆘 Troubleshooting

### API doesn't start with new keys

**Check:**
1. Key format is correct (`sb_secret_...` not `eyJhbGci...`)
2. No extra spaces or quotes in .env file
3. Restarted server after updating .env

### Frontend shows authentication errors

**Check:**
1. Using publishable key (`sb_publishable_...`) not secret key
2. Updated correct environment variable:
   - Vite: `VITE_SUPABASE_ANON_KEY`
   - Next.js: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Restarted dev server after updating .env

### Production API returns 401

**Check:**
1. Railway environment variables updated
2. Deployment completed successfully
3. Check Railway logs for errors
4. Verify key is active in Supabase Dashboard

### "Cannot use in browser" error

**Cause:** You're using a **secret key** in frontend (wrong!)

**Solution:** Use **publishable key** in frontend:
- `sb_publishable_...` ✅
- `sb_secret_...` ❌ (backend only!)

---

## 📖 References

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Why migrate from legacy keys](https://supabase.com/docs/guides/api/api-keys#why-are-anon-and-service_role-jwt-based-keys-no-longer-recommended)
- [Security best practices](https://supabase.com/docs/guides/api/api-keys#best-practices-for-handling-secret-keys)

---

## 🎉 Benefits After Migration

Once migrated, you'll have:

✅ **Independent rotation** - Rotate any key without affecting others  
✅ **Zero downtime** - Create new key, swap, delete old  
✅ **Better security** - Secret keys blocked in browsers  
✅ **Mobile-friendly** - No forced app updates when rotating  
✅ **Easier management** - Clear key names and purposes  
✅ **Rollback capability** - Can undo if something goes wrong  

---

**Status:** Ready to migrate  
**Last Updated:** December 19, 2025

