# 🤖 Gemini Testing Instructions - START HERE

**Date:** December 15, 2025  
**Status:** Ready for UI Testing  
**Your Mission:** Test the migrated pages to verify real API integration

---

## 🎯 What You're Testing

We've just completed **Stories 12.1-12.5** of the Mock-to-API Migration:
- ✅ **Accounts** - Now uses real API data
- ✅ **Transactions/Transfers** - Now uses real API data  
- ✅ **Cards/Payment Methods** - Now uses real API data

Your job is to **verify these pages work correctly** with real data from the database.

---

## 🚀 Quick Start

### 1. Application URLs
- **UI Dashboard**: http://localhost:3001
- **API Server**: http://localhost:4000

### 2. Test Data Available (Acme Corporation Tenant)
- **7 Accounts**: Maria Garcia, Carlos Martinez, Ana Silva, Juan Perez, Sofia Rodriguez, TechCorp Inc, StartupXYZ
- **5 Transfers**: Various statuses (completed, pending, failed)
- **4 Payment Methods**: Cards ending in 4521, 2847, 8834, 9182

### 3. What to Look For
✅ **Real data** (not hardcoded mock data)  
✅ **Loading states** (spinners/skeletons during fetch)  
✅ **Error handling** (retry buttons when API fails)  
✅ **Empty states** (friendly messages when no data)  
✅ **Security** (Cards: only last 4 digits, no full PAN/CVV)

---

## 📋 Priority Test Flows

**Go to:** `payos-ui/UI_TESTING_GUIDE.md`

**Run these flows IN ORDER:**

### Core Pages (MUST TEST)
1. **Flow 36**: Accounts Page - Real API Data
2. **Flow 37**: Account Detail Page - Real API Data
3. **Flow 38**: Transactions Page - Real API Data
4. **Flow 39**: Transaction Detail Page - Real API Data
5. **Flow 40**: Cards Page - Real API Data
6. **Flow 41**: Card Detail Page - Real API Data

### Edge Cases (SHOULD TEST)
7. **Flow 42**: Empty State Testing
8. **Flow 43**: Loading States Testing
9. **Flow 44**: End-to-End User Journey
10. **Flow 45**: API Integration Verification

---

## ✅ Success Criteria

After testing, you should be able to confirm:

### Data Display
- [ ] Accounts page shows **7 accounts** (not mock data)
- [ ] Transactions page shows **5 transfers** (real statuses)
- [ ] Cards page shows **4 payment methods** (real card numbers)
- [ ] All detail pages load correctly with real UUIDs in URL

### UI States
- [ ] Loading spinners appear during data fetch
- [ ] Error banners show when API fails (with retry button)
- [ ] Empty states have clear messaging
- [ ] Navigation works (breadcrumbs, back buttons)

### Security
- [ ] Cards show **ONLY last 4 digits** (no full PAN)
- [ ] No CVV visible anywhere
- [ ] All API calls include Authorization header

### Navigation
- [ ] Clicking account → goes to correct account detail
- [ ] Clicking transaction → goes to correct transaction detail
- [ ] Clicking card → goes to correct card detail
- [ ] No 404 errors on valid routes

---

## 🐛 Bug Reporting

If you find issues, report them in: `docs/reports/bug_list.md`

**Format:**
```markdown
### Bug #X: [Short Title]
- **Severity**: P0/P1/P2
- **Page**: /accounts or /transactions or /cards
- **Description**: What's wrong
- **Steps to Reproduce**: 
  1. Navigate to...
  2. Click...
  3. Observe...
- **Expected**: What should happen
- **Actual**: What actually happens
- **Screenshot**: (if applicable)
```

---

## 📚 Detailed Documentation

- **Full Testing Guide**: `payos-ui/UI_TESTING_GUIDE.md` (Flows 36-45)
- **Migration Plan**: `MOCK_TO_API_MIGRATION.md` (Stories 12.1-12.5)
- **API Documentation**: `PayOS_PRD_Development.md` (API specs)

---

## 🎉 When You're Done

Submit a test report with:
1. ✅ **Passed Tests**: List of flows that work correctly
2. 🐛 **Bugs Found**: List of issues discovered
3. 📊 **Summary**: Overall assessment (Ready for production? Needs fixes?)
4. 💡 **Recommendations**: Any improvements or concerns

---

## 🆘 Need Help?

**Can't access the application?**
- Check if servers are running: `lsof -i :3001` and `lsof -i :4000`
- **⚠️ IMPORTANT**: Make sure API has `.env` file (see setup below)
- Start UI: `cd payos-ui && pnpm dev`
- Start API: `cd apps/api && pnpm dev`

**API Server Setup (Required!):**
The API server needs environment variables. The `.env` file has been created for you at:
```
/Users/haxaco/Dev/PayOS/apps/api/.env
```

If you get "Missing Supabase environment variables" error:
```bash
# Verify .env exists
ls -la /Users/haxaco/Dev/PayOS/apps/api/.env

# If missing, see apps/api/SETUP.md for full setup instructions
```

**Credentials for Testing:**
- **Supabase URL**: `https://your-project.supabase.co`
- **Test User**: `haxaco@gmail.com` / `Market425!`
- **API Key (Acme Corp)**: `pk_test_GkRuyZ375fL5YLB6dtdztzQqpGPikXAadLaXGNp-5Kk`

**No data showing?**
- Verify database seeded: Check `apps/api/scripts/seed-database.ts`
- Check API health: `curl http://localhost:4000/health`
- Check accounts endpoint: `curl -H "Authorization: Bearer pk_test_..." http://localhost:4000/v1/accounts`

**Other issues?**
- Read `UI_TESTING_GUIDE.md` for detailed instructions
- Check browser console for errors (F12 → Console tab)
- Check Network tab for failed API calls (F12 → Network tab)

---

**Happy Testing! 🚀**

Your feedback is crucial to ensuring the PayOS dashboard works flawlessly with real data!

