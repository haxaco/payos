# PayOS Deployment Quick Start

**5-Minute Deployment Guide** | Last Updated: Dec 19, 2025

---

## 🚀 Quick Deployment (15-30 minutes)

### Prerequisites

- [ ] Railway account ([railway.app](https://railway.app))
- [ ] Vercel account ([vercel.com](https://vercel.com))
- [ ] Supabase project configured
- [ ] All migrations applied to Supabase
- [ ] Local build succeeds (`pnpm build`)

---

## Step 1: Deploy API (Railway) - 10 minutes

### 1.1 Install Railway CLI

```bash
npm i -g @railway/cli
railway login
```

### 1.2 Initialize & Deploy

```bash
cd /Users/haxaco/Dev/PayOS/apps/api
railway init
railway up
```

### 1.3 Set Environment Variables

In Railway Dashboard → Variables, add:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS=https://payos-ui.vercel.app
DASHBOARD_URL=https://payos-ui.vercel.app
MOCK_SCHEDULED_TRANSFERS=false
```

### 1.4 Get API URL

```bash
railway domain
# Save this URL: https://payos-api-production.up.railway.app
```

### 1.5 Test API

```bash
curl https://your-api.railway.app/health
```

**Expected:** `{"status":"ok",...}`

---

## Step 2: Deploy Main UI (Vercel) - 10 minutes

### 2.1 Install Vercel CLI

```bash
npm i -g vercel
cd /Users/haxaco/Dev/PayOS/payos-ui
```

### 2.2 Deploy

```bash
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? (Select your account)
- Link to existing project? **N**
- Project name: `payos-ui`
- Directory: `./`
- Override settings? **N**

### 2.3 Set Environment Variables

Via Vercel Dashboard → Project Settings → Environment Variables:

```bash
VITE_API_URL=https://your-api.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2.4 Deploy to Production

```bash
vercel --prod
```

### 2.5 Get Production URL

```bash
# Example: https://payos-ui.vercel.app
```

---

## Step 3: Deploy Web Dashboard (Vercel) - 10 minutes

### 3.1 Deploy

```bash
cd /Users/haxaco/Dev/PayOS/apps/web
vercel
```

Follow same prompts as Step 2.2, but use project name: `payos-web`

### 3.2 Set Environment Variables

Via Vercel Dashboard → Project Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3.3 Deploy to Production

```bash
vercel --prod
```

---

## Step 4: Update CORS - 2 minutes

### 4.1 Update Railway Environment Variables

In Railway Dashboard → Variables, update:

```bash
CORS_ORIGINS=https://payos-ui.vercel.app,https://payos-web.vercel.app
```

### 4.2 Redeploy API

Railway will auto-redeploy when you save the environment variable.

---

## Step 5: Verify Deployment - 5 minutes

### 5.1 API Health Check

```bash
curl https://your-api.railway.app/health
```

✅ Should return: `{"status":"ok"}`

### 5.2 Test Authentication

```bash
curl -H "Authorization: Bearer pk_test_demo_fintech_key_12345" \
  https://your-api.railway.app/v1/accounts
```

✅ Should return: List of accounts (not 401 error)

### 5.3 Test Frontend

1. Visit `https://payos-ui.vercel.app`
2. Login with:
   - Email: `beta@example.com`
   - Password: `Password123!`
3. Verify dashboard loads
4. Check browser console for errors (should be none)
5. Navigate to Accounts page
6. Verify data loads

---

## 🎉 Deployment Complete!

Your PayOS application is now live:

- **Main UI:** https://payos-ui.vercel.app
- **Web Dashboard:** https://payos-web.vercel.app
- **API:** https://your-api.railway.app

---

## 📊 Monitoring

### Railway (API)

```bash
# View logs
railway logs
```

Or visit: Railway Dashboard → Deployments → Logs

### Vercel (Frontend)

```bash
# View logs
vercel logs
```

Or visit: Vercel Dashboard → Deployments

---

## 🚨 Troubleshooting

### API not responding

**Check:**
1. Railway deployment succeeded
2. Environment variables set correctly
3. Supabase URL/keys are valid
4. Check Railway logs: `railway logs`

### Frontend shows API errors

**Check:**
1. VITE_API_URL points to correct Railway URL
2. CORS_ORIGINS includes your Vercel URL
3. Check browser console for CORS errors
4. Verify API is running: `curl https://your-api.railway.app/health`

### Login fails

**Check:**
1. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
2. Supabase Auth is configured
3. Test user exists in Supabase
4. Check browser console for errors

### Data not loading

**Check:**
1. Database migrations applied
2. Seed data exists (or create test data)
3. RLS policies configured correctly
4. User has proper tenant_id

---

## 🔄 Redeploying

### API

```bash
cd apps/api
railway up
```

### UI

```bash
cd payos-ui
vercel --prod
```

### Web Dashboard

```bash
cd apps/web
vercel --prod
```

---

## 📚 Full Documentation

For detailed deployment information, see:
- [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md)

---

## 🆘 Need Help?

1. Check logs (Railway, Vercel, Supabase)
2. Review environment variables
3. Verify CORS configuration
4. Test API health endpoint
5. Check browser console
6. Refer to [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md)

---

**Next Steps:**

1. [ ] Set up custom domain (optional)
2. [ ] Configure monitoring (Sentry, LogRocket)
3. [ ] Set up automated backups
4. [ ] Configure CI/CD (GitHub Actions)
5. [ ] Review security hardening checklist
6. [ ] Set up status page (optional)
7. [ ] Document incident response plan

---

**Last Updated:** December 19, 2025

