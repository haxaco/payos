# Epic 16 Validation Guide

This guide provides step-by-step validation procedures to verify all Epic 16 fixes are working correctly.

---

## Method 1: Supabase Dashboard Linter ⭐ EASIEST

### Steps:
1. Go to Supabase Dashboard
2. Navigate to: **Database** → **Database Health** → **Linter**
3. Click "Run Linter" or refresh

### Expected Results:
- **Security Warnings:** 0-1 (only `auth_leaked_password_protection` if not manually enabled)
- **Performance Warnings:** 0
- **Total Warnings:** 0-1

### Screenshot What You See:
If you see warnings, copy the JSON output and share it so we can fix any remaining issues.

---

## Method 2: SQL Verification Queries

### A. Verify All Functions Have search_path Protection

```sql
-- Check all functions for search_path setting
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ Protected'
    ELSE '❌ Missing'
  END as search_path_status,
  p.prosecdef as has_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    -- Epic 16 Round 1 (11 functions)
    'update_updated_at_column',
    'update_compliance_flags_updated_at',
    'update_team_invites_updated_at',
    'update_api_keys_updated_at',
    'log_audit',
    'credit_account',
    'debit_account',
    'hold_for_stream',
    'release_from_stream',
    'calculate_stream_balance',
    'record_agent_usage',
    -- Epic 16 Round 2 (10 functions)
    'update_account_relationships_updated_at',
    'get_dashboard_account_stats',
    'get_treasury_currency_summary',
    'get_stream_netflow',
    'check_payment_method_limits',
    'update_payment_method_spending',
    'get_card_activity',
    'get_card_spending_summary',
    'get_monthly_volume',
    'calculate_agent_effective_limits'
  )
ORDER BY 
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 0
    ELSE 1
  END,
  p.proname;
```

**Expected Result:** All 21 functions show "✅ Protected" and `has_security_definer = true`

---

### B. Verify RLS Policies Are Optimized

```sql
-- Check for optimized RLS policies (should use SELECT subquery)
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(select %' THEN '✅ Optimized'
    WHEN qual LIKE '%select auth.%' THEN '✅ Optimized'
    ELSE '⚠️ Not Optimized'
  END as optimization_status,
  LEFT(qual, 100) as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tenant_settings',
    'kya_tier_limits',
    'verification_tier_limits',
    'refunds',
    'disputes',
    'payment_methods',
    'transfer_schedules',
    'exports',
    'agent_usage',
    'security_events',
    'compliance_flags',
    'user_profiles',
    'team_invites',
    'api_keys',
    'account_relationships'
  )
ORDER BY 
  CASE 
    WHEN qual LIKE '%(select %' THEN 0
    ELSE 1
  END,
  tablename, 
  policyname;
```

**Expected Result:** All policies show "✅ Optimized"

---

### C. Check for Duplicate Policies

```sql
-- Verify no duplicate policies exist
SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count,
  ARRAY_AGG(policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'kya_tier_limits',
    'verification_tier_limits',
    'security_events'
  )
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;
```

**Expected Result:** 0 rows (no duplicates found)

---

### D. Count All Security-Related Functions

```sql
-- Count functions with proper security settings
SELECT 
  COUNT(*) as total_functions,
  COUNT(*) FILTER (WHERE pg_get_functiondef(p.oid) LIKE '%SET search_path%') as with_search_path,
  COUNT(*) FILTER (WHERE p.prosecdef = true) as with_security_definer,
  COUNT(*) FILTER (
    WHERE pg_get_functiondef(p.oid) LIKE '%SET search_path%' 
    AND p.prosecdef = true
  ) as fully_secured
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_updated_at_column', 'update_compliance_flags_updated_at',
    'update_team_invites_updated_at', 'update_api_keys_updated_at',
    'log_audit', 'credit_account', 'debit_account',
    'hold_for_stream', 'release_from_stream', 'calculate_stream_balance',
    'record_agent_usage', 'update_account_relationships_updated_at',
    'get_dashboard_account_stats', 'get_treasury_currency_summary',
    'get_stream_netflow', 'check_payment_method_limits',
    'update_payment_method_spending', 'get_card_activity',
    'get_card_spending_summary', 'get_monthly_volume',
    'calculate_agent_effective_limits'
  );
```

**Expected Result:**
```
total_functions | with_search_path | with_security_definer | fully_secured
----------------|------------------|----------------------|---------------
      21        |        21        |          21          |      21
```

---

### E. Verify RLS Policy Count Per Table

```sql
-- Check policy counts for critical tables
SELECT 
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(DISTINCT cmd::text) as operations
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tenant_settings',
    'account_relationships',
    'refunds',
    'disputes',
    'payment_methods',
    'agent_usage'
  )
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result:**
- `tenant_settings`: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- `account_relationships`: 4 policies
- `refunds`: 4 policies
- `disputes`: 4 policies
- `payment_methods`: 4 policies
- `agent_usage`: 4 policies

---

## Method 3: Performance Testing

### Test Query Performance Improvement

```sql
-- Test 1: Large query with RLS policy (should be fast now)
EXPLAIN ANALYZE
SELECT * FROM payment_methods 
WHERE tenant_id = 'your-tenant-id-here'
LIMIT 1000;
```

**What to Look For:**
- `auth.jwt()` or `get_user_tenant_id()` should appear only ONCE in the plan
- NOT once per row (no "SubPlan" for every row)

**Before Fix:**
```
SubPlan 1 (returns $0)
  ->  Result
        InitPlan 1 (returns $0)
          ->  Function Scan on auth.jwt()  <-- This was called 1000 times!
```

**After Fix:**
```
InitPlan 1 (returns $0)
  ->  Function Scan on auth.jwt()  <-- Only called once!
