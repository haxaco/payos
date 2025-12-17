# RLS Testing Guide

## Overview

This guide provides procedures for testing Row-Level Security (RLS) policies to ensure proper tenant data isolation in PayOS.

---

## Quick Start

### Run All RLS Tests

```bash
cd apps/api
pnpm test:integration -- rls-isolation.test.ts
```

### Audit RLS Coverage

```bash
cd apps/api
psql $DATABASE_URL -f scripts/audit-rls-coverage.sql
```

---

## Test Scenarios

### 1. Cross-Tenant Data Access

**Goal:** Verify tenant A cannot access tenant B's data

**Procedure:**
1. Create two test tenants
2. Create test data for each tenant
3. Authenticate as tenant A
4. Attempt to query tenant B's data
5. Verify query returns 0 rows or fails

**Expected Result:** ✅ No data from tenant B is accessible

---

### 2. Direct ID Access

**Goal:** Verify users cannot access records by ID from other tenants

**Procedure:**
1. Create record for tenant A
2. Note the record ID
3. Authenticate as tenant B
4. Query for record using tenant A's ID
5. Verify query returns null/empty

**Expected Result:** ✅ Record not found

---

### 3. INSERT with Wrong tenant_id

**Goal:** Verify users cannot create records for other tenants

**Procedure:**
1. Authenticate as tenant A
2. Attempt to INSERT with tenant_id = tenant B
3. Verify INSERT fails

**Expected Result:** ✅ Error: "new row violates row-level security policy"

---

### 4. UPDATE Cross-Tenant

**Goal:** Verify users cannot update other tenants' records

**Procedure:**
1. Create record for tenant B
2. Authenticate as tenant A
3. Attempt to UPDATE tenant B's record
4. Verify UPDATE fails or affects 0 rows

**Expected Result:** ✅ Update blocked or no rows affected

---

### 5. DELETE Cross-Tenant

**Goal:** Verify users cannot delete other tenants' records

**Procedure:**
1. Create record for tenant B
2. Authenticate as tenant A
3. Attempt to DELETE tenant B's record
4. Verify DELETE fails or affects 0 rows

**Expected Result:** ✅ Delete blocked or no rows affected

---

## Test Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|--------|--------|--------|--------|--------|
| accounts | ✅ | ✅ | ✅ | ✅ | Tested |
| payment_methods | ✅ | ✅ | ✅ | ✅ | Tested |
| disputes | ✅ | ✅ | ✅ | ✅ | Tested |
| refunds | ✅ | ✅ | ✅ | ✅ | Tested |
| transfer_schedules | ✅ | ✅ | ✅ | ✅ | Tested |
| tenant_settings | ✅ | ✅ | ✅ | ✅ | Tested |
| exports | ✅ | ✅ | ✅ | ✅ | Tested |
| agent_usage | ✅ | ✅ | ✅ | ✅ | Tested |
| kya_tier_limits | ✅ | ❌ | ❌ | ❌ | Read-only |
| verification_tier_limits | ✅ | ❌ | ❌ | ❌ | Read-only |

---

## Manual Testing

### Setup Test Environment

```sql
-- Create test tenants
INSERT INTO tenants (name, status) VALUES
  ('Test Tenant A', 'active'),
  ('Test Tenant B', 'active');

-- Get tenant IDs
SELECT id, name FROM tenants WHERE name LIKE 'Test Tenant%';
```

### Test SELECT Isolation

```sql
-- Set tenant context (simulate JWT claim)
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "{tenant-a-uuid}"}';

-- Query accounts
SELECT * FROM accounts;
-- Should only return tenant A's accounts

-- Try to access tenant B's accounts directly
SELECT * FROM accounts WHERE tenant_id = '{tenant-b-uuid}';
-- Should return 0 rows
```

### Test INSERT Validation

```sql
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "{tenant-a-uuid}"}';

-- Try to insert with wrong tenant_id
INSERT INTO accounts (tenant_id, type, name) 
VALUES ('{tenant-b-uuid}', 'person', 'Hacker Account');
-- Should fail with RLS policy violation
```

### Test UPDATE Isolation

```sql
-- Get a record ID from tenant B
SELECT id FROM accounts WHERE tenant_id = '{tenant-b-uuid}' LIMIT 1;

-- Switch to tenant A context
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "{tenant-a-uuid}"}';

-- Try to update tenant B's record
UPDATE accounts 
SET name = 'Hacked Name' 
WHERE id = '{tenant-b-record-id}';
-- Should affect 0 rows
```

### Test DELETE Isolation

```sql
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "{tenant-a-uuid}"}';

-- Try to delete tenant B's record
DELETE FROM accounts WHERE id = '{tenant-b-record-id}';
-- Should affect 0 rows
```

---

## Automated Integration Tests

### Test Structure

