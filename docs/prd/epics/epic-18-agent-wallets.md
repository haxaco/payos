# Epic 18: Agent Wallets & Spending Policies 🤖

**Status:** Pending
**Phase:** B (Weeks 5-8)
**Priority:** P1
**Total Points:** 23
**Stories:** 0/6 Complete
**Dates:** TBD

[← Back to Master PRD](../PayOS_PRD_v1.15.md)

---

## Overview

Build the agent wallet system that enables AI agents to make autonomous x402 payments within policy-defined bounds. This is the infrastructure for **making** x402 payments (as opposed to Epic 17 which is for receiving them).

**Strategic Context:**

With Epic 17 complete, PayOS can now **receive** payments from AI agents via x402, AP2, and ACP protocols. Epic 18 enables the reverse flow: allowing AI agents to **make** autonomous payments on behalf of users or organizations.

**Key Capabilities:**
- AI agents get dedicated wallets with spending limits
- Policy-based payment controls (approved vendors, categories, thresholds)
- Autonomous payment execution within defined bounds
- Approval workflows for payments exceeding limits
- Real-time spending tracking and auto-funding
- Complete audit trail of agent transactions

**Use Cases:**
- **Procurement Agents:** Auto-purchase API credits, SaaS subscriptions within budget
- **Research Agents:** Pay for data access, compute resources on-demand
- **Support Agents:** Process refunds, issue credits to customers
- **DevOps Agents:** Pay for cloud resources, CDN bandwidth as needed

---

## Data Models

### Account Type Extension

Extend existing `accounts` table to support `agent` type:

```sql
-- Migration: Add agent type and config
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'agent';

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT NULL;

-- Agent config structure:
-- {
--   "parent_account_id": "uuid",
--   "daily_spend_limit": 100.00,
--   "monthly_spend_limit": 2000.00,
--   "approved_vendors": ["api.openai.com", "anthropic.com"],
--   "approved_categories": ["ai_inference", "market_data"],
--   "requires_approval_above": 50.00,
--   "webhook_url": "https://...",
--   "x402_enabled": true
-- }

COMMENT ON COLUMN accounts.agent_config IS 'Configuration for agent-type accounts including spending policies';
```

### Agent Wallets Table

```sql
CREATE TABLE agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_account_id UUID NOT NULL REFERENCES accounts(id),

  -- Balance
  balance DECIMAL(20, 8) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USDC',

  -- On-chain address
  wallet_address VARCHAR(255),
  network VARCHAR(50) DEFAULT 'base',

  -- Spending limits
  daily_spend_limit DECIMAL(20, 8) NOT NULL,
  daily_spent DECIMAL(20, 8) DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),

  monthly_spend_limit DECIMAL(20, 8) NOT NULL,
  monthly_spent DECIMAL(20, 8) DEFAULT 0,
  monthly_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

  -- Policy
  approved_vendors TEXT[] DEFAULT '{}',
  approved_categories TEXT[] DEFAULT '{}',
  requires_approval_above DECIMAL(20, 8),

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Auto-fund
  auto_fund_enabled BOOLEAN DEFAULT FALSE,
  auto_fund_threshold DECIMAL(20, 8),
  auto_fund_amount DECIMAL(20, 8),
  auto_fund_source_account_id UUID REFERENCES accounts(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agent_wallets_agent ON agent_wallets(agent_account_id);
CREATE INDEX idx_agent_wallets_tenant ON agent_wallets(tenant_id);
CREATE INDEX idx_agent_wallets_status ON agent_wallets(tenant_id, status);

-- RLS
ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_wallets_tenant_isolation ON agent_wallets
  FOR ALL USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);
```

### x402 Transactions Table

