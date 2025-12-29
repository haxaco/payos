# Epic 28: Simulation Engine 🔮

**Status:** Pending
**Phase:** AI-Native Infrastructure
**Priority:** P0
**Total Points:** 24
**Stories:** 0/8 Complete
**Dates:** TBD

[← Back to Master PRD](../PayOS_PRD_v1.15.md)

---

## Overview

Build a comprehensive simulation engine that allows dry-run execution of any PayOS action before committing. This is a critical primitive for AI-native infrastructure, enabling agents to reason about outcomes and validate operations before execution.

**Strategic Context:**

> **"AI agents need to see the future before making decisions."**

Unlike human users who can review a form before submitting, AI agents need machine-readable previews of what will happen if they execute an action. The Simulation Engine provides this capability across all PayOS operations.

**Key Capabilities:**
- Dry-run any transfer with FX rate, fees, and timing preview
- Simulate batch operations to validate before execution
- Preview refund impacts on balances and accounting
- Project stream costs over time
- Validate operations without side effects
- Execute simulations directly via API

**Use Cases:**
- **Agent Decision Making:** "Should I execute this transfer or wait for better rates?"
- **Batch Validation:** "Will all 500 payroll transfers succeed with current balances?"
- **Cost Projection:** "How much will this stream cost over 30 days?"
- **Refund Preview:** "What will the customer's balance be after this refund?"
- **Compliance Checks:** "Does this transfer violate any spending limits?"

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/simulate` | POST | Simulate any action |
| `/v1/simulate/batch` | POST | Simulate multiple actions |
| `/v1/simulate/{id}` | GET | Get simulation result |
| `/v1/simulate/{id}/execute` | POST | Execute a simulation |

---

## Example: Transfer Simulation

**Request:**
```json
POST /v1/simulate
{
  "action": "transfer",
  "payload": {
    "from_account_id": "acc_123",
    "to_account_id": "acc_456",
    "amount": "5000.00",
    "currency": "USD",
    "destination_currency": "BRL",
    "destination_rail": "pix"
  }
}
```

**Response:**
```json
{
  "simulation_id": "sim_789",
  "status": "completed",
  "can_execute": true,
  "preview": {
    "source": {
      "account_id": "acc_123",
      "amount": "5000.00",
      "currency": "USD",
      "balance_after": "7500.00"
    },
    "destination": {
      "amount": "24750.00",
      "currency": "BRL"
    },
    "fx": {
      "rate": "4.95",
      "spread": "0.35%"
    },
    "fees": {
      "total": "50.00"
    },
    "timing": {
      "estimated_duration_seconds": 120
    }
  },
  "warnings": [],
  "errors": [],
  "execute_url": "/v1/simulate/sim_789/execute"
}
```

---

## Data Model

### Simulations Table

```sql
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Request
  action_type TEXT NOT NULL,  -- 'transfer', 'refund', 'stream', etc.
  action_payload JSONB NOT NULL,

  -- Initiator
  initiated_by UUID,
  initiated_by_type TEXT,  -- 'user', 'agent', 'api_key'

  -- Results
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
  can_execute BOOLEAN DEFAULT false,
  preview JSONB,
  warnings JSONB DEFAULT '[]',
  errors JSONB DEFAULT '[]',

  -- Execution tracking
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  execution_result_id UUID,  -- e.g., transfer_id
  execution_result_type TEXT,  -- e.g., 'transfer'

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_simulations_tenant ON simulations(tenant_id);
CREATE INDEX idx_simulations_status ON simulations(status)
  WHERE status = 'pending';
CREATE INDEX idx_simulations_expires ON simulations(expires_at)
  WHERE status = 'completed' AND executed = false;

-- RLS
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulations_tenant_isolation ON simulations
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## Stories

### Story 28.1: Simulation Data Model and Base API Structure

**Priority:** P0
**Points:** 3
**Effort:** 2-3 hours
**Status:** Pending

**Description:**
Build the foundational data model and base API structure for the simulation engine.

**Database Migration:**
- Create `simulations` table
- Add RLS policies
- Add indexes for performance

**Base API:**
```typescript
POST /v1/simulate
GET  /v1/simulate/:id
POST /v1/simulate/:id/execute
```

**Acceptance Criteria:**
- [ ] Simulations table created with RLS
- [ ] Base API endpoints defined
- [ ] TypeScript types in `@payos/types`
- [ ] Request/response validation schemas
- [ ] Simulation lifecycle (pending → completed → expired)
- [ ] Database migration tested