```typescript
describe('RLS Isolation - {TableName}', () => {
  let tenant1Client: SupabaseClient;
  let tenant2Client: SupabaseClient;
  let record1Id: string;
  let record2Id: string;

  it('tenant 1 should only see their own records', async () => {
    const { data } = await tenant1Client
      .from('table_name')
      .select('*');
    
    expect(data?.every(r => r.tenant_id === tenant1Id)).toBe(true);
  });

  it('tenant 1 should NOT access tenant 2 record', async () => {
    const { data } = await tenant1Client
      .from('table_name')
      .select('*')
      .eq('id', record2Id)
      .single();
    
    expect(data).toBeNull();
  });

  // Add tests for INSERT, UPDATE, DELETE
});
```

### Running Tests

```bash
# Run all RLS tests
pnpm test:integration -- rls-isolation

# Run specific table tests
pnpm test:integration -- rls-isolation -t "Accounts"

# Run with coverage
pnpm test:integration:coverage -- rls-isolation
```

---

## CI/CD Integration

### Pre-Deployment Checks

Add to `.github/workflows/test.yml`:

```yaml
- name: Run RLS Isolation Tests
  run: |
    cd apps/api
    pnpm test:integration -- rls-isolation.test.ts
    
- name: Audit RLS Coverage
  run: |
    cd apps/api
    psql $DATABASE_URL -f scripts/audit-rls-coverage.sql
    
- name: Check RLS Coverage >= 100%
  run: |
    # Fail if any table without RLS
    result=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE relrowsecurity);")
    if [ "$result" -gt 0 ]; then
      echo "❌ Found tables without RLS!"
      exit 1
    fi
```

---

## Troubleshooting

### Test Fails: "Cannot read property 'tenant_id' of null"

**Cause:** Test data not created properly

**Solution:**
1. Check `beforeAll()` setup
2. Verify tenants and users are created
3. Ensure test data includes all required fields

### Test Fails: "Policy not found"

**Cause:** Migration not applied

**Solution:**
```bash
cd apps/api
# Check migration status
pnpm supabase migration list

# Apply migrations
pnpm supabase db push
```

### Test Passes but Manual Testing Fails

**Cause:** JWT claim not set correctly

**Solution:**
1. Verify `app_tenant_id` is in JWT token
2. Check Supabase auth hooks
3. Ensure JWT is properly signed

---

## Performance Testing

### Benchmark RLS Overhead

```sql
-- Without RLS context (service role)
EXPLAIN ANALYZE
SELECT * FROM accounts WHERE tenant_id = '{tenant-uuid}';

-- With RLS (user context)
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "{tenant-uuid}"}';
EXPLAIN ANALYZE
SELECT * FROM accounts;

-- Compare execution times
```

**Expected:** <1ms overhead with proper indexing

### Load Testing

```bash
# Run load test with multiple tenants
ab -n 1000 -c 10 \
  -H "Authorization: Bearer {jwt-token}" \
  http://localhost:4000/v1/accounts
```

---

## Security Audit Checklist

- [ ] All tenant-scoped tables have RLS enabled
- [ ] Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Lookup tables have read-only policies
- [ ] No tables allow public access (except auth.users)
- [ ] Service role is never exposed to clients
- [ ] JWT tokens contain `app_tenant_id` claim
- [ ] All policies use `auth.jwt() ->> 'app_tenant_id'`
- [ ] Indexes exist on all `tenant_id` columns
- [ ] Integration tests cover all critical tables
- [ ] CI/CD includes RLS verification

---

## Reporting

### Generate RLS Coverage Report

```bash
cd apps/api
psql $DATABASE_URL -f scripts/audit-rls-coverage.sql > rls-coverage-report.txt
```

### View Summary

```sql
SELECT 
  COUNT(*) AS total_tables,
  SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) AS tables_with_rls,
  ROUND(
    (SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100,
    2
  ) AS coverage_percent
FROM (
  SELECT 
    tablename,
    (SELECT relrowsecurity FROM pg_class 
     WHERE relname = tablename 
     AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) AS rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
) t;
```

---

## Best Practices

### ✅ DO
- Run RLS tests before every deployment
- Test with multiple tenant contexts
- Verify both positive and negative cases
- Include RLS tests in code review
- Document any exceptions or special cases
- Monitor RLS policy performance
- Keep test data isolated and clean

### ❌ DON'T
- Don't skip RLS tests
- Don't test only with single tenant
- Don't assume middleware is enough
- Don't modify policies without testing
- Don't use production data for testing
- Don't ignore test failures

---

## References

- [PayOS RLS Strategy](./RLS_STRATEGY.md)
- [Integration Test Suite](../../apps/api/tests/integration/rls-isolation.test.ts)
- [RLS Audit Script](../../apps/api/scripts/audit-rls-coverage.sql)
- PayOS PRD: Epic 15 - Row-Level Security Hardening

---

**Last Updated:** December 17, 2025
**Maintained By:** QA Team
**Review Frequency:** Quarterly

