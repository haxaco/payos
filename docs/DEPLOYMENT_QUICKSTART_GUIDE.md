# PayOS Deployment Quick Start Guide

**Time to Deploy:** 30 minutes  
**Date:** December 19, 2025

---

## 🎯 Overview

You'll deploy:
- **API** → Railway (backend with database access)
- **Main UI** → Vercel (React/Vite app)
- **Web Dashboard** → Vercel (Next.js app)

Both will auto-deploy when you push to GitHub!

---

## 📋 Prerequisites

- [x] Vercel account (free tier works!)
- [x] Railway account (free tier works!)
- [x] GitHub repo: https://github.com/haxaco/payos
- [x] New Supabase keys ready
  - Secret key: `sb_secret_ley...`
  - Publishable key: `sb_publishable_9mD...`

---

## 🚀 Part 1: Deploy API to Railway (15 min)

### Step 1: Connect GitHub to Railway

1. **Go to Railway:** https://railway.app
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Authorize Railway** to access your GitHub
5. **Select repository:** `haxaco/payos`
6. **IMPORTANT: Leave root directory as `/` (repository root)**
   - The configuration files (`railway.json` and `nixpacks.toml`) at the root handle the monorepo build
   - Don't change to `apps/api` - this will cause build errors

### Step 2: Configure Railway Project

Railway will detect it's a Node.js project. Configure:

1. **Service name:** `payos-api`
2. **Branch:** `main`
3. **Build command:** (auto-detected)
4. **Start command:** `node dist/index.js`

### Step 3: Set Environment Variables

In Railway Dashboard → Variables, add:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_leyZWLzKsmflbF7Orn9pVw_648-nu__
SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF

# API Configuration (REQUIRED)
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0

# CORS (Update after deploying frontends!)
CORS_ORIGINS=http://localhost:3001

# Optional
MOCK_SCHEDULED_TRANSFERS=false
```

**Important:** We'll update `CORS_ORIGINS` after deploying the frontends!

### Step 4: Deploy

1. **Click "Deploy"** in Railway
2. **Wait 3-5 minutes** for first deployment
3. **Get your API URL:**
   - Click on your service
   - Go to "Settings" tab
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://payos-api-production.up.railway.app`)

**Save this URL!** You'll need it for frontend deployments.

### Step 5: Test API

```bash
# Replace with your actual Railway URL
curl https://your-api.railway.app/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

✅ **API deployed!**

---

## 🎨 Part 2: Deploy Main UI to Vercel (10 min)

### Step 1: Connect GitHub to Vercel

1. **Go to Vercel:** https://vercel.com
2. **Click "Add New Project"**
3. **Import Git Repository**
4. **Select:** `haxaco/payos`
5. **Configure:**
   - **Framework Preset:** Vite
   - **Root Directory:** `payos-ui`
   - **Build Command:** `pnpm build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)

### Step 2: Set Environment Variables

Before deploying, click **"Environment Variables"** and add:

```bash
# API Connection (REQUIRED)
VITE_API_URL=https://your-api.railway.app

# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF
```

**Important:** Replace `your-api.railway.app` with your actual Railway API URL from Part 1!

Select **"Production"**, **"Preview"**, and **"Development"** for each variable.

### Step 3: Deploy

1. **Click "Deploy"**
2. **Wait 2-3 minutes** for deployment
3. **Get your URL:**
   - Vercel will show your deployment URL
   - Example: `https://payos-ui.vercel.app`

**Save this URL!**

### Step 4: Test Frontend

1. Visit your Vercel URL
2. You should see the login page
3. Try logging in:
   - Email: `beta@example.com`
   - Password: `Password123!`

✅ **Main UI deployed!**

---

## 🖥️ Part 3: Deploy Web Dashboard to Vercel (10 min)

### Step 1: Add Another Project in Vercel

1. **Click "Add New Project"** again
2. **Select:** `haxaco/payos` (same repo)
3. **Configure:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm build --filter=@payos/web`
   - **Output Directory:** `.next` (auto-detected)

### Step 2: Set Environment Variables

Add these environment variables:

```bash
# API Connection (REQUIRED)
NEXT_PUBLIC_API_URL=https://your-api.railway.app

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://lgsreshwntpdrthfgwos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF

