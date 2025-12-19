# 🚀 Deploy PayOS NOW - 30 Minute Guide

**Follow these steps in order. Total time: ~30 minutes**

---

## 🎯 What You'll Deploy

1. **API** → Railway (backend)
2. **Main UI** → Vercel (React app)
3. **Web Dashboard** → Vercel (Next.js app)

All will auto-deploy when you push to GitHub! ✨

---

## 📝 Before You Start

Have these ready:
- ✅ Your Supabase keys:
  - Secret: `sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__`
  - Publishable: `sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF`
- ✅ Railway account (free)
- ✅ Vercel account (free)

---

## 🔴 STEP 1: Deploy API to Railway (10 min)

### 1.1 Create Project

1. Go to: https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. **Authorize Railway** if asked
5. Select **`haxaco/payos`**
6. When asked for directory, enter: `apps/api`

### 1.2 Add Environment Variables

Click on your service → **Variables** tab → Add these:

```bash
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__
SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3001
MOCK_SCHEDULED_TRANSFERS=false
```

### 1.3 Get Your API URL

1. Click **Settings** tab
2. Click **"Generate Domain"**
3. Copy your URL (looks like: `payos-api-production.up.railway.app`)
4. **SAVE THIS!** You'll need it next.

**My Railway API URL:** `_______________________________________`

### 1.4 Test It

```bash
curl https://YOUR-URL.railway.app/health
```

Should return: `{"status":"ok"}`

✅ **API deployed!** Move to Step 2.

---

## 🟢 STEP 2: Deploy Main UI to Vercel (8 min)

### 2.1 Create Project

1. Go to: https://vercel.com
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select **`haxaco/payos`**
5. Configure:
   - **Framework:** Vite (auto-detected)
   - **Root Directory:** Browse → Select `payos-ui`
   - Click **"Continue"**

### 2.2 Add Environment Variables

**BEFORE clicking Deploy**, add these variables:

Click **"Environment Variables"** → Add:

```bash
VITE_API_URL=https://YOUR-RAILWAY-URL.railway.app
VITE_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
```

**IMPORTANT:** Replace `YOUR-RAILWAY-URL` with the URL from Step 1.3!

Select: ✅ Production, ✅ Preview, ✅ Development

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Click **"Visit"** when done
4. **SAVE YOUR URL!**

**My Main UI URL:** `_______________________________________`

### 2.4 Test It

1. Visit your Vercel URL
2. Should see login page
3. Login: `beta@example.com` / `Password123!`

✅ **Main UI deployed!** Move to Step 3.

---

## 🟡 STEP 3: Deploy Web Dashboard to Vercel (8 min)

### 3.1 Create Second Project

1. **Still in Vercel**, click **"Add New Project"**
2. Select **`haxaco/payos`** again (same repo!)
3. Configure:
   - **Framework:** Next.js (auto-detected)
   - **Root Directory:** Browse → Select `apps/web`
   - **Build Command:** `cd ../.. && pnpm build --filter=@payos/web`
   - Click **"Continue"**

### 3.2 Add Environment Variables

Add these variables:

```bash
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
NEXT_PUBLIC_APP_URL=https://payos-web.vercel.app
```

**IMPORTANT:** Replace `YOUR-RAILWAY-URL` with your Railway URL!

Select: ✅ Production, ✅ Preview, ✅ Development

### 3.3 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. **SAVE YOUR URL!**

**My Web Dashboard URL:** `_______________________________________`

✅ **Web Dashboard deployed!** Move to Step 4.

---

## 🔵 STEP 4: Update CORS (3 min)

Now that frontends are deployed, update API's CORS:

### 4.1 Update Railway

1. Go back to **Railway Dashboard**
2. Click on your API service
3. Go to **Variables** tab
4. Find `CORS_ORIGINS`
5. Update to:

```bash
CORS_ORIGINS=https://YOUR-MAIN-UI.vercel.app,https://YOUR-WEB-DASHBOARD.vercel.app
```

Replace with your **actual Vercel URLs** from Steps 2 & 3!

6. **Save** (Railway auto-redeploys)

✅ **CORS updated!** Move to Step 5.

---

## 🎉 STEP 5: Enable Auto-Deploy (5 min)

### 5.1 Railway Auto-Deploy

1. In Railway Dashboard
2. Click your API service
3. Go to **Settings** tab
4. Find **"Deployments"** section
5. **Enable "Automatic Deployments"**
6. Branch: `main`

✅ Railway will now deploy on every push to main!

### 5.2 Vercel Auto-Deploy

Already done! Vercel automatically deploys when you push to GitHub.

**Verify:**
1. Go to each Vercel project
2. Settings → Git
3. Confirm "Production Branch" = `main`

✅ Vercel will now deploy on every push to main!

---

## ✅ STEP 6: Test Everything (5 min)

### Test API

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

Expected: `{"status":"ok"}`

### Test Main UI

1. Visit: `https://YOUR-MAIN-UI.vercel.app`
2. Login: `beta@example.com` / `Password123!`
3. Open browser console (F12)
4. Should be **NO CORS errors**
5. Navigate through pages
6. Data should load

### Test Web Dashboard

1. Visit: `https://YOUR-WEB-DASHBOARD.vercel.app`
2. Login with same credentials
3. Check everything works

### Test Auto-Deploy

```bash
cd /Users/haxaco/Dev/PayOS

# Make a small change
echo "# Test deployment" >> README.md

# Push it
git add README.md
git commit -m "test: Auto-deployment"
git push origin main
```

**What happens:**
- Check Railway dashboard → New deployment starts
- Check Vercel dashboard → New deployments start
- Both complete in 2-3 minutes

✅ **Everything works!**

---

## 🎊 YOU'RE DONE!

### Your Production URLs

Fill these in:

| Component | URL |
|-----------|-----|
| API | `https://______________________` |
| Main UI | `https://______________________` |
| Web Dashboard | `https://______________________` |

### What Happens Now

Every time you push to `main`:
1. ✅ Railway deploys API automatically
2. ✅ Vercel deploys both frontends automatically
3. ✅ You get email notifications
4. ✅ Changes go live in 2-3 minutes

---

## 🔧 Quick Links

**Dashboards:**
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard
- Supabase: https://app.supabase.com

**Monitors:**
- Railway Logs: Dashboard → Select service → Logs
- Vercel Logs: Dashboard → Select project → Deployments → Logs

---

## 🆘 Having Issues?

### API won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Verify Supabase keys are correct

### Frontend shows CORS errors
- Update `CORS_ORIGINS` in Railway with correct Vercel URLs
- Wait for Railway to redeploy
- Hard refresh browser (Cmd+Shift+R)

### Can't login
- Verify Supabase keys in frontend environment variables
- Check that you're using the publishable key (not secret!)
- Check browser console for errors

### Need more help?
- Read: `docs/DEPLOYMENT_QUICKSTART_GUIDE.md` (detailed guide)
- Check: Railway/Vercel documentation
- Look at: Deployment logs in dashboards

---

## 💡 Pro Tips

1. **Use Vercel's preview deployments**
   - Every PR gets its own URL to test
   - Share with team before merging

2. **Monitor your logs**
   - Railway logs show API errors
   - Vercel logs show build issues

3. **Set up alerts**
   - Railway → Settings → Notifications
   - Get notified of failures

4. **Keep keys secure**
   - Never commit `.env` files
   - Rotate keys every 90 days
   - Use secret keys only in Railway (backend)

---

**Deployed by:** _____________  
**Date:** December 19, 2025  
**Status:** 🎉 LIVE IN PRODUCTION!

**Next:** Share your URLs with your team and celebrate! 🎊

