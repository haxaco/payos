# Database Seeding Scripts

## Overview

This directory contains scripts for seeding the Supabase database with test data for development and testing.

## Usage

### Seed Database

Populates the database with realistic test data including tenants, accounts, transfers, payment methods, agents, and streams.

```bash
# From the root of the project
cd apps/api
pnpm seed:db
```

Or from the project root:
```bash
pnpm --filter @payos/api seed:db
```

### Prerequisites

1. **Environment Variables:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (NOT anon key)

2. **Database Tables:**
   - All tables must exist (run migrations first)
   - Tables: `tenants`, `accounts`, `transfers`, `ledger_entries`, `payment_methods`, `agents`, `streams`

### What Gets Seeded

The script creates:

#### 3 Test Tenants:
1. **Acme Corporation** (`acme-corp`)
   - 7 accounts (5 persons, 2 businesses)
   - 5 transfers (completed, pending, flagged)
   - 4 payment methods (cards)
   - 3 agents (payment, treasury, compliance)
   - 2 active payment streams
   
2. **TechCorp Inc** (`techcorp-inc`)
   - Empty for now (can be expanded)
   
3. **Demo Organization** (`demo-org`)
   - Empty for now (reserved for demos)

#### Account Data:
- **Persons**: Maria Garcia (ARG), Carlos Martinez (COL), Ana Silva (BRA), Juan Perez (MEX), Sofia Rodriguez (USA)
- **Businesses**: TechCorp Inc (USA), StartupXYZ (USA)

Each account has:
- Complete address information
- Verification status (tier 1-3)
- Email and phone
- KYC/KYB status

#### Transfer Data:
- Various statuses: completed, pending, flagged
- Different amounts and corridors
- Linked to sender/recipient accounts
- Creates corresponding ledger entries

#### Payment Methods:
- Virtual and physical cards
- Different statuses (active, frozen)
- Linked to specific accounts
- Realistic card numbers (last 4 digits)

#### Agents:
- Payment agent (active)
- Treasury agent (active)
- Compliance agent (paused)
- Each has unique auth token (printed during seeding)

#### Streams:
- Monthly recurring payments
- Active streams between business → persons
- Realistic amounts and schedules

### Idempotency

The script is idempotent - you can run it multiple times safely:
- Checks if tenants already exist before inserting
- Skips creating duplicate accounts (by email)
- Skips creating duplicate payment methods (by last4)
- Will not create duplicate data

### API Keys

Each tenant gets 2 API keys automatically:
- **Test Key** (`pk_test_...`) - For development/testing
- **Live Key** (`pk_live_...`) - For production simulation

Keys are printed to console during seeding. Save them for API testing!

Example output:
```
✓ Created tenant: Acme Corporation (tenant_id_here)
  Test API Key: pk_test_ABC123...
  Live API Key: pk_live_XYZ789...
```

### Re-seeding

To completely re-seed:

1. Delete test tenants from Supabase dashboard:
   ```sql
   DELETE FROM tenants WHERE slug IN ('acme-corp', 'techcorp-inc', 'demo-org');
   ```
   (This will cascade delete all related data)

2. Run seed script again:
   ```bash
   pnpm seed:db
   ```

### Using Seeded Data

After seeding, you can:

1. **Test API endpoints:**
   ```bash
   curl -H "Authorization: Bearer pk_test_..." \
        http://localhost:4000/v1/accounts
   ```

2. **Login to dashboard:**
   - Admin users are created for each tenant
   - Check console output for credentials

3. **Test tenant isolation:**
   - Use different tenant API keys
   - Verify you only see that tenant's data

### Troubleshooting

**Error: Missing environment variables**
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check `.env` file in `apps/api/`

**Error: Table does not exist**
- Run database migrations first
- Check Supabase dashboard for table existence

**Error: Foreign key constraint**
- Ensure all referenced tables exist
- Check database migration order

**Script hangs or times out**
- Check network connection to Supabase
- Verify service role key has correct permissions
- Check Supabase project is not paused

### Adding More Seed Data

To add more data to the seed script:

1. Edit `scripts/seed-database.ts`
2. Add data to the appropriate arrays (e.g., `ACME_ACCOUNTS`)
3. Follow existing patterns for data structure
4. Test locally before committing

### Future Enhancements

- [ ] Add CLI flags for selective seeding (e.g., `--tenants-only`)
- [ ] Add data for TechCorp Inc and Demo Org tenants
- [ ] Add seed data for disputes (once API is ready)
- [ ] Add seed data for documents
- [ ] Add configurable seed data size (small, medium, large)
- [ ] Add seed data export (backup current DB state)