# App Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL=https://your-web-dashboard.vercel.app
```

**Important:** 
- Replace `your-api.railway.app` with your Railway API URL
- For `NEXT_PUBLIC_APP_URL`, use the Vercel URL you'll get after deployment (you can update it after)

### Step 3: Deploy

1. **Click "Deploy"**
2. **Wait 2-3 minutes**
3. **Get your URL:**
   - Example: `https://payos-web.vercel.app`

**Save this URL!**

### Step 4: Update App URL

After deployment, update the environment variable:
1. Go to Project Settings → Environment Variables
2. Find `NEXT_PUBLIC_APP_URL`
3. Update with your actual Vercel URL
4. Redeploy

✅ **Web Dashboard deployed!**

---

## 🔄 Part 4: Update CORS Settings (5 min)

Now that your frontends are deployed, update the API's CORS settings:

### Update Railway Environment Variables

1. **Go to Railway Dashboard**
2. **Select your API service**
3. **Go to Variables**
4. **Update `CORS_ORIGINS`:**

```bash
CORS_ORIGINS=https://payos-ui.vercel.app,https://payos-web.vercel.app
```

Replace with your actual Vercel URLs!

5. **Save** (Railway will auto-redeploy)

✅ **CORS configured!**

---

## 🎉 Part 5: Enable Auto-Deployments

### Vercel (Already Done!)

✅ Vercel automatically deploys when you push to GitHub!

**How it works:**
- Push to `main` → deploys to production
- Push to any branch → creates preview deployment
- Open PR → creates preview deployment with comment

**Settings:**
- Go to Project Settings → Git
- Confirm "Production Branch" is set to `main`

### Railway (Enable Auto-Deploy)

1. **Go to Railway Dashboard**
2. **Select your API service**
3. **Go to Settings tab**
4. **Find "Deployments" section**
5. **Enable "Automatic Deployments"**
6. **Set branch:** `main`

✅ **Auto-deployments enabled!**

---

## 📊 Part 6: Verify Everything Works

### Test API

```bash
# Health check
curl https://your-api.railway.app/health

# With authentication
curl -H "apikey: sb_publishable_9mDQqjIW4xl-ZDtS1GVH5g_N6Jfh-EF" \
  https://your-api.railway.app/v1/accounts
```

### Test Main UI

1. Visit: `https://your-ui.vercel.app`
2. Login with test credentials
3. Check browser console (should be no CORS errors)
4. Navigate through pages
5. Verify data loads

### Test Web Dashboard

1. Visit: `https://your-web.vercel.app`
2. Login with test credentials
3. Check all pages work
4. Verify API connection

### Test Auto-Deployment

Make a small change and push:

```bash
cd /Users/haxaco/Dev/PayOS

# Make a small change
echo "# Deployment test" >> README.md

# Commit and push
git add README.md
git commit -m "test: Verify auto-deployment works"
git push origin main
```

**What should happen:**
- Railway: New deployment starts automatically
- Vercel: Both projects deploy automatically
- You get email notifications
- Check deployment status in dashboards

✅ **Auto-deployment working!**

---

## 🎓 Understanding Your Setup

### Deployment Flow

```
GitHub Push
    ↓
    ├─→ Railway detects changes in apps/api/* → Deploys API
    ├─→ Vercel detects changes in payos-ui/* → Deploys Main UI
    └─→ Vercel detects changes in apps/web/* → Deploys Web Dashboard
```

### URLs Summary

After setup, you'll have:

| Component | Platform | URL |
|-----------|----------|-----|
| API | Railway | `https://payos-api-production.up.railway.app` |
| Main UI | Vercel | `https://payos-ui.vercel.app` |
| Web Dashboard | Vercel | `https://payos-web.vercel.app` |

### Environment Variables

**Railway (API):**
- `SUPABASE_*` keys (secret and publishable)
- `NODE_ENV=production`
- `CORS_ORIGINS` (with Vercel URLs)

**Vercel (Main UI):**
- `VITE_API_URL` (Railway URL)
- `VITE_SUPABASE_*` (only publishable key!)

**Vercel (Web Dashboard):**
- `NEXT_PUBLIC_API_URL` (Railway URL)
- `NEXT_PUBLIC_SUPABASE_*` (only publishable key!)

---

## 🔧 Advanced: Custom Domains (Optional)

### Add Custom Domain to Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS settings as instructed
4. Update environment variables with new domain

