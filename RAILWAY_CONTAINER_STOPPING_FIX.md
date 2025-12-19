# 🚨 Fix: Railway Stopping Container After Health Check

## 🔴 **The Problem**

Railway logs show:
```
✅ Health check passed - DB connected
[inf] Stopping Container    ← Railway kills the app!
SIGTERM received, shutting down gracefully...
```

**Railway is stopping your app immediately after it starts**, even though the health check passes.

---

## ✅ **Solution 1: Procfile Added**

I've added a `Procfile` to explicitly tell Railway this is a **web service**:

```
web: node apps/api/dist/index.js
```

This is the standard way to declare long-running web services in Railway.

**Status:** Already committed and pushed - Railway should now recognize this as a web service.

---

## ✅ **Solution 2: Check Railway Dashboard Settings**

### **Step 1: Verify Service Type**

1. Go to: **Railway Dashboard** → Your API Service
2. Click **Settings** tab (⚙️)
3. Look for these settings:

| Setting | Should Be | Not This |
|---------|-----------|----------|
| **Service Type** / **Process Type** | `web` | `worker`, `cron`, `job` |
| **Replicas** | `1` or more | `0` (paused) |
| **Deploy on push** | Enabled ✅ | Disabled ❌ |

### **Step 2: Check for "Pause Service" Setting**

- Make sure the service is **not paused**
- Look for a **"Resume Service"** button
- If you see it, click to resume

### **Step 3: Verify Health Check Settings**

In Railway Dashboard → Service → Settings:

| Setting | Value |
|---------|-------|
| **Health Check Path** | `/health` |
| **Health Check Timeout** | `300` seconds (or higher) |
| **Initial Delay** | `10` seconds (if available) |

---

## 🔍 **Solution 3: Check Railway CLI**

If you have Railway CLI installed:

```bash
# Login and link to project
railway login
railway link

# Check service status
railway status

# Check if service is configured correctly
railway variables

# Force redeploy
railway up
```

---

## 🛠️ **Solution 4: Recreate the Service (Nuclear Option)**

If nothing else works, you might need to recreate the service:

### **Before You Start - Save These:**

```bash
# Environment Variables (copy from Railway Dashboard):
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__
SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
NODE_ENV=production
ENABLE_SCHEDULED_TRANSFERS=false
```

### **Steps:**

1. **In Railway Dashboard:**
   - Click your API service
   - Go to **Settings** → Scroll to bottom
   - Click **"Delete Service"** (scary, I know!)

2. **Create New Service:**
   - Click **"+ New"** → **"GitHub Repo"**
   - Select your `payos` repository
   - Railway will auto-detect the app

3. **Configure:**
   - **Root Directory:** Leave empty (monorepo root)
   - **Build Command:** Auto-detected from `nixpacks.toml`
   - **Start Command:** Auto-detected from `Procfile` (`web: node apps/api/dist/index.js`)

4. **Add Environment Variables:**
   - Go to **Variables** tab
   - Add all the env vars you saved

5. **Deploy:**
   - Railway should auto-deploy
   - Watch logs for successful startup

---

## 📊 **What to Look For in New Deployment**

After the fix, logs should show:

```bash
✅ Server is listening on 0.0.0.0:8080
📍 Health check requested
✅ Health check passed - DB connected

# Then NOTHING - app should keep running!
# No "Stopping Container" message!
```

The container should stay running indefinitely until you manually stop it.

---

## 🧪 **Test After Fix**

Once Railway stops stopping your container:

```bash
# Should return healthy status
curl https://payos-production.up.railway.app/health

# Should work (with valid API key)
curl https://payos-production.up.railway.app/v1/accounts \
  -H "Authorization: Bearer pk_test_..."
```

---

## 🤔 **Why Did This Happen?**

Possible causes:
1. **No Procfile** - Railway didn't know this was a web service
2. **Service Type Misconfigured** - Set to "worker" instead of "web"
3. **Replicas = 0** - Service was paused
4. **Railway Bug** - Sometimes Railway has quirks with new services

---

## 📝 **Current Status**

✅ **Fixed in code:**
- Added `Procfile` with `web:` declaration
- Increased health check timeout to 300s
- Explicit start command in `railway.json`

⏳ **Waiting for Railway to deploy:**
- Watch deployment logs in Railway Dashboard
- Look for container staying running after health check
- No "Stopping Container" message should appear

---

## 🚀 **Next Steps After This is Fixed**

1. ✅ Verify API is accessible externally
2. ✅ Configure Vercel environment variables
3. ✅ Test end-to-end: Dashboard → API → Database
4. ✅ Celebrate! 🎉

---

**Need Help?** Share your Railway Dashboard **Settings** tab screenshot if issues persist!