**Files to Create:**
- `apps/api/supabase/migrations/YYYYMMDD_simulation_engine.sql`
- `packages/types/src/simulation.ts`
- `apps/api/src/routes/simulate.ts`
- `apps/api/src/services/simulation.ts`

---

### Story 28.2: Transfer Simulation with FX/Fee Preview

**Priority:** P0
**Points:** 5
**Effort:** 5-6 hours
**Status:** Pending

**Description:**
Implement full transfer simulation including FX rate lookup, fee calculation, balance validation, and timing estimates.

**Simulation Logic:**
1. Validate source account exists and has sufficient balance
2. Validate destination account exists
3. Look up FX rate (if cross-currency)
4. Calculate all fees (platform, FX spread, rail fees)
5. Calculate final amounts
6. Estimate settlement time
7. Check for warnings (low balance, rate volatility, etc.)
8. Return comprehensive preview

**Preview Structure:**
```typescript
interface TransferSimulationPreview {
  source: {
    account_id: string;
    amount: string;
    currency: string;
    balance_before: string;
    balance_after: string;
  };
  destination: {
    account_id: string;
    amount: string;
    currency: string;
  };
  fx?: {
    rate: string;
    spread: string;
    rate_locked: boolean;
    expires_at?: string;
  };
  fees: {
    platform_fee: string;
    fx_fee?: string;
    rail_fee?: string;
    total: string;
  };
  timing: {
    estimated_duration_seconds: number;
    estimated_arrival: string;
  };
}
```

**Warnings:**
- "Source balance will be below $100 after transfer"
- "FX rate is 2% worse than 24h average"
- "Destination rail may have delays (holiday)"

**Acceptance Criteria:**
- [ ] Transfer simulation endpoint working
- [ ] FX rate lookup integrated
- [ ] Fee calculation accurate
- [ ] Balance validation working
- [ ] Timing estimates provided
- [ ] Warnings generated appropriately
- [ ] Can execute simulation via `/execute`
- [ ] Unit tests for all scenarios

**Files to Modify:**
- `apps/api/src/services/simulation.ts`
- `apps/api/src/services/transfers.ts` (reuse logic)

---

### Story 28.3: Batch Simulation Endpoint

**Priority:** P0
**Points:** 3
**Effort:** 3-4 hours
**Status:** Pending

**Description:**
Enable simulation of multiple transfers in a single request, critical for payroll and batch payout validation.

**API:**
```typescript
POST /v1/simulate/batch
{
  "simulations": [
    { "action": "transfer", "payload": { ... } },
    { "action": "transfer", "payload": { ... } },
    // ... up to 1000
  ]
}
```

**Response:**
```json
{
  "batch_id": "batch_sim_123",
  "total_count": 500,
  "successful": 495,
  "failed": 5,
  "can_execute_all": false,
  "total_amount": "125000.00",
  "total_fees": "2500.00",
  "simulations": [
    { "index": 0, "status": "completed", "can_execute": true, ... },
    { "index": 1, "status": "completed", "can_execute": true, ... },
    { "index": 4, "status": "failed", "errors": ["insufficient_balance"], ... }
  ],
  "summary": {
    "by_currency": {
      "USD": { "count": 300, "total": "75000.00" },
      "BRL": { "count": 200, "total": "50000.00" }
    },
    "by_rail": {
      "pix": { "count": 200, "total": "50000.00" },
      "spei": { "count": 100, "total": "25000.00" }
    }
  }
}
```

**Performance:**
- Process 1000 simulations in < 5 seconds
- Parallel execution where possible
- Stop-on-first-error option

**Acceptance Criteria:**
- [ ] Batch simulation endpoint working
- [ ] Processes up to 1000 simulations
- [ ] Returns summary statistics
- [ ] Identifies failures with details
- [ ] Performance target met (<5s for 1000)
- [ ] Can execute entire batch if all valid
- [ ] Unit and integration tests

**Files to Modify:**
- `apps/api/src/routes/simulate.ts`
- `apps/api/src/services/simulation.ts`

---

### Story 28.4: Simulation-to-Execution Flow

**Priority:** P1
**Points:** 3
**Effort:** 3 hours
**Status:** Pending

**Description:**
Enable seamless execution of validated simulations, preventing race conditions and ensuring simulation results remain valid.

**Flow:**
1. Client calls `POST /v1/simulate` → gets `simulation_id`
2. Client reviews preview
3. Client calls `POST /v1/simulate/:id/execute` within TTL
4. System re-validates simulation is still valid
5. Executes actual operation
6. Returns result with reference to simulation