```sql
CREATE TABLE x402_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Direction
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Parties
  payer_address VARCHAR(255) NOT NULL,
  payer_agent_id UUID REFERENCES accounts(id),
  payer_wallet_id UUID REFERENCES agent_wallets(id),

  recipient_address VARCHAR(255) NOT NULL,
  recipient_endpoint_id UUID REFERENCES x402_endpoints(id),
  recipient_account_id UUID REFERENCES accounts(id),

  -- Payment details
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  network VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(255),

  -- x402 specifics
  endpoint_path TEXT,
  request_id VARCHAR(255),
  vendor_domain VARCHAR(255),
  category VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  confirmations INT DEFAULT 0,

  -- Settlement
  settled BOOLEAN DEFAULT FALSE,
  settlement_id UUID,
  settled_at TIMESTAMPTZ,
  settlement_currency VARCHAR(10),
  settlement_amount DECIMAL(20, 8),

  -- Error
  error_code VARCHAR(50),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_x402_tx_tenant ON x402_transactions(tenant_id);
CREATE INDEX idx_x402_tx_direction ON x402_transactions(tenant_id, direction);
CREATE INDEX idx_x402_tx_status ON x402_transactions(tenant_id, status);
CREATE INDEX idx_x402_tx_endpoint ON x402_transactions(recipient_endpoint_id);
CREATE INDEX idx_x402_tx_wallet ON x402_transactions(payer_wallet_id);
CREATE INDEX idx_x402_tx_hash ON x402_transactions(tx_hash);

-- RLS
ALTER TABLE x402_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY x402_transactions_tenant_isolation ON x402_transactions
  FOR ALL USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);
```

---

## Stories

### Story 18.1: Agent Account Type Extension

**Priority:** P0
**Points:** 3
**Effort:** 2-3 hours
**Status:** Pending

**Description:**
Extend the existing `accounts` table to support agent-type accounts with spending policy configuration.

**Acceptance Criteria:**
- [ ] `agent` type added to account_type enum
- [ ] `agent_config` JSONB column added to accounts table
- [ ] Migration is backward compatible with existing accounts
- [ ] TypeScript types updated in `@payos/types`
- [ ] Zod validation schema for agent_config
- [ ] Database migration tested

**Files to Modify:**
- `apps/api/supabase/migrations/` — New migration file
- `packages/types/src/index.ts` — Add AgentConfig type
- `apps/api/src/routes/accounts.ts` — Handle agent config on create/update

---

### Story 18.2: Agent Wallet CRUD API

**Priority:** P0
**Points:** 5
**Effort:** 4-5 hours
**Status:** Pending

**Description:**
Build complete CRUD API for agent wallets including balance management and spending limit enforcement.

**API Endpoints:**
```
POST   /v1/agent-wallets           - Create agent wallet
GET    /v1/agent-wallets           - List agent wallets
GET    /v1/agent-wallets/:id       - Get wallet details
PATCH  /v1/agent-wallets/:id       - Update wallet config
DELETE /v1/agent-wallets/:id       - Disable wallet
POST   /v1/agent-wallets/:id/fund  - Add funds to wallet
GET    /v1/agent-wallets/:id/transactions - Get transaction history
```

**Business Logic:**
- Validate spending limits (daily <= monthly)
- Enforce approved vendors/categories
- Auto-reset daily/monthly counters
- Prevent negative balances
- Audit all balance changes

**Acceptance Criteria:**
- [ ] All CRUD endpoints implemented
- [ ] Spending limit validation working
- [ ] Auto-reset logic for daily/monthly limits
- [ ] Balance checks prevent overspending
- [ ] Proper RLS policies enforced
- [ ] Unit tests for all endpoints

**Files to Create:**
- `apps/api/src/routes/agent-wallets.ts`
- `apps/api/src/services/agent-wallets.ts`
- `apps/api/tests/integration/agent-wallets.test.ts`

---

### Story 18.3: Agent Payment Execution API

**Priority:** P0
**Points:** 5
**Effort:** 5-6 hours
**Status:** Pending

**Description:**
Enable agents to make autonomous x402 payments with policy enforcement and approval workflows.

**API Endpoints:**
```
POST /v1/agent-wallets/:id/pay    - Execute payment (with policy checks)
POST /v1/agent-wallets/:id/approve-payment - Approve pending payment
GET  /v1/agent-wallets/:id/pending-approvals - List pending approvals
```

**Payment Flow:**
1. Agent calls `/pay` with payment details
2. System checks:
   - Sufficient balance
   - Within daily/monthly limits
   - Vendor in approved list (if set)
   - Category in approved list (if set)
   - Amount < requires_approval_above threshold
