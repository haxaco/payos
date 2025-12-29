# Story 16.5: Enable Leaked Password Protection

**Epic:** 16 - Database Function Security & Performance Hardening  
**Points:** 1  
**Priority:** P1  
**Status:** ⚠️ **Manual Configuration Required**

---

## Overview

Enable Supabase Auth's leaked password protection feature to prevent users from setting compromised passwords. This integrates with HaveIBeenPwned.org database.

---

## Configuration Steps

### 1. Access Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to **Authentication** → **Policies** → **Password Security**

### 2. Enable Leaked Password Protection

**Option A: Moderate (Recommended for Initial Rollout)**
- Warns users but allows compromised passwords
- Good for gradual rollout
- Doesn't block existing users

**Option B: Strict (Recommended for Production)**
- Blocks compromised passwords entirely
- Better security posture
- May require password resets for existing users

### 3. Configuration Settings

```javascript
// In Supabase Dashboard → Authentication → Password Security
{
  "password_requirements": {
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special": false
  },
  "leaked_password_protection": {
    "enabled": true,
    "mode": "strict" // or "moderate"
  }
}
```

### 4. Test the Feature

```bash
# Test with a known compromised password
curl -X POST https://your-project.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected response (strict mode):
{
  "error": "Password has been found in a data breach",
  "error_description": "This password has appeared in a data breach and cannot be used"
}
```

---

## Acceptance Criteria

- [x] Documented configuration steps
- [ ] **MANUAL:** Enable leaked password protection in Supabase Dashboard
- [ ] **MANUAL:** Configure protection level (strict or moderate)
- [ ] **MANUAL:** Test that users cannot set compromised passwords
- [ ] **MANUAL:** Verify error messages are user-friendly
- [ ] **MANUAL:** Test password reset flow with leaked password protection
- [ ] **MANUAL:** Add monitoring for blocked password attempts

---

## Error Messages

### User-Facing Messages

**Strict Mode:**
```
"This password has been found in a data breach and cannot be used. 
Please choose a different password."
```

**Moderate Mode:**
```
"Warning: This password has been found in a data breach. 
We recommend choosing a different password for better security."
```

---

## Monitoring

### Metrics to Track

1. **Blocked Password Attempts**
   - Count of passwords rejected due to breach
   - Track via Supabase Auth logs

2. **User Friction**
   - Number of signup/password reset retries
   - Average attempts before successful password

3. **Security Impact**
   - Reduction in account compromises
   - Comparison before/after enablement

### Supabase Dashboard Queries

```sql
-- Count blocked password attempts (if logging enabled)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as blocked_attempts
FROM auth.audit_log_entries
WHERE 
  action = 'user_signup_failed'
  AND error_message LIKE '%data breach%'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Documentation Updates

### For Developers

Add to `docs/security/PASSWORD_SECURITY.md`:

```markdown
## Leaked Password Protection

PayOS uses HaveIBeenPwned integration to prevent users from setting 
compromised passwords. This is configured in Supabase Auth settings.

**Mode:** Strict (blocks compromised passwords)

**User Impact:** Users will see an error if they attempt to use a 
password that has appeared in a known data breach.

**Developer Note:** This is a Supabase Auth feature and requires no 
code changes. Configuration is done via the Supabase Dashboard.
```

### For Users

Add to user-facing documentation:

```markdown
## Password Requirements

For your security, PayOS enforces the following password requirements:

- Minimum 8 characters
- Must contain uppercase and lowercase letters
- Must contain at least one number
- Cannot be a password that has appeared in a known data breach

If you see an error about your password being compromised, please 
choose a different, unique password.
```

---

## Reference Links

- [Supabase Password Security Docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#password-strength)

---

## Rollout Plan

### Phase 1: Enable Moderate Mode (Week 1)
- Enable with warnings only
- Monitor user feedback
- Track blocked attempts

### Phase 2: Switch to Strict Mode (Week 2)
- After validating moderate mode
- Communicate to users via email
- Provide password reset instructions

### Phase 3: Monitor & Optimize (Ongoing)
- Track metrics
- Adjust error messages based on feedback
- Document common user questions

---

## Notes

- This is a **manual configuration** in Supabase Dashboard
- No code changes or migrations required
- Feature is provided by Supabase Auth
- Uses k-anonymity model (doesn't send full passwords to HIBP)
- No performance impact on authentication flow

---

**Status:** Documentation complete. Manual configuration required in Supabase Dashboard.

**Assigned To:** DevOps / Platform Admin

**Completion Date:** TBD (after manual configuration)


