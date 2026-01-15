# RLS Coverage Check Script

This script ensures that all tables in your database have Row Level Security (RLS) properly configured, both in migration files and in the live database.

## Features

1. **Migration File Analysis** - Scans SQL migration files to ensure:
   - All `CREATE TABLE` statements have corresponding `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Tables with RLS have at least one policy defined
   - Tables with RLS ideally have 4+ policies (SELECT, INSERT, UPDATE, DELETE)

2. **Live Database Validation** (optional) - Connects to Supabase to verify:
   - All tables in the database have RLS enabled
   - Tables with RLS have policies defined
   - All database tables are documented in migrations (catches tables created outside migration system)

## Usage

### Basic Check (Migrations Only)

```bash
cd apps/api
pnpm exec tsx scripts/check-rls-in-migrations.ts
```

This is fast and suitable for CI/CD pipelines. It only analyzes migration files without requiring database access.

### Full Check (Migrations + Database)

```bash
cd apps/api
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key \
  pnpm exec tsx scripts/check-rls-in-migrations.ts --db
```

This performs both migration file analysis and live database validation. Requires Supabase credentials.

## Environment Variables

For database checking, you need:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)

## Exit Codes

- `0` - All checks passed (warnings are allowed)
- `1` - Critical issues found (missing RLS or policies)

## Output Examples

### Success

```
🔍 Checking RLS coverage in migration files...

✅ accounts: RLS enabled, 2 policies
✅ transfers: RLS enabled, 2 policies
✅ wallets: RLS enabled, 2 policies

============================================================

✅ All tables have RLS enabled with appropriate policies!

📊 Summary: 45 tables checked in migrations
```

### Issues Found

```
🔍 Checking RLS coverage in migration files...

✅ accounts: RLS enabled, 2 policies
❌ settlement_holidays: RLS enabled, 0 policies

============================================================

🔍 Checking live database...

⚠️  Tables in database NOT TRACKED in migrations:
   ⚠️  settlement_holidays (created outside migration system)

============================================================

⚠️  Warnings:
   Table 'settlement_holidays' has RLS enabled but NO POLICIES

❌ Issues Found:
   Database table 'settlement_holidays' is not documented in any migration

💡 Fix: Add the following to your migration:
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "..." ON <table_name> FOR SELECT USING (...);
   ...

💡 For tables missing from migrations:
   Create a baseline migration documenting the existing table schema
```

## CI/CD Integration

### GitHub Actions

The check runs automatically on pull requests that modify migration files:

```yaml
# .github/workflows/rls-check.yml
- name: Check RLS Coverage in Migration Files
  run: |
    cd apps/api
    pnpm exec tsx scripts/check-rls-in-migrations.ts
```

To enable database checking in CI (optional):

```yaml
- name: Check RLS Coverage in Live Database
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: |
    cd apps/api
    pnpm exec tsx scripts/check-rls-in-migrations.ts --db
```

## How It Prevents Security Issues

### Issue 1: Tables Created Outside Migrations

**Problem**: Someone creates a table via Supabase Dashboard or SQL editor, forgetting to enable RLS.

**Detection**: With `--db` flag, the script compares database tables against migration files and flags any missing tables.

**Example**:
```
⚠️  Tables in database NOT TRACKED in migrations:
   ⚠️  settlement_holidays (created outside migration system)
```

### Issue 2: Missing RLS in Migrations

**Problem**: Migration creates a table but forgets `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

**Detection**: Script parses migration files and reports tables without RLS statements.

**Example**:
```
❌ Table 'new_table' (20260101_create_new_table.sql) has NO RLS enabled
```

### Issue 3: RLS Enabled But No Policies

**Problem**: RLS is enabled but no policies are defined, blocking all access.

**Detection**: Script counts policies per table and warns if zero.

**Example**:
```
⚠️  Table 'accounts' (20241201_create_accounts.sql) has RLS enabled but NO POLICIES
```

## Best Practices

1. **Always enable RLS for public tables**
   ```sql
   CREATE TABLE my_table (...);
   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Define at least one policy per table**
   ```sql
   CREATE POLICY "tenant_isolation" ON my_table
     FOR ALL USING (tenant_id = auth.jwt()->>'tenant_id');
   ```

3. **Use descriptive policy names**
   - `tenant_isolation` - Multi-tenant row isolation
   - `service_role_all` - Service role bypass
   - `authenticated_read` - Read-only access

4. **Document tables in migrations**
   - Even if a table was created manually, add a baseline migration
   - Use `CREATE TABLE IF NOT EXISTS` for safety

5. **Run full check locally before deploying**
   ```bash
   pnpm exec tsx scripts/check-rls-in-migrations.ts --db
   ```

## Troubleshooting

### "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required"

You're running with `--db` flag but missing credentials. Either:
- Set the environment variables
- Remove `--db` flag to check migrations only

### "Failed to query pg_tables"

Your service role key may not have sufficient permissions. Ensure you're using the service role key, not the anon key.

### "Table X not documented in migration"

A table exists in the database but isn't tracked in migration files. Create a baseline migration:

```sql
-- Migration: Baseline existing_table
CREATE TABLE IF NOT EXISTS existing_table (
  -- document the schema
);

ALTER TABLE existing_table ENABLE ROW LEVEL SECURITY;
-- Add policies...
```

## Related Documentation

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Security Best Practices](../../docs/security/RLS_STRATEGY.md)
- [Migration Guide](../../docs/guides/development/migrations.md)