3. If all checks pass → Execute payment immediately
4. If approval required → Create pending approval, notify human
5. Human approves/rejects via dashboard or API

**Policy Enforcement:**
```typescript
interface PaymentPolicyCheck {
  sufficient_balance: boolean;
  within_daily_limit: boolean;
  within_monthly_limit: boolean;
  vendor_approved: boolean;    // true if no vendor restriction
  category_approved: boolean;  // true if no category restriction
  requires_approval: boolean;  // true if amount > threshold
  can_execute: boolean;        // All above true
}
```

**Acceptance Criteria:**
- [ ] Payment execution with full policy checks
- [ ] Spending limits enforced (balance, daily, monthly)
- [ ] Vendor/category restrictions enforced
- [ ] Approval workflow for high-value payments
- [ ] Idempotency on payment requests
- [ ] Real-time balance updates
- [ ] Transaction history tracked
- [ ] Integration tests for all policy scenarios

**Files to Create:**
- `apps/api/src/services/agent-payments.ts`
- `apps/api/src/routes/agent-payments.ts`
- `apps/api/tests/integration/agent-payments.test.ts`

---

### Story 18.4: Payment Approval Workflow

**Priority:** P1
**Points:** 3
**Effort:** 3-4 hours
**Status:** Pending

**Description:**
Build approval workflow for agent payments that exceed policy thresholds.

**Workflow:**
1. Agent attempts payment > `requires_approval_above`
2. System creates `pending_approval` record
3. Webhook sent to `agent_config.webhook_url`
4. Email/notification sent to account owner
5. Human reviews payment details
6. Approves or rejects via dashboard/API
7. If approved → Execute payment
8. If rejected → Notify agent, release funds

**Database Schema:**
```sql
CREATE TABLE agent_payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wallet_id UUID NOT NULL REFERENCES agent_wallets(id),
  agent_id UUID NOT NULL REFERENCES accounts(id),

  -- Payment details
  recipient VARCHAR(255) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  memo TEXT,
  category VARCHAR(100),

  -- Approval state
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID,

  -- Decision
  decision VARCHAR(20), -- 'approved', 'rejected'
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,

  -- Result
  transaction_id UUID REFERENCES x402_transactions(id),
  executed_at TIMESTAMPTZ
);
```

**Acceptance Criteria:**
- [ ] Pending approvals tracked in database
- [ ] Webhook sent on approval request
- [ ] Dashboard UI shows pending approvals
- [ ] Approve/reject API endpoints
- [ ] Auto-timeout after 24 hours
- [ ] Transaction executed after approval
- [ ] Funds released after rejection

**Files to Create:**
- `apps/api/src/services/agent-approvals.ts`
- `apps/api/src/routes/agent-approvals.ts`

---

### Story 18.5: Agent Wallet Dashboard

**Priority:** P1
**Points:** 4
**Effort:** 4-5 hours
**Status:** Pending

**Description:**
Build dashboard UI for managing agent wallets, viewing transactions, and approving payments.

**Pages:**
1. **Agent Wallets List** (`/dashboard/agent-wallets`)
   - Table of all wallets
   - Balance, spend limits, status
   - Quick fund button

2. **Wallet Detail** (`/dashboard/agent-wallets/:id`)
   - Balance breakdown
   - Spending limits (daily/monthly progress bars)
   - Recent transactions
   - Policy configuration
   - Fund wallet form

3. **Pending Approvals** (`/dashboard/agent-wallets/approvals`)
   - List of pending payment approvals
   - Payment details, requester, amount
   - Approve/Reject buttons
   - Approval history

**Components:**
- `AgentWalletsTable.tsx`
- `WalletDetail.tsx`
- `WalletBalanceCard.tsx`
- `SpendingLimitsCard.tsx`
- `WalletTransactions.tsx`
- `WalletPolicyConfig.tsx`
- `FundWalletModal.tsx`
- `PaymentApprovalCard.tsx`
- `PendingApprovalsList.tsx`

**Acceptance Criteria:**
- [ ] Wallets list page with search/filter
- [ ] Wallet detail page with all info
- [ ] Fund wallet modal working
- [ ] Policy configuration form
- [ ] Pending approvals page
- [ ] Approve/reject actions working
- [ ] Real-time balance updates
- [ ] Transaction history with pagination