**Validation on Execute:**
- Simulation not expired (< 1 hour old)
- Simulation not already executed
- Source balance still sufficient
- FX rate still within threshold (if rate-locked)
- No policy changes since simulation

**Response:**
```json
{
  "simulation_id": "sim_789",
  "execution_result": {
    "type": "transfer",
    "id": "transfer_123",
    "status": "processing",
    "created_at": "2025-12-29T10:30:00Z"
  },
  "variance": {
    "fx_rate_change": "0.02%",
    "fee_change": "0.00",
    "timing_change": "0s"
  }
}
```

**Acceptance Criteria:**
- [ ] Execute endpoint implemented
- [ ] Re-validation logic working
- [ ] Prevents double-execution
- [ ] Handles expired simulations
- [ ] Reports variance from simulation
- [ ] Links execution to simulation record
- [ ] Integration tests for full flow

**Files to Modify:**
- `apps/api/src/routes/simulate.ts`
- `apps/api/src/services/simulation.ts`

---

### Story 28.5: Refund Simulation

**Priority:** P1
**Points:** 2
**Effort:** 2-3 hours
**Status:** Pending

**Description:**
Enable simulation of refunds to preview balance impacts and validate refund eligibility.

**Simulation Logic:**
1. Validate original transfer exists
2. Check refund eligibility (status, time limits)
3. Calculate refund amount (full or partial)
4. Preview balance changes
5. Check for warnings (will overdraft, etc.)

**Preview:**
```json
{
  "refund": {
    "original_transfer_id": "transfer_123",
    "refund_amount": "100.00",
    "refund_currency": "USD",
    "refund_type": "full"
  },
  "impact": {
    "source_account": {
      "balance_before": "500.00",
      "balance_after": "600.00"
    },
    "destination_account": {
      "balance_before": "1000.00",
      "balance_after": "900.00"
    }
  },
  "eligibility": {
    "can_refund": true,
    "reasons": []
  }
}
```

**Acceptance Criteria:**
- [ ] Refund simulation working
- [ ] Validates refund eligibility
- [ ] Previews balance impacts
- [ ] Supports partial refunds
- [ ] Warns on potential issues
- [ ] Can execute via `/execute`

**Files to Modify:**
- `apps/api/src/services/simulation.ts`
- `apps/api/src/services/refunds.ts`

---

### Story 28.6: Stream Simulation (Cost Projection)

**Priority:** P1
**Points:** 3
**Effort:** 3-4 hours
**Status:** Pending

**Description:**
Simulate stream creation and project costs over time.

**Simulation Logic:**
1. Validate stream configuration
2. Calculate flow rate costs
3. Project total cost over duration
4. Estimate runway with current balance
5. Warn on potential depletion

**Preview:**
```json
{
  "stream": {
    "rate_per_second": "0.001",
    "duration_seconds": 2592000,
    "projected_total": "2592.00",
    "currency": "USDC"
  },
  "cost_projection": {
    "1_day": "86.40",
    "7_days": "604.80",
    "30_days": "2592.00"
  },
  "runway": {
    "current_balance": "5000.00",
    "estimated_runway_seconds": 5000000,
    "estimated_runway_days": 57.87,
    "depletion_date": "2026-02-24T10:30:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] Stream simulation working
- [ ] Cost projections accurate
- [ ] Runway calculations correct
- [ ] Warns on insufficient balance
- [ ] Can execute via `/execute`

**Files to Modify:**
- `apps/api/src/services/simulation.ts`
- `apps/api/src/services/streams.ts`

---

### Story 28.7: Simulation Expiration and Cleanup

**Priority:** P2
**Points:** 2
**Effort:** 2 hours
**Status:** Pending

**Description:**
Implement automatic expiration and cleanup of old simulations.

**Lifecycle:**
- Simulations valid for 1 hour after creation
- Auto-expire if not executed
- Cleanup worker runs daily
- Delete simulations > 7 days old

**Worker:**
```typescript
// apps/api/src/workers/simulation-cleanup.ts
async function cleanupExpiredSimulations() {
  const { data } = await supabase
    .from('simulations')
    .delete()
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .select();

  console.log(`Cleaned up ${data?.length || 0} old simulations`);
}
```

**Acceptance Criteria:**
- [ ] Simulations expire after 1 hour
- [ ] Cleanup worker implemented
- [ ] Runs on schedule (daily)
- [ ] Logs cleanup stats
- [ ] Doesn't delete executed simulations referenced elsewhere

**Files to Create:**
- `apps/api/src/workers/simulation-cleanup.ts`

---

### Story 28.8: Dashboard Simulation UI

**Priority:** P2
**Points:** 3
**Effort:** 3-4 hours
**Status:** Pending

**Description:**
Add simulation preview capabilities to dashboard transfer and refund forms.

**Features:**
1. **Transfer Form:**
   - "Preview Transfer" button
   - Shows simulation results in modal
   - Displays fees, FX rates, timing
   - "Confirm & Execute" proceeds with transfer

2. **Refund Form:**
   - Auto-simulates on amount change
   - Shows balance impact
   - Validates eligibility

3. **Batch Upload:**
   - Simulates entire CSV before execution
   - Shows success/failure breakdown
   - Highlights problematic rows

**Components:**
```tsx
<SimulationPreviewModal
  simulation={simulation}
  onExecute={() => executeSimulation(simulation.id)}
  onCancel={() => setShowPreview(false)}
