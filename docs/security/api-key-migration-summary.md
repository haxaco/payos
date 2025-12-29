# 🚨 Security Incident + Key Migration Summary

**Date:** December 19, 2025  
**Action:** Fix leaked key + Migrate to better key system

---

## 🎯 What Happened

GitHub detected your leaked Supabase `service_role` key in the repository history. **Good news:** This is an opportunity to upgrade to Supabase's new, better key system!

---

## 🆕 The Better Way: New API Keys

Supabase now offers improved keys that solve many security problems:

### Old System (Legacy - JWT-based)
```
anon key:         eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **Problems:**
- Tightly coupled to JWT secret
- Can't rotate independently
- Difficult for mobile apps
- 10-year expiry
- Hard to handle securely

### New System (Recommended)
```
Publishable key: sb_publishable_1a2b3c4d...
Secret key:      sb_secret_1a2b3c4d...
```

✅ **Benefits:**
- Independent rotation (zero downtime!)
- Secret keys blocked in browser
- Mobile-friendly (no forced updates)
- Easy rollback
- Better security

**Source:** [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)

---

## 🚀 Your Action Plan

### Quick Fix (15 minutes)

Follow: **`QUICK_FIX.md`**

1. **Create NEW secret key** (not rotate old one!)
   - Go to API Keys tab (not Legacy)
   - Create new secret key (`sb_secret_...`)
   - Get publishable key (`sb_publishable_...`)

2. **Update environment files**
   - API: Use new secret key
   - Frontend: Use new publishable key

3. **Clean git history & force push**
   - Run `./clean-git-history.sh`
   - `git push origin main --force`

### Complete Migration (30 minutes)

Follow: **`MIGRATION_TO_NEW_KEYS.md`**

- Detailed step-by-step migration guide
- All environment files listed
- Production deployment updates
- Testing procedures
- Troubleshooting

---

## 📊 Key Comparison

| Feature | Legacy Keys | New Keys |
|---------|------------|----------|
| **Format** | JWT (long) | `sb_publishable_...` / `sb_secret_...` |
| **Rotation** | Requires JWT secret rotation | Independent, instant |
| **Downtime** | Yes (minutes to hours) | Zero |
| **Mobile Apps** | Forced update required | No update needed |
| **Browser Protection** | None | Secret keys auto-blocked |
| **Rollback** | Impossible | Easy |
| **Expiry** | 10 years | Managed by Supabase |

---

## 🔐 Security Levels

### Frontend (Public) - Use Publishable Key

```typescript
// payos-ui/src/hooks/api/useApi.ts
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Value: sb_publishable_xxx ✅
```

**Safe to expose in:**
- Web pages
- Mobile apps
- Desktop apps
- CLI tools
- GitHub source code

### Backend (Private) - Use Secret Key

```typescript
// apps/api/src/db/client.ts
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Value: sb_secret_xxx ✅
```

**Never expose in:**
- Browsers (automatically blocked!)
- Public source code
- Mobile app bundles
- Client-side JavaScript
- URLs or query params

---

## 📝 Environment Variables Changes

### Before (Legacy)

```bash
# Backend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### After (New System)

```bash
# Backend
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1a2b3c4d...
SUPABASE_ANON_KEY=sb_publishable_1a2b3c4d...

# Frontend
VITE_SUPABASE_ANON_KEY=sb_publishable_1a2b3c4d...
```

**No code changes needed!** Just update the environment variable values.

---

## ✅ Checklist

### Immediate (Security Fix)

- [ ] Create new secret key in Supabase
- [ ] Get publishable key from Supabase
- [ ] Update `apps/api/.env` with new keys
- [ ] Update `payos-ui/.env` with publishable key
- [ ] Run `./clean-git-history.sh`
- [ ] Force push to GitHub
- [ ] Wait 5-10 minutes
- [ ] Dismiss GitHub security alert
- [ ] Test API works locally
- [ ] Test frontend works locally

### Follow-up (Production)

- [ ] Update Railway environment variables
- [ ] Update Vercel environment variables
- [ ] Test production API
- [ ] Test production frontend
- [ ] Check Supabase logs for suspicious activity
- [ ] Document incident timeline

### Long-term (Prevention)

- [ ] Install git-secrets
- [ ] Set up pre-commit hooks
- [ ] Deactivate legacy keys (once confirmed new ones work)
- [ ] Update team documentation
- [ ] Train team on new key system

---

## 🎓 Key Concepts

### What is a Publishable Key?

- **Purpose:** Authenticates your application (not users)
- **Privilege:** Low - respects Row Level Security
- **Use:** Frontend, mobile apps, public components
- **Format:** `sb_publishable_...`
- **Can be exposed:** Yes, safely in source code

### What is a Secret Key?

- **Purpose:** Elevated access for backend operations
- **Privilege:** High - bypasses Row Level Security
- **Use:** Backend only (servers, Edge Functions, APIs)
- **Format:** `sb_secret_...`
- **Can be exposed:** NO! Backend only, auto-blocked in browsers

### How They Work Together

```
User → Frontend (publishable key) → API (secret key) → Database
      ↓ RLS enforced              ↓ RLS bypassed     ↓ Full access
```

---

## 📚 Documentation Files

1. **`QUICK_FIX.md`** ⭐ - Start here for fast fix (15 min)
2. **`MIGRATION_TO_NEW_KEYS.md`** - Complete migration guide
3. **`SECURITY_FIX_CHECKLIST.md`** - Detailed security checklist
4. **`SECURITY_INCIDENT_RESPONSE.md`** - Full incident response guide
5. **`clean-git-history.sh`** - Automated cleanup script

---

## 🔗 Resources

- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys)
- [Why Migrate from Legacy Keys](https://supabase.com/docs/guides/api/api-keys#why-are-anon-and-service_role-jwt-based-keys-no-longer-recommended)
- [Security Best Practices](https://supabase.com/docs/guides/api/api-keys#best-practices-for-handling-secret-keys)

---

## 💡 Pro Tips

1. **Create multiple secret keys** for different backend services
   - One for API server
   - One for batch jobs
   - One for admin tools
   - Easier to rotate if one is compromised

2. **Monitor "Last Used" indicators** in Supabase Dashboard
   - Helps identify which keys are active
   - Safe to delete unused keys

3. **Test locally first** before updating production
   - Verify new keys work
   - Check all features
   - Then update production

4. **Keep legacy keys active during migration**
   - Both old and new work simultaneously
   - Zero downtime transition
   - Deactivate old keys only after confirming new ones work

---

## 🎉 Why This Is Actually Good

While a security incident is stressful, you're now:

✅ **More secure** - Better key system  
✅ **More flexible** - Easy rotation, no downtime  
✅ **Mobile-ready** - Can rotate without forcing app updates  
✅ **Future-proof** - Using Supabase's recommended approach  
✅ **Better protected** - Secret keys auto-blocked in browsers  

You've turned a security incident into a security **upgrade**!

---

**Next Step:** Open `QUICK_FIX.md` and follow the 3 steps!

**Timeline:** ~15 minutes to resolve  
**Difficulty:** Easy (scripts provided)  
**Risk:** Low (both key systems work simultaneously)

---

**Status:** Ready to execute  
**Priority:** HIGH  
**Last Updated:** December 19, 2025

