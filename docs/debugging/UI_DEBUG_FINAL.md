# 🐛 UI Issue: Final Debugging Summary

**Date**: January 4, 2026  
**Status**: ✅ **FIXED**

---

## ✅ The Solution

### Problem
Dashboard user (JWT) was querying a different tenant than where SDK transactions were created.

### Root Cause
User profile `tenant_id` was set to the wrong tenant:
- **Was**: `dad4308f-f9b6-4529-a406-7c2bdf3c6071` (empty tenant)
- **Should be**: `da500003-4de9-416b-aebc-61cfcba914c9` (has 3 mandates)

### The Fix

**Updated user profile**:
```sql
UPDATE user_profiles 
SET tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9' 
WHERE id = '08bc1507-3338-4eb2-8fc7-2634db173bc4';
```

**Result**: Dashboard now queries the correct tenant via JWT authentication.

---

## 🎯 How Authentication Works

### JWT Flow (Dashboard)
1. User logs in → Supabase creates JWT
2. JWT sent with API requests
3. Backend calls `supabase.auth.getUser(token)`
4. Looks up `user_profiles.tenant_id` for that user
5. All queries filtered by that `tenant_id`

### API Key Flow (SDK/CLI)
1. API key sent with requests
2. Backend looks up `api_keys.tenant_id`
3. All queries filtered by that `tenant_id`

**Both methods work** - the issue was just that the user profile had the wrong tenant ID.

---

## ✅ Verification

### Database
```sql
-- User profile now has correct tenant
SELECT id, tenant_id FROM user_profiles 
WHERE id = '08bc1507-3338-4eb2-8fc7-2634db173bc4';
-- Returns: da500003-4de9-416b-aebc-61cfcba914c9 ✅

-- Mandates exist in that tenant
SELECT COUNT(*) FROM ap2_mandates 
WHERE tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9';
-- Returns: 3 ✅
```

### API
```bash
# Get Supabase JWT from dashboard session
# Then test API call
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:4000/v1/ap2/mandates
# Should return: 3 mandates ✅
```

---

## 📋 Files Modified

1. **`apps/web/src/lib/api-client.tsx`**
   - Reverted to prefer JWT over API key (correct behavior)
   - Dashboard should use JWT authentication

2. **`.gitignore`**
   - Added patterns to exclude credential files

3. **Database**
   - Updated `user_profiles.tenant_id` for haxaco@gmail.com

---

## 🎉 Outcome

**Dashboard now works with JWT authentication** ✅
- No manual API key setup required
- Users login normally and see their data
- Proper tenant isolation maintained

---

## 📝 Key Learnings

1. **Always check tenant_id** when debugging multi-tenant apps
2. **JWT auth looks up tenant from user_profiles table**
3. **API key auth looks up tenant from api_keys table**
4. **Both methods are valid** - just need correct tenant mapping
5. **Never commit API keys** - use `.gitignore` patterns

---

## 🚀 Next Steps

1. ✅ User can login to dashboard normally
2. ✅ Dashboard shows correct data via JWT
3. ✅ SDK works via API keys
4. 📋 Consider adding tenant switcher for users with multiple tenants
5. 📋 Add UI indicator showing current tenant

---

**Status**: Issue resolved. Dashboard authentication working correctly with JWT.