### Add Custom Domain to Railway

1. Go to Settings → Networking
2. Click "Custom Domain"
3. Add domain (e.g., `api.yourdomain.com`)
4. Update DNS settings
5. Update frontend `API_URL` variables

---

## 📊 Monitoring Your Deployments

### Railway Dashboard

- **Deployments:** See all deployments and logs
- **Metrics:** CPU, memory, network usage
- **Logs:** Real-time API logs
- **Variables:** Manage environment variables

**URL:** https://railway.app/dashboard

### Vercel Dashboard

- **Deployments:** See all deployments with previews
- **Analytics:** Page views, performance
- **Logs:** Build and runtime logs
- **Environment Variables:** Manage per environment

**URL:** https://vercel.com/dashboard

---

## 🚨 Troubleshooting

### API not deploying on Railway

**Check:**
1. Railway has access to your GitHub repo
2. Root directory is set to `apps/api`
3. Build succeeds (check logs)
4. Environment variables are set

**Fix:**
- Go to Settings → General → Redeploy

### Frontend not deploying on Vercel

**Check:**
1. Root directory is correct
2. Build command works locally
3. Environment variables are set
4. No build errors (check deployment logs)

**Fix:**
- Go to Deployments → Click failed deployment → View logs

### CORS errors in browser

**Check:**
1. `CORS_ORIGINS` includes your Vercel URLs
2. No typos in URLs
3. HTTPS (not HTTP) in production

**Fix:**
- Update `CORS_ORIGINS` in Railway
- Wait for redeploy
- Hard refresh browser (Cmd+Shift+R)

### Environment variables not working

**Check:**
1. Correct prefix (`VITE_` or `NEXT_PUBLIC_`)
2. Variables set in correct environment (Production/Preview)
3. Redeployed after adding variables

**Fix:**
- Redeploy to pickup new variables
- Check spelling and values

---

## 💰 Cost Estimate

### Free Tier (Good for MVP)

**Railway:**
- Free: $5 credit/month
- Enough for: Low-traffic API
- Cost: $0-5/month

**Vercel:**
- Free: Hobby tier
- Includes: Unlimited deployments, 100GB bandwidth
- Cost: $0/month

**Supabase:**
- Free: 500MB database, 5GB bandwidth
- Cost: $0/month

**Total:** $0-5/month

### Paid Tier (Production)

**Railway:**
- Pro: $20/month
- Includes: Unlimited deployments, better resources

**Vercel:**
- Pro: $20/month/seat
- Includes: Better analytics, team features

**Supabase:**
- Pro: $25/month
- Includes: 8GB database, better performance

**Total:** $65-85/month

---

## ✅ Deployment Checklist

### Initial Setup
- [ ] Railway account created
- [ ] Vercel account created
- [ ] GitHub repo connected to Railway
- [ ] GitHub repo connected to Vercel (2 projects)
- [ ] Environment variables set on Railway
- [ ] Environment variables set on Vercel (both projects)
- [ ] CORS updated with production URLs
- [ ] Auto-deployments enabled

### Verification
- [ ] API health check works
- [ ] Main UI loads and works
- [ ] Web Dashboard loads and works
- [ ] Can login to both frontends
- [ ] Data loads from API
- [ ] No CORS errors in browser console
- [ ] Auto-deployment works (tested with push)

### Production Ready
- [ ] All features tested
- [ ] Performance acceptable
- [ ] Monitoring set up
- [ ] Alerts configured
- [ ] Team has access to dashboards
- [ ] Documentation updated
- [ ] Incident response plan ready

---

## 🎉 You're Deployed!

Congratulations! Your PayOS application is now:

✅ **Deployed to production**  
✅ **Auto-deploying on push to main**  
✅ **Using secure Supabase keys**  
✅ **Monitoring ready**  
✅ **Scalable and reliable**  

### Next Steps

1. **Test thoroughly** - Run through all features
2. **Monitor logs** - Check for errors
3. **Set up alerts** - Get notified of issues
4. **Plan scaling** - Monitor usage and upgrade as needed
5. **Document** - Keep deployment docs updated

---

## 🆘 Need Help?

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://discord.gg/vercel

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

---

**Deployment completed:** December 19, 2025  
**Status:** Production Ready  
**Version:** 1.0.0

