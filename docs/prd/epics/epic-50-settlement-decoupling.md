# Epic 50: Settlement Decoupling

**Status:** PLANNED
**Phase:** 4.0 (Platform Architecture)
**Priority:** P0 — Architecture Refactor
**Estimated Points:** 26
**Stories:** 5
**Dependencies:** Epic 27 (Settlement Infrastructure)
**Created:** January 20, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Extract settlement from protocols so that protocols create Transfers only, not settlements. Settlements are triggered by configurable rules (schedule, threshold, manual, immediate) rather than being embedded in protocol logic.

**Why This Matters:**
- Clean separation of concerns (protocols vs settlement)
- Flexible settlement timing per merchant
- Batch settlement reduces costs
- Any protocol can use any settlement rail
- Easier to add new protocols or rails

**Goal:** Protocols create Transfers, settlements triggered by rules engine.

---

## Current State vs Target State

### Current State (Tightly Coupled)

```
Protocol (UCP) → Creates Transfer → Immediately calls Settlement
```

Problems:
- Settlement timing hardcoded per protocol
- Can't batch settlements across protocols
- Adding new protocol requires settlement integration

### Target State (Decoupled)

```
Protocol (Any) → Creates Transfer → Done

Settlement Rules Engine → Monitors Transfers → Triggers Settlement
```

Benefits:
- Protocols only care about ledger entries
- Settlements batch based on rules
- Merchant configures their settlement preferences

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/settlement-rules` | ❌ No | - | P1 | Dashboard only |
| `POST /v1/settlement-rules` | ❌ No | - | P1 | Dashboard only |
| Settlement trigger engine (internal) | ❌ No | - | P0 | Background service |
| Protocol refactors | ❌ No | - | P0 | Internal changes |

**SDK Stories Required:** None (internal infrastructure refactor)

---

## Settlement Trigger Rules

### Rule Types

| Type | Description | Example |
|------|-------------|---------|
| `schedule` | Time-based (cron) | Daily at 5pm UTC |
| `threshold` | Balance-based | When balance > $10,000 |
| `manual` | User-initiated | User clicks "Withdraw" |
| `immediate` | Transfer-type based | All `payout` transfers |

### Rule Configuration Schema

```typescript
interface SettlementRule {
  id: string;
  tenant_id: string;
  wallet_id?: string;          // null = applies to all wallets

  trigger: {
    type: 'schedule' | 'threshold' | 'manual' | 'immediate';

    // For schedule
    cron?: string;             // '0 17 * * *' = 5pm daily

    // For threshold
    amount?: number;           // Balance threshold
    currency?: string;         // Currency for threshold

    // For immediate
    transfer_types?: string[]; // ['payout', 'withdrawal']
  };

  settlement: {
    rail: 'auto' | 'ach' | 'pix' | 'spei' | 'wire' | 'usdc';
    priority: 'standard' | 'expedited';
  };

  enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Stories

### Story 50.1: Settlement Trigger Rules Schema

**Points:** 5
**Priority:** P0
**Dependencies:** None

**Description:**
Create database schema for settlement trigger rules with support for schedule, threshold, manual, and immediate triggers.

**Acceptance Criteria:**
- [ ] `settlement_rules` table created
- [ ] Rule types: schedule, threshold, manual, immediate
- [ ] Per-tenant and per-wallet configuration
- [ ] RLS policies for tenant isolation
- [ ] Default rules seeded for new tenants
- [ ] Migration file created

**Database Schema:**
```sql
CREATE TABLE settlement_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wallet_id UUID REFERENCES wallets(id), -- null = all wallets
  name TEXT NOT NULL,

  trigger_type TEXT NOT NULL, -- 'schedule', 'threshold', 'manual', 'immediate'
  trigger_config JSONB NOT NULL,

  settlement_rail TEXT NOT NULL DEFAULT 'auto',
  settlement_priority TEXT NOT NULL DEFAULT 'standard',

  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default rule: manual withdrawal always available
INSERT INTO settlement_rules (tenant_id, name, trigger_type, trigger_config, settlement_rail)
SELECT id, 'Manual Withdrawal', 'manual', '{}', 'auto'
FROM tenants;
```

**Files to Create:**
- `apps/api/supabase/migrations/YYYYMMDD_settlement_rules.sql`

---

### Story 50.2: Settlement Trigger Engine

**Points:** 8
**Priority:** P0
**Dependencies:** 50.1

**Description:**
Implement the settlement trigger engine that evaluates rules and triggers settlements based on configured conditions.

**Acceptance Criteria:**
- [ ] Rule evaluation service
- [ ] Schedule triggers (cron-based, runs every minute)
- [ ] Threshold triggers (evaluated on transfer creation)
- [ ] Immediate triggers (evaluated on transfer creation)
- [ ] Manual triggers (API endpoint)
- [ ] Idempotent settlement creation
- [ ] Error handling and retry logic
- [ ] Metrics for rule evaluations

**Trigger Engine:**
```typescript
interface SettlementTriggerEngine {
  // Evaluate all rules for a wallet after transfer
  evaluateOnTransfer(walletId: string, transfer: Transfer): Promise<void>;

  // Run scheduled rules (called by cron job)
  evaluateScheduledRules(): Promise<void>;

  // Manual trigger
  triggerManualSettlement(walletId: string, params: ManualSettlementParams): Promise<Settlement>;
}
```

**Files to Create:**
- `apps/api/src/services/settlement-triggers/engine.ts`
- `apps/api/src/services/settlement-triggers/evaluators/schedule.ts`
- `apps/api/src/services/settlement-triggers/evaluators/threshold.ts`
- `apps/api/src/services/settlement-triggers/evaluators/immediate.ts`
- `apps/api/src/workers/settlement-rules.ts`

---

### Story 50.3: Remove Settlement from Protocols

**Points:** 5
**Priority:** P0
**Dependencies:** 50.2

**Description:**
Refactor protocols (UCP, ACP) to create transfers only, removing direct settlement calls. Settlement decision happens at execution time based on rules.

**Acceptance Criteria:**
- [ ] UCP creates transfers without settlement calls
- [ ] ACP creates transfers without settlement calls
- [ ] Remove corridor selection from checkout creation
- [ ] Settlement corridor determined by rules, not protocol
- [ ] Existing tests updated
- [ ] No regression in protocol functionality

**Before (UCP checkout):**
```typescript
// Creates checkout AND triggers settlement
const checkout = await ucp.createCheckout({
  items: [...],
  corridor: 'pix'  // Settlement embedded in checkout
});
```

**After (UCP checkout):**
```typescript
// Creates checkout with transfer only
const checkout = await ucp.createCheckout({
  items: [...]
  // No corridor - settlement rules determine this
});

// Settlement triggered separately by rules
```

**Files to Modify:**
- `apps/api/src/services/ucp/checkout.ts`
- `apps/api/src/services/acp/checkout.ts`
- `apps/api/src/routes/ucp.ts`
- `apps/api/src/routes/acp.ts`

---

### Story 50.4: Settlement Rules API

**Points:** 5
**Priority:** P1
**Dependencies:** 50.1

**Description:**
Implement CRUD API for managing settlement trigger rules.

**Acceptance Criteria:**
- [ ] `GET /v1/settlement-rules` - List all rules
- [ ] `POST /v1/settlement-rules` - Create new rule
- [ ] `PATCH /v1/settlement-rules/:id` - Update rule
- [ ] `DELETE /v1/settlement-rules/:id` - Delete rule
- [ ] Rule validation (valid cron, reasonable thresholds)
- [ ] Cannot delete default manual withdrawal rule
- [ ] Audit logging for rule changes

**API Response (GET):**
```json
{
  "data": [
    {
      "id": "sr_xxx",
      "name": "Daily Settlement",
      "trigger_type": "schedule",
      "trigger_config": {
        "cron": "0 17 * * *"
      },
      "settlement_rail": "ach",
      "enabled": true
    },
    {
      "id": "sr_yyy",
      "name": "High Balance Alert",
      "trigger_type": "threshold",
      "trigger_config": {
        "amount": 10000,
        "currency": "USD"
      },
      "settlement_rail": "wire",
      "enabled": true
    }
  ]
}
```

**Files to Create:**
- `apps/api/src/routes/settlement-rules.ts`

---

### Story 50.5: Settlement Rules UI

**Points:** 3
**Priority:** P1
**Dependencies:** 50.4

**Description:**
Add dashboard UI for configuring settlement trigger rules.

**Acceptance Criteria:**
- [ ] List view of all rules
- [ ] Create rule wizard with type selection
- [ ] Edit rule form
- [ ] Enable/disable toggle
- [ ] View pending settlements queue
- [ ] Manual settlement request button

**UI Location:** `Settings → Settlement Rules`

**Files to Create:**
- `apps/web/src/app/dashboard/settings/settlement-rules/page.tsx`
- `apps/web/src/components/settings/settlement-rule-form.tsx`
- `apps/web/src/components/settings/settlement-rule-card.tsx`

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| 50.1 | 5 | P0 | Rules database schema | None |
| 50.2 | 8 | P0 | Trigger engine | 50.1 |
| 50.3 | 5 | P0 | Remove settlement from protocols | 50.2 |
| 50.4 | 5 | P1 | Rules CRUD API | 50.1 |
| 50.5 | 3 | P1 | Dashboard UI | 50.4 |
| **TOTAL** | **26** | | **5 stories** | |

---

## Migration Plan

### Phase 1: Add Rules Infrastructure (Stories 50.1, 50.2, 50.4)
- Create settlement_rules table
- Implement trigger engine
- Add API for rule management
- Existing protocols continue working (no breaking changes)

### Phase 2: Protocol Migration (Story 50.3)
- Update protocols to use new pattern
- Migrate existing checkouts (if needed)
- Remove legacy settlement calls

### Phase 3: UI (Story 50.5)
- Dashboard for rule management
- Manual settlement requests

---

## Verification Plan

| Checkpoint | Verification |
|------------|--------------|
| Schema | `settlement_rules` table exists |
| Engine | Schedule rules trigger at correct times |
| Engine | Threshold rules trigger on balance |
| Protocols | UCP/ACP create transfers without settlement |
| API | Can CRUD settlement rules |
| UI | Can configure rules in dashboard |

---

## Dependencies

**Enhances:**
- Epic 27: Settlement Infrastructure

**Impacts:**
- Epic 43: UCP (settlement decoupling)
- Epic 17: ACP (settlement decoupling)

---

## Related Documentation

- [Three-Layer Architecture](../../architecture/three-layer-architecture.md)
- [Epic 27: Settlement Infrastructure](./epic-27-settlement.md)
- [Epic 43: UCP Integration](./epic-43-ucp-integration.md)

---

*Created: January 20, 2026*
*Status: Planning*
