# PayOS Deployment Checklist

**Print this checklist and check off items as you complete them.**

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`pnpm test`)
- [ ] Integration tests passing (`pnpm test:integration`)
- [ ] No linter errors (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Local build succeeds (`pnpm build`)
- [ ] All dependencies up to date (`pnpm outdated`)
- [ ] Security audit clean (`pnpm audit`)
- [ ] Code reviewed and approved

### Database

- [ ] All migrations written and tested locally
- [ ] Migrations applied to production Supabase (`supabase db push`)
- [ ] RLS policies verified (`pnpm tsx scripts/check-rls-in-migrations.ts`)
- [ ] All tables have RLS enabled
- [ ] Production seed data prepared (if needed)
- [ ] Database backups configured in Supabase
- [ ] Test restore procedure verified

### Security

- [ ] Demo/test API keys rotated
- [ ] Service role key secured (not in git)
- [ ] CORS origins configured for production domains
- [ ] Rate limiting configured (optional: Redis)
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers configured
- [ ] Supabase Auth configured (email, redirects)
- [ ] Session timeout configured
- [ ] Password requirements enforced

### Accounts & Services

- [ ] Railway account created
- [ ] Vercel account created
- [ ] Supabase production project ready
- [ ] Custom domains purchased (optional)
- [ ] DNS configured (optional)
- [ ] SSL certificates ready (automatic on Vercel/Railway)

### Configuration Files

- [ ] `.env.example` files created for all apps
- [ ] `railway.json` created for API
- [ ] `nixpacks.toml` created for API
- [ ] `vercel.json` created for frontends
- [ ] GitHub Actions workflows created (optional)
- [ ] `.gitignore` includes `.env` files

### Documentation

- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment runbook reviewed (DEPLOYMENT_PREPARATION.md)
- [ ] Team notified of deployment plan
- [ ] Rollback plan documented
- [ ] Post-deployment verification steps documented

---

## 🚀 Deployment Steps

### Phase 1: API Deployment (Railway)

- [ ] Railway CLI installed (`npm i -g @railway/cli`)
- [ ] Railway account linked (`railway login`)
- [ ] Project initialized (`railway init`)
- [ ] Environment variables set in Railway Dashboard:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `NODE_ENV=production`
  - [ ] `API_PORT=4000`
  - [ ] `API_HOST=0.0.0.0`
  - [ ] `CORS_ORIGINS` (placeholder, update after frontend deployment)
  - [ ] `DASHBOARD_URL` (placeholder, update after frontend deployment)
  - [ ] `MOCK_SCHEDULED_TRANSFERS=false`
- [ ] API deployed (`railway up`)
- [ ] Deployment succeeded (check Railway Dashboard)
- [ ] Custom domain configured (optional)
- [ ] API URL saved: ___________________________________________
- [ ] Health check passed (`curl https://your-api.railway.app/health`)
- [ ] API endpoint tested with authentication

### Phase 2: Main UI Deployment (Vercel)

- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Project initialized (`vercel`)
- [ ] Project name set: `payos-ui`
- [ ] Environment variables set in Vercel Dashboard:
  - [ ] `VITE_API_URL` (use Railway API URL from Phase 1)
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Deployed to production (`vercel --prod`)
- [ ] Deployment succeeded (check Vercel Dashboard)
- [ ] Custom domain configured (optional)
- [ ] Main UI URL saved: ___________________________________________
- [ ] Application loads in browser
- [ ] No console errors
- [ ] Assets loading correctly

### Phase 3: Web Dashboard Deployment (Vercel)

- [ ] Project initialized (`vercel`)
- [ ] Project name set: `payos-web`
- [ ] Environment variables set in Vercel Dashboard:
  - [ ] `NEXT_PUBLIC_API_URL` (use Railway API URL)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL`
- [ ] Deployed to production (`vercel --prod`)
- [ ] Deployment succeeded (check Vercel Dashboard)
- [ ] Custom domain configured (optional)
- [ ] Web Dashboard URL saved: ___________________________________________
- [ ] Application loads in browser
- [ ] No console errors

### Phase 4: CORS Configuration

- [ ] Frontend URLs collected from Phases 2 & 3
- [ ] `CORS_ORIGINS` updated in Railway Dashboard
- [ ] `DASHBOARD_URL` updated in Railway Dashboard
- [ ] API redeployed (automatic on Railway)
- [ ] CORS verified (no browser console errors when calling API)

---

## ✅ Post-Deployment Verification

### API Verification

- [ ] Health check endpoint responds (`/health`)
- [ ] Authentication works (test with API key)
- [ ] Accounts endpoint returns data (`/v1/accounts`)
- [ ] Transfers endpoint works (`/v1/transfers`)
- [ ] Disputes endpoint works (`/v1/compliance/disputes`)
- [ ] Compliance flags endpoint works (`/v1/compliance/flags`)
- [ ] Error handling works (test 404, 401, 500)
- [ ] Scheduled transfer worker running (check logs)
- [ ] API response times acceptable (<500ms)

### Frontend Verification (Main UI)

- [ ] Application loads without errors
- [ ] Login page renders
- [ ] Login works with test credentials
  - Email: `beta@example.com`
  - Password: `Password123!`
- [ ] Dashboard page loads
- [ ] Dashboard shows real data (not loading state)
- [ ] Navigation works (all menu items)
- [ ] Accounts page loads and shows data
- [ ] Account detail page loads
- [ ] Transfers page loads and shows data
- [ ] Transfer detail page loads
- [ ] Agents page loads and shows data
- [ ] Treasury page loads
- [ ] Cards page loads
- [ ] Disputes page loads
- [ ] Compliance page loads
- [ ] Reports page loads
- [ ] Settings page loads
- [ ] Logout works
- [ ] Session persistence works (refresh page)
- [ ] No console errors
- [ ] No network errors
- [ ] Images and assets load correctly

### Frontend Verification (Web Dashboard)

- [ ] Application loads without errors
- [ ] All pages accessible
- [ ] API connection works
- [ ] Authentication works
- [ ] No console errors

### Database Verification

- [ ] Can connect to Supabase from API
- [ ] RLS policies enforce access control
- [ ] Data queries return correct results
- [ ] Tenant isolation works
- [ ] Audit logs created (if configured)

### Performance Verification

- [ ] API response times <500ms
- [ ] Frontend loads in <3 seconds
- [ ] No slow queries (check Supabase logs)
- [ ] Assets cached correctly
- [ ] Images optimized and loading fast

### Security Verification

- [ ] HTTPS enforced on all endpoints
- [ ] Security headers present (check browser DevTools)
- [ ] CORS working correctly
- [ ] API keys not exposed in frontend
- [ ] Service role key not exposed
- [ ] Rate limiting working (optional)
- [ ] Auth tokens expire correctly
- [ ] Logout clears session

---

## 📊 Monitoring Setup

### Railway (API)

- [ ] Logs accessible (`railway logs`)
- [ ] Alerts configured:
  - [ ] High CPU usage (>80%)
  - [ ] High memory usage (>80%)
  - [ ] Error rate spikes
  - [ ] Deployment failures
- [ ] Health check monitoring enabled
- [ ] Uptime monitoring configured (optional: UptimeRobot)

### Vercel (Frontend)

- [ ] Logs accessible (`vercel logs`)
- [ ] Web Analytics enabled
- [ ] Error tracking configured (optional: Sentry)
- [ ] Performance monitoring enabled
- [ ] Build notifications enabled

### Supabase (Database)

- [ ] Database logs accessible
- [ ] API logs accessible
- [ ] Auth logs accessible
- [ ] Log retention configured (7-30 days)
- [ ] Query performance monitoring enabled
- [ ] Backup alerts configured

### Optional Monitoring

- [ ] Sentry configured for error tracking
- [ ] LogRocket configured for session replay
- [ ] Google Analytics configured
- [ ] Custom alerting set up (PagerDuty, Slack)
- [ ] Status page created (optional)

---

## 🔐 Security Hardening

- [ ] All demo/test API keys rotated
- [ ] Production API keys generated
- [ ] Service role key secured
- [ ] Environment variables not exposed
- [ ] Secrets stored securely
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] IP whitelisting configured (if needed)
- [ ] WAF configured (optional)
- [ ] DDoS protection enabled
- [ ] SSL/TLS certificates valid
- [ ] Security audit scheduled

---

## 📝 Documentation & Communication

- [ ] Deployment notes documented
- [ ] Production URLs documented
- [ ] Environment variables documented
- [ ] Team notified of successful deployment
- [ ] Stakeholders notified
- [ ] Users notified (if applicable)
- [ ] Changelog updated
- [ ] Release notes published
- [ ] Support team trained
- [ ] Incident response plan reviewed

---

## 🔄 CI/CD Setup (Optional)

- [ ] GitHub Actions workflows configured
- [ ] Secrets added to GitHub:
  - [ ] `RAILWAY_TOKEN`
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
  - [ ] `VERCEL_ORG_ID_WEB`
  - [ ] `VERCEL_PROJECT_ID_WEB`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Test workflow triggered on push to main
- [ ] Deploy workflow triggered after tests pass
- [ ] Notifications configured (Slack, email)
- [ ] Branch protection rules configured
- [ ] Code review required before merge

---

## 🚨 Rollback Plan

- [ ] Rollback procedure documented
- [ ] Rollback tested in staging
- [ ] Previous deployment tagged/saved
- [ ] Database backup taken before deployment
- [ ] Rollback contacts identified
- [ ] Rollback communication plan ready

### Rollback Triggers

- [ ] API health check fails for >5 minutes
- [ ] Error rate >5% for >5 minutes
- [ ] Critical bug identified
- [ ] Security vulnerability discovered
- [ ] Database corruption detected

### Rollback Procedure

1. [ ] Execute rollback command (Railway/Vercel)
2. [ ] Verify previous version deployed
3. [ ] Test critical functionality
4. [ ] Monitor error rates
5. [ ] Notify team and stakeholders
6. [ ] Investigate root cause
7. [ ] Document incident
8. [ ] Schedule post-mortem

---

## 📅 Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Monitor logs for errors
- [ ] Watch error rates and performance
- [ ] Respond to any user reports
- [ ] Verify all features working
- [ ] Check database performance
- [ ] Review security logs

### Short-term (Week 1)

- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Address any issues discovered
- [ ] Gather user feedback
- [ ] Plan next iteration
- [ ] Update documentation as needed

### Long-term (Month 1)

- [ ] Review costs and optimize
- [ ] Conduct security audit
- [ ] Review and improve monitoring
- [ ] Plan scaling strategy
- [ ] Document lessons learned
- [ ] Schedule team retrospective

---

## 🎯 Success Criteria

### Deployment Success

- [ ] All services deployed successfully
- [ ] All health checks passing
- [ ] No critical errors in logs
- [ ] All features accessible
- [ ] Performance meets SLAs
- [ ] Security measures in place

### Business Success

- [ ] Users can log in
- [ ] Users can view data
- [ ] Users can perform key actions
- [ ] No data loss
- [ ] No security breaches
- [ ] Positive user feedback

---

## 📞 Emergency Contacts

**Fill in your team's contact information:**

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Tech Lead | _____________ | _____________ | _____________ |
| DevOps | _____________ | _____________ | _____________ |
| Database Admin | _____________ | _____________ | _____________ |
| Security Lead | _____________ | _____________ | _____________ |
| Product Owner | _____________ | _____________ | _____________ |

---

## 🔗 Quick Links

**Fill in your production URLs:**

- **Main UI:** _____________________________________________
- **Web Dashboard:** _____________________________________________
- **API:** _____________________________________________
- **Railway Dashboard:** https://railway.app/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Monitoring Dashboard:** _____________________________________________
- **Status Page:** _____________________________________________

---

**Deployment Date:** ___________________  
**Deployed By:** ___________________  
**Approved By:** ___________________  

**Notes:**

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0

