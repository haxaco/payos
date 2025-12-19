# PayOS Seed Scripts

Comprehensive database seeding scripts for development and demo environments.

---

## Quick Start

### Seed Everything (Recommended)

```bash
cd apps/api
pnpm seed:all
```

This runs all seed scripts in the correct dependency order and is **idempotent** (safe to run multiple times).

---

## Available Commands

### Master Command
```bash
pnpm seed:all
```
- Runs all seed scripts in dependency order
- Idempotent (skips already-seeded data)
- Shows progress indicators
- Verifies data at the end
- **Duration:** ~30-60 seconds

### Individual Scripts
```bash
pnpm seed:db          # Main database (tenants, accounts, agents, transfers)
pnpm seed:streams     # Active money streams
pnpm seed:agents      # Agent activity and permissions
pnpm seed:enhance     # Enhance balances and recent activity
```

### Legacy Scripts (called by seed:all)
These are typically run by `seed:all`, but can be run individually:
```bash
pnpm tsx scripts/seed-database.ts               # Main data
pnpm tsx scripts/seed-card-transactions.ts      # Card txns
pnpm tsx scripts/seed-relationships.ts          # Account relationships
pnpm tsx scripts/seed-disputes.ts               # Disputes
pnpm tsx scripts/seed-compliance-flags.ts       # Compliance flags
```

---

## What Gets Seeded

### Main Database (`seed-database.ts`)
- 2+ tenants (Demo Fintech, Beta Tenant)
- 20+ accounts (person & business)
- 10+ agents (payment, treasury, compliance)
- 4,000+ transfers (various statuses)
- 35+ streams (active and completed)
- Payment methods (bank accounts, wallets, cards)

### Card Transactions (`seed-card-transactions.ts`)
- 60+ card transactions
- Mix of purchases, refunds, reversals
- Linked to existing cards
- Realistic merchant data

### Account Relationships (`seed-relationships.ts`)
- 12+ bidirectional relationships
- Contractors, vendors, partners
- Mix of active and inactive

### Disputes (`seed-disputes.ts`)
- 4+ disputes
- Various statuses (open, under_review, resolved)
- Linked to transfers and accounts

### Compliance Flags (`seed-compliance-flags.ts`)
- 10+ compliance flags
- Mix of risk levels (low, medium, high, critical)
- Various flag types (amount_threshold, velocity, sanctions, kyc_incomplete)

### Active Streams (`seed-streams.ts`) ⭐ NEW
- 3-5 streams per tenant
- Mix of inbound/outbound flows
- Realistic flow rates ($100-$5000/month)
- 70% funded, 30% unfunded
- Status: 80% active, 15% paused, 5% completed
- 30% managed by agents

### Agent Activity (`seed-agent-activity.ts`) ⭐ NEW
- Realistic agent permissions
- 2-5 agent-initiated transfers per agent (last 7 days)
- Agent usage stats (total_transactions, total_volume)
- Some streams assigned to agent management

### Data Enhancement (`enhance-seed-data.ts`)
- Sets realistic account balances
- Creates recent activity
- Ensures data consistency

---

## Seed Order & Dependencies

The master script runs seeds in this order:

1. **Main Database** → Core entities (tenants, accounts, agents, transfers)
2. **Card Transactions** → Requires payment methods
3. **Account Relationships** → Requires accounts
4. **Disputes** → Requires transfers and accounts
5. **Compliance Flags** → Requires transfers and accounts
6. **Active Streams** → Requires accounts and agents
7. **Agent Activity** → Requires agents, accounts, streams
8. **Data Enhancement** → Updates balances and stats
9. **Verification** → Checks all tables

---

## Idempotency & Re-running

All scripts are designed to be **idempotent**:
- `seed:all` checks if data exists before running each script
- If a table has enough data, the script is skipped
- Safe to run multiple times without creating duplicates

### When to Re-run
- After dropping the database
- To add more data
- To refresh stale development data