**Files to Create:**
- `apps/web/src/app/dashboard/agent-wallets/page.tsx`
- `apps/web/src/app/dashboard/agent-wallets/[id]/page.tsx`
- `apps/web/src/app/dashboard/agent-wallets/approvals/page.tsx`
- `apps/web/src/components/agent-wallets/*`

---

### Story 18.6: Agent Payment SDK

**Priority:** P1
**Points:** 3
**Effort:** 3-4 hours
**Status:** Pending

**Description:**
Create JavaScript SDK for AI agents to make x402 payments with automatic policy checking and approval handling.

**SDK Features:**
```typescript
import { AgentPaymentClient } from '@payos/agent-payment-sdk';

const client = new AgentPaymentClient({
  apiKey: 'agent_...',
  walletId: 'wallet-uuid',
});

// Make a payment
const payment = await client.pay({
  recipient: 'api.openai.com',
  amount: 5.00,
  memo: 'GPT-4 API calls',
  category: 'ai_inference',
});

// Check if approval needed
if (payment.status === 'pending_approval') {
  console.log('Waiting for approval:', payment.approval_url);

  // Poll for approval
  const result = await client.waitForApproval(payment.id, {
    timeout: 3600, // 1 hour
    pollInterval: 30, // 30 seconds
  });
}

// Get wallet balance
const balance = await client.getBalance();

// Get spending limits
const limits = await client.getLimits();
```

**Acceptance Criteria:**
- [ ] SDK supports all payment operations
- [ ] Automatic retry with exponential backoff
- [ ] Policy check before payment
- [ ] Approval polling with timeout
- [ ] Balance and limits queries
- [ ] TypeScript types included
- [ ] Unit tests for SDK
- [ ] Documentation with examples

**Files to Create:**
- `packages/agent-payment-sdk/src/index.ts`
- `packages/agent-payment-sdk/src/client.ts`
- `packages/agent-payment-sdk/README.md`
- `packages/agent-payment-sdk/tests/`

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 18.1 Agent Account Type Extension | 3 | P0 | Pending |
| 18.2 Agent Wallet CRUD API | 5 | P0 | Pending |
| 18.3 Agent Payment Execution API | 5 | P0 | Pending |
| 18.4 Payment Approval Workflow | 3 | P1 | Pending |
| 18.5 Agent Wallet Dashboard | 4 | P1 | Pending |
| 18.6 Agent Payment SDK | 3 | P1 | Pending |
| **Total** | **23** | | **0/6 Complete** |

---

## Technical Deliverables

**Backend:**
- 2 new database tables (`agent_wallets`, `agent_payment_approvals`)
- 1 extended table (`accounts` with agent_config)
- 2 new API route modules
- Policy enforcement service
- Approval workflow service
- Spending limit tracking

**Frontend:**
- 3 new pages (wallets list, wallet detail, approvals)
- 8+ new components
- Real-time balance updates
- Approval management UI

**SDK:**
- Agent payment SDK package
- TypeScript support
- Retry logic and error handling
- Approval polling utilities

---

## Dependencies

**Prerequisites:**
- Epic 17 (Multi-Protocol Gateway) must be complete for x402 payment execution

**Related Epics:**
- Epic 17: Provides the protocol infrastructure for receiving payments
- Epic 29: Workflow Engine can be used for advanced approval chains
- Epic 30: Structured Response System for agent-friendly error messages

---

## Success Criteria

- [ ] Agents can create wallets with spending limits
- [ ] Agents can make autonomous x402 payments within policy
- [ ] Policy violations trigger approval workflow
- [ ] Dashboard shows real-time wallet balances and limits
- [ ] Approval flow tested end-to-end
- [ ] SDK enables easy agent integration
- [ ] All operations < 500ms latency
- [ ] Comprehensive audit trail of all agent payments

---

## Related Documentation

TBD - To be created during implementation:
- Agent Wallet Setup Guide
- Agent Payment SDK Documentation
- Payment Policy Configuration Guide
- Approval Workflow Guide
