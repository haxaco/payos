# Epic 27: Settlement Infrastructure Hardening 🏗️

**Status:** 📋 Pending (High Priority)
**Phase:** 5 (Production Hardening)
**Priority:** P0
**Total Points:** 29
**Stories:** 0/8 Complete
**Dates:** Not started

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Build production-grade settlement infrastructure to support $50M+ monthly transaction processing volume (TPV) with enterprise-level reliability, reconciliation, and liquidity management. This epic transforms PayOS from a working prototype into a production-ready settlement platform.

**Strategic Context:**

Settlement infrastructure hardening is critical for:
- Supporting real customer transaction volumes
- Meeting enterprise SLA requirements (>99.9% uptime)
- Enabling multi-currency float management
- Providing audit-trail reconciliation
- Facilitating partner self-serve onboarding

This epic is a prerequisite for Phase 4 customer validation and Phase 5 scale operations.

---

## Stories

### Story 27.1: Multi-Protocol Settlement Router

**Priority:** P0
**Points:** 3
**Dependencies:** Epic 17 (Multi-Protocol Gateway)

**Description:**
Build a unified settlement router that handles transfers across all protocols (x402, AP2, ACP) and routes them to appropriate settlement rails (Circle USDC, Pix, SPEI, Base chain).

**Acceptance Criteria:**
- [ ] Router dispatches transfers based on protocol and destination currency
- [ ] Supports concurrent settlement across multiple protocols
- [ ] Handles protocol-specific metadata correctly
- [ ] Maintains atomicity for multi-step settlements
- [ ] Error handling with automatic retry logic
- [ ] Performance: <500ms routing decision time

**Technical Deliverables:**
- Service: `apps/api/src/services/settlement-router.ts`
- Configuration: Protocol-to-rail mapping config
- Metrics: Settlement latency by protocol/rail

---

### Story 27.2: Batch & Mass Payout API

**Priority:** P0
**Points:** 5
**Dependencies:** None

**Description:**
Implement batch payout APIs to enable partners to submit multiple transfers in a single request, optimizing for payroll and procurement use cases.

**Acceptance Criteria:**
- [ ] Batch submission endpoint `POST /v1/transfers/batch`
- [ ] Support up to 1000 transfers per batch
- [ ] Atomic validation before processing any transfers
- [ ] Per-transfer error tracking with partial success support
- [ ] Batch status tracking and progress reporting
- [ ] CSV upload support for payroll integrations
- [ ] Webhook notifications for batch completion

**API Endpoints:**
```
POST   /v1/transfers/batch           - Submit batch of transfers
GET    /v1/transfers/batch/:id       - Get batch status
GET    /v1/transfers/batch/:id/items - List individual transfer statuses
POST   /v1/transfers/batch/:id/retry - Retry failed items
```

**Technical Deliverables:**
- Table: `transfer_batches` (batch metadata)
- Table: `transfer_batch_items` (individual transfers)
- Service: `apps/api/src/services/batch-processor.ts`
- Worker: Async batch processing

---

### Story 27.3: Reconciliation Engine

**Priority:** P0
**Points:** 5
**Dependencies:** None

**Description:**
Build automated reconciliation system to match PayOS internal ledger against external settlement rails (Circle, Base chain) and detect discrepancies.

**Acceptance Criteria:**
- [ ] Daily automated reconciliation for all settlement rails
- [ ] Match internal transfers to external settlement confirmations
- [ ] Flag discrepancies (missing settlements, amount mismatches)
- [ ] Reconciliation dashboard showing match rate >99.5%
- [ ] Manual reconciliation workflow for flagged items
- [ ] Audit trail for all reconciliation actions
- [ ] Export reconciliation reports (CSV, PDF)

**Data Model:**
```sql
CREATE TABLE reconciliation_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  rail_type TEXT NOT NULL,       -- 'circle', 'base', 'pix', 'spei'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_transfers INT,
  matched_transfers INT,
  unmatched_transfers INT,
  amount_matched DECIMAL(20, 8),
  amount_unmatched DECIMAL(20, 8),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE reconciliation_discrepancies (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES reconciliation_runs(id),
  transfer_id UUID REFERENCES transfers(id),
  discrepancy_type TEXT NOT NULL, -- 'missing_settlement', 'amount_mismatch', 'duplicate'
  expected_amount DECIMAL(20, 8),
  actual_amount DECIMAL(20, 8),
  resolution_status TEXT DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
```