```

---

### Test 2: Benchmark Query Time

```sql
-- Run this multiple times and average the results

-- Query with many rows
\timing on

SELECT COUNT(*) FROM transfers 
WHERE tenant_id = (SELECT (auth.jwt() ->> 'app_tenant_id')::uuid)
  AND created_at > NOW() - INTERVAL '30 days';

\timing off
```

**Expected:** Consistent fast response times (< 100ms for typical datasets)

---

## Method 4: Migration History Verification

```sql
-- Check all Epic 16 migrations were applied
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%fix%'
   OR name LIKE '%optimize%'
   OR name LIKE '%search_path%'
ORDER BY inserted_at DESC
LIMIT 20;
```

**Expected Migrations to See:**
- `add_search_path_correct_signatures`
- `fix_remaining_rls_correct_columns`
- `remove_duplicate_policies`
- `fix_user_profiles_policy`
- `optimize_rls_settings_lookup`
- `optimize_rls_financial_tables`
- `optimize_rls_config_analytics`
- Plus others from earlier

---

## Method 5: Functional Testing

### Test 1: Verify Functions Still Work

```sql
-- Test a secured function works correctly
SELECT * FROM get_dashboard_account_stats('your-tenant-id-here');

-- Expected: Returns account statistics (not an error)
```

### Test 2: Verify RLS Policies Work

```sql
-- Test tenant isolation
-- (Run as different tenant users)
SELECT COUNT(*) FROM payment_methods;

-- Expected: Only sees own tenant's payment methods
```

### Test 3: Test Account Operations

```sql
-- Test credit_account (if you have test data)
SELECT credit_account(
  'account-uuid-here'::uuid,
  100.00,
  'test',
  gen_random_uuid(),
  'Test credit'
);

-- Expected: Returns TRUE, balance updated
```

---

## Method 6: Check Supabase Logs

### Via Supabase Dashboard:
1. Go to **Logs** → **Postgres Logs**
2. Look for any errors related to:
   - `search_path`
   - RLS policy failures
   - Function execution errors

**Expected:** No errors related to Epic 16 changes

---

## Quick Validation Script

Save this as `validate-epic16.sql` and run it:

```sql
-- Epic 16 Quick Validation Script
-- Run this to get a summary of all fixes

\echo '================================'
\echo 'Epic 16 Validation Report'
\echo '================================'
\echo ''

\echo '1. Functions with search_path Protection:'
SELECT 
  COUNT(*) FILTER (WHERE pg_get_functiondef(p.oid) LIKE '%SET search_path%') as protected,
  COUNT(*) as total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE pg_get_functiondef(p.oid) LIKE '%SET search_path%') / COUNT(*),
    1
  ) as percent_protected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname ~ '(update_|get_|check_|calculate_|credit_|debit_|hold_|release_|record_|log_)';

\echo ''
\echo '2. RLS Policies Optimized:'
SELECT 
  COUNT(*) FILTER (WHERE qual LIKE '%(select %') as optimized,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE qual LIKE '%(select %') / COUNT(*), 1) as percent_optimized
FROM pg_policies
WHERE schemaname = 'public';

\echo ''
\echo '3. Duplicate Policies:'
SELECT 
  COALESCE(SUM(duplicate_count), 0) as total_duplicates
FROM (
  SELECT COUNT(*) - 1 as duplicate_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename, cmd, qual
  HAVING COUNT(*) > 1
) sub;

\echo ''
\echo '4. Critical Tables with RLS:'
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('payment_methods', 'refunds', 'disputes', 'transfers')
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo 'Validation Complete!'
\echo 'Expected Results:'
\echo '  - Functions: 100% protected'
\echo '  - RLS Policies: 90%+ optimized'
\echo '  - Duplicates: 0'
\echo '  - Critical tables: 4 policies each'
\echo ''
```

---

## Passing Criteria

✅ **All Systems GO** if you see:
- Supabase Linter: 0-1 warnings
- Functions Protected: 21/21 (100%)
- RLS Optimized: 35+/35+ (100%)
- Duplicate Policies: 0
- All queries execute without errors
- Performance improved on large queries

❌ **Issues Found** if you see:
- More than 1 Supabase linter warning
- Any function missing `search_path`
- RLS policies not using `(select ...)`
- Duplicate policies
- Function errors
- Slow query performance

---

## Troubleshooting

### If You Still See Warnings:

1. **Copy the exact warning JSON** from Supabase Linter
2. **Run the specific validation query** for that function/table
3. **Share the results** and I'll fix the remaining issue

### Common Issues:

**Issue:** Function still shows mutable search_path
**Solution:** Rerun `ALTER FUNCTION ... SET search_path = ''`

**Issue:** RLS policy not optimized
**Solution:** Drop and recreate with `(select ...)`  pattern

**Issue:** Duplicate policies
**Solution:** Drop the older/redundant policy

---

## Final Validation Checklist

- [ ] Supabase Dashboard Linter shows 0-1 warnings
- [ ] All 21 functions have `search_path` protection
- [ ] All RLS policies use SELECT subquery pattern
- [ ] No duplicate policies exist
- [ ] Large queries perform well (< 100ms)
- [ ] All API endpoints still work correctly
- [ ] No errors in Supabase logs

**When all checkboxes are complete:** Epic 16 is validated! ✅

---

## Next Steps After Validation

1. ✅ Mark Epic 16 as complete in PRD
2. 📝 Archive Epic 16 documentation
3. 🔐 Enable leaked password protection (manual step)
4. 📊 Monitor performance metrics for improvements
5. 🎉 Celebrate! Database is now secure and optimized

---

**Questions?** Run the validation queries and share the results if anything looks unexpected!


