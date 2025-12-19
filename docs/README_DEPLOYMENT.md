# PayOS Deployment Documentation

**Your complete guide to deploying PayOS to production.**

---

## 📚 Documentation Structure

This directory contains comprehensive deployment documentation:

### 🚀 Getting Started

1. **[DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)**
   - 5-minute overview
   - Quick deployment steps
   - Fastest path to production
   - **Start here** if you want to deploy immediately

2. **[DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md)**
   - Complete deployment guide (10,000+ words)
   - Detailed step-by-step instructions
   - Architecture overview
   - Platform-specific configurations
   - Security hardening
   - Monitoring setup
   - **Read this** for comprehensive understanding

3. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**
   - Printable checklist
   - Pre-deployment verification
   - Deployment steps
   - Post-deployment validation
   - **Use this** during deployment

4. **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)**
   - Complete environment variable reference
   - Platform-specific configurations
   - Security best practices
   - Troubleshooting guide
   - **Reference this** when configuring environments

---

## 🎯 Choose Your Path

### Path 1: I want to deploy NOW (15-30 minutes)

1. Read [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)
2. Print [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. Reference [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) as needed
4. Deploy!

### Path 2: I want to understand everything first (1-2 hours)

1. Read [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md) thoroughly
2. Review [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
3. Print [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
4. Plan your deployment
5. Deploy with confidence

### Path 3: I want to automate deployment (CI/CD)

1. Review [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md) → CI/CD Setup section
2. Configure GitHub Actions workflows (included in repo)
3. Set up secrets in GitHub
4. Push to main branch → automatic deployment

---

## 🏗️ Architecture Overview

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

**Components:**
- **API Server:** Hono + Node.js (→ Railway, Render, Fly.io)
- **Web Dashboard:** Next.js 15 (→ Vercel)
- **Main UI:** Vite + React (→ Vercel, Netlify)
- **Database:** Supabase (hosted)

---

## 📦 Deployment Platforms

### Recommended Setup

| Component | Platform | Why |
|-----------|----------|-----|
| API Server | **Railway** | Easy Node.js deployment, built-in Redis |
| Web Dashboard | **Vercel** | Best Next.js experience, zero-config |
| Main UI | **Vercel** | Great for Vite/React, edge network |
| Database | **Supabase** | Already configured |

### Alternative Options

**API Server:**
- Render (free tier available)
- Fly.io (global deployment)
- AWS/GCP/Azure (enterprise)

**Frontend:**
- Netlify (alternative to Vercel)
- Cloudflare Pages (edge deployment)
- AWS Amplify (AWS ecosystem)

---

## 🔑 Key Requirements

### Pre-Deployment

✅ **Must Have:**
- Railway account
- Vercel account
- Supabase project configured
- All migrations applied
- Local build succeeds
- Tests passing

⚠️ **Important:**
- Rotate demo/test API keys
- Configure CORS for production domains
- Set up monitoring and alerts
- Document rollback procedures

### Environment Variables

**API Server (Required):**
```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
NODE_ENV
CORS_ORIGINS
```

**Frontend (Required):**
```bash
VITE_API_URL (or NEXT_PUBLIC_API_URL)
VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete reference.

---

## 🚀 Quick Deployment Steps

### 1. Deploy API (Railway)

```bash
cd apps/api
railway init
railway up
```

Set environment variables in Railway Dashboard.

### 2. Deploy Main UI (Vercel)

```bash
cd payos-ui
vercel
vercel --prod
```

Set environment variables in Vercel Dashboard.

### 3. Deploy Web Dashboard (Vercel)

```bash
cd apps/web
vercel
vercel --prod
```

Set environment variables in Vercel Dashboard.

### 4. Update CORS

Update `CORS_ORIGINS` in Railway with your Vercel URLs.

### 5. Verify

- Test API health: `curl https://your-api.railway.app/health`
- Visit frontend: `https://your-ui.vercel.app`
- Login and verify all features work

---

## ✅ Post-Deployment Checklist

- [ ] API health check passes
- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Data loads from database
- [ ] All pages accessible
- [ ] No CORS errors
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Team notified

---

## 🚨 Troubleshooting

### API not responding

1. Check Railway logs: `railway logs`
2. Verify environment variables set
3. Test health endpoint: `curl https://your-api/health`
4. Check Supabase connectivity

### Frontend shows API errors

1. Check browser console for CORS errors
2. Verify `VITE_API_URL` points to correct Railway URL
3. Verify `CORS_ORIGINS` includes your Vercel URL
4. Test API directly with curl

### Login fails

1. Verify Supabase Auth configured
2. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Check browser console for errors
4. Verify test user exists in Supabase

### Data not loading

1. Check database migrations applied
2. Verify RLS policies configured
3. Check user has correct tenant_id
4. Review API logs for errors

---

## 📊 Monitoring

### API (Railway)

```bash
railway logs
```

Or visit: Railway Dashboard → Deployments → Logs

### Frontend (Vercel)

```bash
vercel logs
```

Or visit: Vercel Dashboard → Deployments

### Database (Supabase)

Visit: Supabase Dashboard → Logs

---

## 🔄 Rollback Procedure

### Quick Rollback

**Railway (API):**
```bash
railway deploy --rollback
```

**Vercel (Frontend):**
```bash
vercel rollback
```

### Via Dashboard

1. Go to platform dashboard
2. Find Deployments
3. Select previous stable deployment
4. Click "Redeploy" or "Promote to Production"

---

## 💰 Cost Estimate

**Minimal Setup (MVP):**
- Railway (API): $5/month
- Vercel (Frontend): $0/month (Hobby tier)
- Supabase: $0/month (Free tier)
- **Total: $5/month**

**Production Setup:**
- Railway: $20/month
- Vercel: $20/month (Pro tier)
- Supabase: $25/month (Pro tier)
- **Total: $65/month**

See [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md) for detailed cost breakdown.

---

## 📚 Additional Resources

### Platform Documentation

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Framework Documentation

- [Hono Docs](https://hono.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [Vite Docs](https://vitejs.dev)

### Support

- Railway Discord: https://discord.gg/railway
- Vercel Discord: https://discord.gg/vercel
- Supabase Discord: https://discord.supabase.com

---

## 🎓 Learning Path

### Beginner

1. Start with [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)
2. Deploy to Railway (API) and Vercel (Frontend)
3. Test basic functionality
4. Learn from production experience

### Intermediate

1. Read [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md)
2. Set up monitoring and alerts
3. Configure CI/CD with GitHub Actions
4. Implement security hardening

### Advanced

1. Set up custom domains
2. Configure CDN and caching
3. Implement advanced monitoring (Sentry, LogRocket)
4. Set up multi-region deployment
5. Implement blue-green deployments
6. Configure auto-scaling

---

## 📞 Support

### Documentation Issues

If you find errors or have suggestions for this documentation:

1. Review existing docs for answers
2. Check troubleshooting sections
3. Review platform documentation
4. Contact team lead or DevOps

### Deployment Issues

If you encounter problems during deployment:

1. Check logs (Railway, Vercel, Supabase)
2. Review troubleshooting sections in docs
3. Verify environment variables
4. Test components individually
5. Consult rollback plan if needed

---

## 🔄 Documentation Updates

This documentation is maintained by the PayOS team. Last updated: **December 19, 2025**

**Recent Updates:**
- Added comprehensive deployment preparation guide
- Created quick start guide for fast deployment
- Added detailed environment variables reference
- Created printable deployment checklist
- Added GitHub Actions CI/CD workflows

**Changelog:** See individual documents for version history.

---

## ⚡ Quick Links

- [Quick Start](./DEPLOYMENT_QUICK_START.md) - Deploy in 15 minutes
- [Full Guide](./DEPLOYMENT_PREPARATION.md) - Complete documentation
- [Checklist](./DEPLOYMENT_CHECKLIST.md) - Print and follow
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Security Guide](../security/RLS_STRATEGY.md) - Security best practices
- [Testing Guide](./TEST_STATUS_REPORT.md) - Testing documentation

---

**Ready to deploy?** Start with [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)!

**Want to learn more?** Read [DEPLOYMENT_PREPARATION.md](./DEPLOYMENT_PREPARATION.md).

**Deploying now?** Print [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

---

**Version:** 1.0.0  
**Last Updated:** December 19, 2025  
**Maintained By:** PayOS Team