**Technical Deliverables:**
- Service: `apps/api/src/services/reconciliation.ts`
- Worker: `apps/api/src/workers/reconciliation-worker.ts`
- UI: Reconciliation dashboard page
- Reports: Automated reconciliation reports

---

### Story 27.4: Settlement Windows & Cut-off Times

**Priority:** P1
**Points:** 3
**Dependencies:** Story 27.2 (Batch API)

**Description:**
Implement configurable settlement windows and cut-off times to batch settlements for cost efficiency and compliance with banking hours.

**Acceptance Criteria:**
- [ ] Configurable settlement windows per rail (e.g., hourly, 4x daily, end-of-day)
- [ ] Cut-off time enforcement for same-day settlement
- [ ] Queue transfers outside settlement window
- [ ] Partner notification of next settlement window
- [ ] Holiday calendar support (Brazil, Mexico banking holidays)
- [ ] Emergency settlement override for urgent transfers

**Configuration Example:**
```json
{
  "settlement_windows": {
    "pix": {
      "frequency": "hourly",
      "cutoff_hour": 17,
      "timezone": "America/Sao_Paulo"
    },
    "spei": {
      "frequency": "4_per_day",
      "times": ["09:00", "12:00", "15:00", "17:00"],
      "timezone": "America/Mexico_City"
    }
  }
}
```

**Technical Deliverables:**
- Configuration: Settlement window config per tenant/rail
- Scheduler: Settlement window processor
- UI: Settlement schedule visibility in dashboard

---

### Story 27.5: Robust Webhook Delivery System

**Priority:** P0
**Points:** 3
**Dependencies:** Epic 17 Story 17.0b (Webhook Infrastructure)

**Description:**
Enhance webhook delivery system with advanced retry logic, monitoring, and partner debugging tools.

**Acceptance Criteria:**
- [ ] Exponential backoff retry (5 attempts over 24 hours)
- [ ] Dead letter queue for persistent failures
- [ ] Partner webhook testing interface
- [ ] Webhook delivery dashboard with success rate >99%
- [ ] Signature verification helpers for partners
- [ ] Event replay capability for debugging
- [ ] Webhook logs retention (30 days)

**Enhancements to Story 17.0b:**
- Add webhook testing UI
- Add event replay endpoint
- Add detailed delivery logs
- Add webhook health monitoring

**Technical Deliverables:**
- UI: Webhook testing/debugging dashboard
- Endpoint: `POST /v1/webhooks/:id/replay`
- Monitoring: Webhook delivery metrics dashboard

---

### Story 27.6: Idempotency Key Infrastructure

**Priority:** P0
**Points:** 2
**Dependencies:** None

**Description:**
Implement comprehensive idempotency key support across all write operations to prevent duplicate transactions from partner retries.

**Acceptance Criteria:**
- [ ] Accept `Idempotency-Key` header on all POST/PUT endpoints
- [ ] Store request fingerprint for 24 hours
- [ ] Return original response for duplicate requests
- [ ] Support idempotency across transfers, refunds, batches
- [ ] Idempotency conflict error with clear messaging
- [ ] Cleanup expired idempotency keys (>24h old)

**Data Model:**
```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX idx_idempotency_expiry ON idempotency_keys(expires_at)
  WHERE expires_at > NOW();
```

**Technical Deliverables:**
- Middleware: `apps/api/src/middleware/idempotency.ts`
- Migration: Idempotency keys table
- Worker: Cleanup expired keys

---

### Story 27.7: Liquidity & Float Management Dashboard

**Priority:** P1
**Points:** 5
**Dependencies:** None

**Description:**
Build treasury dashboard for monitoring and managing liquidity across multiple settlement rails and currencies.

**Acceptance Criteria:**
- [ ] Real-time balance view across all settlement rails
- [ ] Float sufficiency alerts (balance < 2 days of volume)
- [ ] Currency exposure dashboard (USD, BRL, MXN, USDC)
- [ ] Settlement velocity metrics (avg time to settle)
- [ ] Rebalancing recommendations
- [ ] Historical float utilization charts
- [ ] Partner-specific float allocation (for white-label)

**Dashboard Metrics:**
- Total float by currency
- Available vs. committed balances
- Settlement queue depth
- Float runway (days remaining at current volume)
- Rebalancing triggers

