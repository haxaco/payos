# 🔧 Railway Environment Variable Cleanup

## ❌ **Remove These Variables**

These are **interfering** with Railway's automatic configuration:

```bash
API_PORT="4000"          # ← REMOVE (Railway uses PORT, not API_PORT)
API_HOST="0.0.0.0"       # ← REMOVE (App now forces 0.0.0.0)
CORS_ORIGINS="..."       # ← REMOVE (Defaults include Vercel URL now)
```

## ✅ **Keep Only These**

```bash
SUPABASE_URL="https://lgsreshwntpdrthfgwos.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__"
SUPABASE_ANON_KEY="sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF"
NODE_ENV="production"
ENABLE_SCHEDULED_TRANSFERS="false"
```

**Note:** `PORT` is automatically set by Railway (currently 8080). Don't set it manually!

---

## 🛠️ **How to Remove Variables in Railway**

1. Go to: Railway Dashboard → Your Service → Variables
2. Find each variable to remove
3. Click the **trash icon** (🗑️) next to it
4. Railway will automatically **redeploy** after you remove variables

---

## ⚡ **Why This Matters**

### `API_PORT` Conflicts with Railway's `PORT`
- Railway expects apps to use `process.env.PORT` (automatically assigned)
- Having `API_PORT` can cause confusion (though our code prioritizes `PORT`)
- Better to remove it for clarity

### `API_HOST` is No Longer Used
- Our updated code forces `0.0.0.0` (all interfaces)
- This variable is ignored, so it's just clutter

### `CORS_ORIGINS` Has Better Defaults
- The app now includes `https://payos-web.vercel.app` by default
- Only set this if you have **additional** custom domains
- Removing it uses the smarter defaults

---

## 🚀 **After Cleanup**

Railway will automatically redeploy. Watch the logs for:
```
✅ Server is listening on 0.0.0.0:8080
📍 Health check requested
✅ Health check passed - DB connected
```

Then test:
```bash
curl https://payos-production.up.railway.app/health
# Should return: {"status":"healthy",...}
```