/>

<TransferSimulationCard preview={preview} />
<RefundSimulationCard preview={preview} />
<BatchSimulationSummary simulations={batchResults} />
```

**Acceptance Criteria:**
- [ ] Transfer form has preview
- [ ] Refund form has auto-simulation
- [ ] Batch upload validates before execution
- [ ] Simulation results displayed clearly
- [ ] Execute button works correctly
- [ ] Warnings highlighted

**Files to Create:**
- `apps/web/src/components/simulation/SimulationPreviewModal.tsx`
- `apps/web/src/components/simulation/TransferSimulationCard.tsx`
- `apps/web/src/components/simulation/RefundSimulationCard.tsx`
- `apps/web/src/components/simulation/BatchSimulationSummary.tsx`

---

## Story Summary

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 28.1 | 3 | P0 | Simulation data model and base API structure |
| 28.2 | 5 | P0 | Transfer simulation with FX/fee preview |
| 28.3 | 3 | P0 | Batch simulation endpoint |
| 28.4 | 3 | P1 | Simulation-to-execution flow |
| 28.5 | 2 | P1 | Refund simulation |
| 28.6 | 3 | P1 | Stream simulation (cost projection) |
| 28.7 | 2 | P2 | Simulation expiration and cleanup |
| 28.8 | 3 | P2 | Dashboard simulation UI |
| **Total** | **24** | | |

---

## Technical Deliverables

**Backend:**
- 1 new database table (`simulations`)
- Simulation service with action-specific logic
- API endpoints for simulate, batch, execute
- Background worker for cleanup
- Integration with existing services (transfers, refunds, streams)

**Frontend:**
- Simulation preview components
- Transfer/refund form integration
- Batch validation UI
- Execution confirmation flows

**SDK:**
- Simulation methods in API client
- TypeScript types for all simulation responses

---

## Dependencies

**Prerequisites:**
- Epic 9 (Quotes & FX) for rate lookups
- Epic 10 (Refunds) for refund simulation
- Existing transfer and stream infrastructure

**Enables:**
- Epic 27 (Batch Payouts) uses batch simulation
- Epic 29 (Workflow Engine) can simulate workflow outcomes
- Epic 31 (Context API) can include simulation results

---

## Success Criteria

- [ ] Any transfer can be simulated before execution
- [ ] Batch simulations process 1000+ items in < 5 seconds
- [ ] Simulation results accurate within 1% of actual execution
- [ ] FX rate and fee previews match actual values
- [ ] Dashboard shows simulation preview on all forms
- [ ] Agents can use simulations for decision making
- [ ] All operations < 500ms latency
- [ ] Simulation-to-execution flow seamless

---

## Strategic Impact

The Simulation Engine is a fundamental primitive for AI-native infrastructure:

1. **Enables Agent Reasoning:** AI agents can "think before acting"
2. **Reduces Failed Transactions:** Validate before execution
3. **Improves UX:** Users see exactly what will happen
4. **Supports Batch Operations:** Validate entire payrolls before submission
5. **Enables Advanced Workflows:** Multi-step processes can simulate each step

**Composability:**
- Simulation + Workflow Engine = Preview entire approval chain
- Simulation + Context API = "Show me everything about this transfer, including what would happen if I execute it"
- Simulation + Tool Discovery = "Here's what PayOS can do, and here's what each action will cost"

---

## Related Documentation

TBD - To be created during implementation:
- Simulation Engine API Documentation
- Simulation Best Practices Guide
- Agent Integration Guide for Simulations
- Dashboard Simulation Features Guide