**Technical Deliverables:**
- Service: `apps/api/src/services/treasury.ts`
- Endpoints: Float management APIs
- UI: Treasury dashboard page
- Alerts: Float sufficiency monitoring

---

### Story 27.8: Partner Self-Serve Onboarding Flow

**Priority:** P1
**Points:** 3
**Dependencies:** Epic 24 (Enhanced API Key Security)

**Description:**
Enable partners to onboard themselves through a guided self-serve flow, reducing manual setup time from days to hours.

**Acceptance Criteria:**
- [ ] Multi-step onboarding wizard in dashboard
- [ ] KYB document collection and verification
- [ ] API key generation with test/live environments
- [ ] Webhook endpoint configuration and testing
- [ ] Settlement account setup (Circle, bank accounts)
- [ ] Compliance checks and approval workflow
- [ ] Onboarding progress tracking
- [ ] "Go live" checklist with validation

**Onboarding Steps:**
1. Business information & KYB
2. Technical setup (API keys, webhooks)
3. Settlement configuration (rails, currencies)
4. Compliance verification
5. Test transaction validation
6. Production approval

**Technical Deliverables:**
- UI: Multi-step onboarding wizard
- Service: `apps/api/src/services/onboarding.ts`
- Workflow: Onboarding state machine
- Documentation: Partner integration guide

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 27.1 Multi-Protocol Settlement Router | 3 | P0 | Pending |
| 27.2 Batch & Mass Payout API | 5 | P0 | Pending |
| 27.3 Reconciliation Engine | 5 | P0 | Pending |
| 27.4 Settlement Windows & Cut-off Times | 3 | P1 | Pending |
| 27.5 Robust Webhook Delivery System | 3 | P0 | Pending |
| 27.6 Idempotency Key Infrastructure | 2 | P0 | Pending |
| 27.7 Liquidity & Float Management Dashboard | 5 | P1 | Pending |
| 27.8 Partner Self-Serve Onboarding Flow | 3 | P1 | Pending |
| **Total** | **29** | | **0/8 Complete** |

---

## Technical Deliverables

### Database Migrations
- `transfer_batches` and `transfer_batch_items` tables
- `reconciliation_runs` and `reconciliation_discrepancies` tables
- `idempotency_keys` table
- Settlement window configuration schema

### API Endpoints
- Batch transfer APIs (`/v1/transfers/batch/*`)
- Reconciliation APIs (`/v1/reconciliation/*`)
- Treasury APIs (`/v1/treasury/*`)
- Webhook testing/replay APIs

### Services
- `settlement-router.ts` - Protocol-to-rail routing
- `batch-processor.ts` - Async batch processing
- `reconciliation.ts` - Automated reconciliation
- `treasury.ts` - Float management
- `onboarding.ts` - Partner onboarding workflow

### Workers
- `reconciliation-worker.ts` - Daily reconciliation runs
- `settlement-window-processor.ts` - Scheduled settlement execution
- `idempotency-cleanup-worker.ts` - Expire old idempotency keys

### UI Components
- Reconciliation dashboard
- Treasury/float management dashboard
- Webhook testing interface
- Partner onboarding wizard

---

## Success Criteria

### Performance
- Settlement routing decision: <500ms
- Batch validation: <2s for 1000 transfers
- Reconciliation match rate: >99.5%
- Webhook delivery success: >99%

### Reliability
- Uptime SLA: >99.9%
- Settlement success rate: >99.9%
- Idempotency conflict rate: <0.1%
- Zero duplicate settlements

### Scale
- Support $50M+ monthly TPV
- Handle 100K+ transfers/month
- Support 50+ concurrent partners
- Process batches up to 1000 items

---

## Dependencies

**Requires:**
- Epic 17: Multi-Protocol Gateway (webhook infrastructure)
- Epic 24: Enhanced API Key Security (for partner onboarding)

**Enables:**
- Phase 4: Customer validation (production-ready settlement)
- Phase 5: Scale operations (enterprise volume handling)
- Epic 29: Workflow Engine (approval workflows for reconciliation)

---

## Related Documentation

- **Strategic Context:** `/docs/prd/PayOS_PRD_Master.md` (Phase 5 details)
- **Version History:** `/docs/prd/PayOS_PRD_v1.15.md` (Epic 27 references around line 13650)
- **Settlement Flow:** `/docs/SETTLEMENT_BUG_FIX.md`
- **Batch Payments:** (To be created post-Epic 27)
- **Reconciliation Guide:** (To be created post-Epic 27)
