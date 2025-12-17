# Row-Level Security (RLS) Strategy

## Overview

PayOS implements Row-Level Security (RLS) as the **last line of defense** for tenant data isolation. RLS policies are enforced at the database level, ensuring that even if application-level checks fail, users can only access data belonging to their tenant.

## Architecture

### Authentication Flow

```
User Login
    ↓
Supabase Auth
    ↓
JWT Token (with app_tenant_id claim)
    ↓
API Request
    ↓
Auth Middleware (validates JWT)
    ↓
Database Query
    ↓
RLS Policies (enforces tenant_id check)
    ↓
Data Access
```

### JWT Claims

Every authenticated user's JWT contains an `app_tenant_id` claim that identifies their tenant:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "app_tenant_id": "tenant-uuid",
  "role": "authenticated"
}
```

RLS policies extract this claim using:
```sql
(auth.jwt() ->> 'app_tenant_id')::uuid
```

---

## Policy Patterns

### Standard Tenant-Scoped Table

For tables with a `tenant_id` column, implement **4 standard policies**:

#### 1. SELECT Policy
```sql
CREATE POLICY "Tenants can view their own {table}" ON {table_name}
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);
```

#### 2. INSERT Policy
```sql
CREATE POLICY "Tenants can insert their own {table}" ON {table_name}
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);
```

#### 3. UPDATE Policy
```sql
CREATE POLICY "Tenants can update their own {table}" ON {table_name}
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);
```

#### 4. DELETE Policy
```sql
CREATE POLICY "Tenants can delete their own {table}" ON {table_name}
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);
```

### Lookup Tables (No tenant_id)

For reference tables without tenant data:

#### Read-Only Access
```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view {table}" ON {table_name}
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies = denied by default
-- Only service role can modify
```

---

## Protected Tables

### Financial Data (Critical)
| Table | RLS | Policies | Contains |
|-------|-----|----------|----------|
| `payment_methods` | ✅ | 4 | Bank accounts, cards, wallets |
| `refunds` | ✅ | 4 | Refund transactions |
| `transfer_schedules` | ✅ | 4 | Scheduled payments |

### Legal & Compliance
| Table | RLS | Policies | Contains |
|-------|-----|----------|----------|
| `disputes` | ✅ | 4 | Dispute records |
| `compliance_flags` | ✅ | 4 | Compliance flags |

### Configuration & Analytics
| Table | RLS | Policies | Contains |
|-------|-----|----------|----------|
| `tenant_settings` | ✅ | 4 | Tenant configuration |
| `exports` | ✅ | 4 | Data exports |
| `agent_usage` | ✅ | 4 | Usage statistics |

### Core Platform
| Table | RLS | Policies | Contains |
|-------|-----|----------|----------|
| `tenants` | ✅ | 4 | Tenant records |
| `accounts` | ✅ | 4 | User accounts |
| `transfers` | ✅ | 4 | Transactions |
| `streams` | ✅ | 4 | Payment streams |
| `agents` | ✅ | 4 | Payment agents |
| `documents` | ✅ | 4 | Generated documents |
| `audit_log` | ✅ | 4 | Audit trail |
| `user_profiles` | ✅ | 4 | User profiles |
| `api_keys` | ✅ | 4 | API keys |
| `security_events` | ✅ | 4 | Security logs |
| `team_invites` | ✅ | 4 | Team invitations |
| `ledger_entries` | ✅ | 4 | Ledger entries |
| `quotes` | ✅ | 4 | FX quotes |
| `stream_events` | ✅ | 4 | Stream events |

### Reference Data
| Table | RLS | Policies | Contains |
|-------|-----|----------|----------|
| `kya_tier_limits` | ✅ | 1 (SELECT) | Agent tier limits |
| `verification_tier_limits` | ✅ | 1 (SELECT) | Account tier limits |

**Total: 24 tables, all with RLS enabled** ✅

---

## Migration Checklist

When creating a new table with tenant data:

- [ ] Add `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- [ ] Enable RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
- [ ] Create 4 standard policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Test with multi-tenant scenarios
- [ ] Add indexes: `CREATE INDEX idx_{table}_tenant_id ON {table}(tenant_id);`
- [ ] Update RLS audit script
- [ ] Document in this file

---

## Service Role Access

The **service role** key bypasses RLS and should only be used for:
- System operations (migrations, seeding)
- Admin operations (cross-tenant queries)
- Background jobs (cleanup, aggregations)

**Never expose the service role key to clients or frontend applications.**

---

## Testing

### Manual Testing

```sql
-- Switch to tenant context
SET LOCAL "request.jwt.claims" = '{"app_tenant_id": "tenant-uuid"}';

-- Try to access data
SELECT * FROM accounts WHERE tenant_id != 'tenant-uuid';
-- Should return 0 rows

-- Try to insert with wrong tenant_id
INSERT INTO accounts (tenant_id, ...) VALUES ('other-tenant-uuid', ...);
-- Should fail
```

### Automated Testing

Run the integration test suite:
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

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause:** Trying to INSERT/UPDATE with a `tenant_id` that doesn't match the JWT claim.

**Solution:** Ensure the `tenant_id` in your INSERT/UPDATE matches `auth.jwt() ->> 'app_tenant_id'`.

### Issue: Query returns 0 rows unexpectedly

**Cause:** RLS policy is blocking access.

**Solution:**
1. Verify JWT contains `app_tenant_id` claim
2. Check that `tenant_id` in database matches JWT claim
3. Verify RLS policies are correct

### Issue: Service role queries are slow

**Cause:** Service role bypasses RLS but still needs proper indexes.

**Solution:** Add indexes on `tenant_id` columns.

---

## Security Considerations

### ✅ DO
- Always use JWT authentication for user requests
- Set `app_tenant_id` during user signup
- Test RLS policies with multiple tenants
- Use service role only for admin operations
- Add `tenant_id` to all new tables

### ❌ DON'T
- Don't trust client-supplied `tenant_id` values
- Don't expose service role key
- Don't disable RLS in production
- Don't skip testing with multiple tenants
- Don't assume middleware is sufficient

---

## Performance

RLS policies are highly optimized by PostgreSQL:
- Indexes on `tenant_id` ensure fast filtering
- Query planner considers RLS in optimization
- Minimal overhead compared to application-level checks

**Benchmark:** RLS adds <1ms overhead per query with proper indexing.

---

## Compliance

RLS implementation helps meet compliance requirements for:
- **SOC 2 Type II:** Data isolation controls
- **GDPR:** Tenant data segregation
- **PCI-DSS:** Cardholder data protection (payment_methods table)
- **HIPAA:** If handling healthcare data

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- PayOS PRD: Epic 15 - Row-Level Security Hardening

---

**Last Updated:** December 17, 2025
**Maintained By:** Security Team
**Review Frequency:** Quarterly