### What Gets Skipped
- Tables with >= minimum record count
- Example: If `accounts` has 10+ records, `seed-database.ts` is skipped

---

## Output & Verification

### Progress Indicators
```
[1/9] Seeding main database (tenants, accounts, agents, transfers)
────────────────────────────────────────────────────────────
   Running: scripts/seed-database.ts
   ✅ Main database seeded
```

### Verification Report
```
   Data Verification:
   ✅ Tenants: 2 records
   ✅ Accounts: 47 records
   ✅ Agents: 58 records
   ✅ Transfers: 4334 records
   ✅ Payment Methods: 12 records
   ✅ Card Transactions: 61 records
   ✅ Account Relationships: 12 records
   ✅ Disputes: 4 records
   ✅ Compliance Flags: 10 records
```

---

## Environment Setup

### Required Environment Variables
```bash
# .env file in project root
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Verification
   ```bash
# Test environment
pnpm tsx scripts/seed-all.ts
```

If you see "Missing required environment variables", check your `.env` file.

---

## Testing After Seeding

### 1. Start the API
```bash
cd apps/api
pnpm dev
```

### 2. Start the UI
   ```bash
cd payos-ui
pnpm dev
```

### 3. Login
- **Email:** `beta@example.com`
- **Password:** `Password123!`

### 4. Verify Data
- Dashboard shows real volume chart
- Recent activity has entries
- Accounts page has 20+ accounts
- Agents page has 10+ agents
- Treasury page shows streams
- Cards page has card transactions

---

## Troubleshooting

### "No tenants found"
**Solution:** Run `pnpm seed:db` first

### "Missing required environment variables"
**Solution:** Check `.env` file has `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Failed to create X"
**Solution:** Check Supabase connection, RLS policies, and database migrations

### "Script hangs"
**Solution:** Check for infinite loops in seed logic, or network issues with Supabase

### "Duplicate key error"
**Solution:** Some data was already seeded. The script should skip, but if not, check idempotency logic.

---

## Development

### Creating a New Seed Script

1. **Create the script:**
```typescript
// scripts/seed-new-feature.ts
import { createClient } from '@supabase/supabase-js';
// ... seed logic
```

2. **Add to package.json:**
```json
{
  "scripts": {
    "seed:feature": "tsx scripts/seed-new-feature.ts"
  }
}
```

3. **Add to seed-all.ts:**
```typescript
logStep(N, totalSteps, 'Seeding new feature');
const success = await runScript(
  'scripts/seed-new-feature.ts',
  'New feature seeded'
);
```

4. **Add verification check:**
```typescript
{ table: 'new_table', min: 5, name: 'New Feature' }
```

---

## Best Practices

### ✅ Do
- Use realistic data (names, amounts, dates)
- Make scripts idempotent
- Add progress indicators
- Handle errors gracefully
- Verify data after seeding

### ❌ Don't
- Hardcode IDs (they may change)
- Create production data (use fixtures)
- Ignore foreign key relationships
- Skip error handling
- Make scripts run forever

---

## Performance

### Current Performance
- **Full seed:** ~30-60 seconds
- **Individual scripts:** 5-15 seconds each
- **Data volume:** ~5,000+ records total

### Optimization Tips
- Batch inserts when possible
- Use `.select()` sparingly
- Skip already-seeded data
- Run in parallel where safe

---

## Support

### Issues?
1. Check the output for specific errors
2. Verify environment variables
3. Check Supabase dashboard for data
4. Review migration status
5. Look for RLS policy issues

### Need Help?
- Check `docs/` directory for guides
- Review `EPIC_22_SEED_DATA_AND_FINAL_UI.md`
- See `EPIC_22_COMPLETE.md` for examples

---

## Changelog

### v1.0 (December 18, 2025)
- Created master seed script (`seed-all.ts`)
- Added streams seeding (`seed-streams.ts`)
- Added agent activity seeding (`seed-agent-activity.ts`)
- Implemented idempotency checks
- Added verification step
- Documented all scripts
