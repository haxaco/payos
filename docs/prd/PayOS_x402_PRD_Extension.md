# PayOS x402 Infrastructure — PRD Extension

**Version:** 1.7  
**Date:** December 17, 2025  
**Status:** New Epic — Planning Phase  

---

## x402 Executive Summary

x402 extends PayOS from a traditional payment platform to an **agentic payment infrastructure** that enables machine-to-machine payments via the HTTP 402 protocol. This positions PayOS as the foundation for the emerging AI economy in LATAM.

### Strategic Value

1. **Differentiation** — First LATAM-focused x402 infrastructure
2. **New Revenue Streams** — Gateway fees, agent wallet fees, PayOS API monetization
3. **Network Effects** — More APIs → More agents → More volume → Better data → Better services
4. **Future-Proofing** — Ready for agentic commerce before competitors

### What is x402?

HTTP 402 "Payment Required" enables APIs to charge per-call without subscriptions:

```
Client: GET /api/expensive-endpoint
Server: 402 Payment Required
        X-Payment-Address: 0x1234...
        X-Payment-Amount: 0.01
        X-Payment-Currency: USDC

Client: [Pays via stablecoin]
Client: GET /api/expensive-endpoint
        X-Payment-Proof: [transaction hash]

Server: 200 OK [Returns data]
```

### Implementation Phases

| Phase | Focus | Timeline | Epic |
|-------|-------|----------|------|
| **Phase A** | x402 Gateway & Verification | Weeks 1-4 | Epic 17 |
| **Phase B** | Agent Wallets & Policies | Weeks 5-8 | Epic 18 |
| **Phase C** | PayOS x402 Services | Weeks 9-12 | Epic 19 |
| **Phase D** | Streaming Payments & Registry | Weeks 13-16 | Epic 20 |

**Total Estimated Points:** 89 points (~89 hours)

---

## Table of Contents Additions

Add to existing PRD Table of Contents:

```
21. [Epic 17: x402 Gateway Infrastructure](#epic-17-x402-gateway-infrastructure)
22. [Epic 18: Agent Wallets & Spending Policies](#epic-18-agent-wallets--spending-policies)
23. [Epic 19: PayOS x402 Services](#epic-19-payos-x402-services)
24. [Epic 20: Streaming Payments & Agent Registry](#epic-20-streaming-payments--agent-registry)
```

---

## Data Models — x402 Extensions

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

### New Table: x402_endpoints

```sql
CREATE TABLE x402_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Endpoint configuration
  name VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'ANY',
  description TEXT,
  
  -- Pricing
  base_price DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Pricing modifiers
  volume_discounts JSONB DEFAULT '[]',
  region_pricing JSONB DEFAULT '[]',
  
  -- Metering
  total_calls BIGINT DEFAULT 0,
  total_revenue DECIMAL(20, 8) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  
  -- Webhook
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_x402_endpoints_tenant ON x402_endpoints(tenant_id);
CREATE INDEX idx_x402_endpoints_account ON x402_endpoints(account_id);
CREATE INDEX idx_x402_endpoints_status ON x402_endpoints(tenant_id, status);

-- RLS Policies
ALTER TABLE x402_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY x402_endpoints_tenant_isolation ON x402_endpoints
  FOR ALL USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);
```

### New Table: agent_wallets

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

### New Table: x402_transactions

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

### New Table: payment_streams_x402

```sql
CREATE TABLE payment_streams_x402 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Parties
  payer_wallet_id UUID NOT NULL REFERENCES agent_wallets(id),
  payer_account_id UUID NOT NULL REFERENCES accounts(id),
  recipient_address VARCHAR(255) NOT NULL,
  recipient_account_id UUID REFERENCES accounts(id),
  
  -- Stream config
  rate_per_second DECIMAL(20, 12) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Limits
  max_duration_seconds INT,
  max_amount DECIMAL(20, 8),
  
  -- State
  status VARCHAR(20) DEFAULT 'created',
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_streamed DECIMAL(20, 8) DEFAULT 0,
  total_duration_seconds INT DEFAULT 0,
  
  -- On-chain
  stream_contract_address VARCHAR(255),
  network VARCHAR(50),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streams_x402_tenant ON payment_streams_x402(tenant_id);
CREATE INDEX idx_streams_x402_status ON payment_streams_x402(tenant_id, status);

-- RLS
ALTER TABLE payment_streams_x402 ENABLE ROW LEVEL SECURITY;

CREATE POLICY streams_x402_tenant_isolation ON payment_streams_x402
  FOR ALL USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);
```

### TypeScript Types

```typescript
// packages/types/src/x402.ts

export type X402EndpointStatus = 'active' | 'paused' | 'disabled';
export type AgentWalletStatus = 'active' | 'frozen' | 'depleted';
export type X402TransactionDirection = 'inbound' | 'outbound';
export type X402TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';
export type X402StreamStatus = 'created' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface X402Endpoint {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'ANY';
  description?: string;
  basePrice: number;
  currency: 'USDC' | 'EURC';
  volumeDiscounts?: Array<{ threshold: number; priceMultiplier: number }>;
  regionPricing?: Array<{ region: string; priceMultiplier: number }>;
  totalCalls: number;
  totalRevenue: number;
  status: X402EndpointStatus;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWallet {
  id: string;
  tenantId: string;
  agentAccountId: string;
  balance: number;
  currency: 'USDC';
  walletAddress?: string;
  network: 'base' | 'ethereum' | 'solana';
  dailySpendLimit: number;
  dailySpent: number;
  dailyRemaining: number;
  monthlySpendLimit: number;
  monthlySpent: number;
  monthlyRemaining: number;
  approvedVendors: string[];
  approvedCategories: string[];
  requiresApprovalAbove?: number;
  status: AgentWalletStatus;
  autoFund?: {
    enabled: boolean;
    threshold: number;
    amount: number;
    sourceAccountId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface X402Transaction {
  id: string;
  tenantId: string;
  direction: X402TransactionDirection;
  payerAddress: string;
  payerAgentId?: string;
  payerWalletId?: string;
  recipientAddress: string;
  recipientEndpointId?: string;
  recipientAccountId?: string;
  amount: number;
  currency: 'USDC';
  network: string;
  txHash?: string;
  endpointPath?: string;
  requestId?: string;
  vendorDomain?: string;
  category?: string;
  status: X402TransactionStatus;
  confirmations: number;
  settled: boolean;
  settlementId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface PaymentStreamX402 {
  id: string;
  tenantId: string;
  payerWalletId: string;
  payerAccountId: string;
  recipientAddress: string;
  recipientAccountId?: string;
  ratePerSecond: number;
  ratePerHour: number;
  currency: 'USDC';
  maxDurationSeconds?: number;
  maxAmount?: number;
  status: X402StreamStatus;
  startedAt?: string;
  endedAt?: string;
  totalStreamed: number;
  totalDurationSeconds: number;
  description?: string;
  createdAt: string;
}

// Request Types
export interface CreateX402EndpointRequest {
  name: string;
  path: string;
  method?: 'GET' | 'POST' | 'ANY';
  description?: string;
  basePrice: number;
  currency?: 'USDC' | 'EURC';
  volumeDiscounts?: Array<{ threshold: number; priceMultiplier: number }>;
  webhookUrl?: string;
}

export interface CreateAgentWalletRequest {
  agentAccountId: string;
  dailySpendLimit: number;
  monthlySpendLimit: number;
  approvedVendors?: string[];
  approvedCategories?: string[];
  requiresApprovalAbove?: number;
  network?: 'base' | 'ethereum' | 'solana';
}

export interface AgentPayRequest {
  recipient: string;
  amount: number;
  memo?: string;
  category?: string;
}

export interface VerifyX402PaymentRequest {
  txHash: string;
  expectedAmount: number;
  endpointId: string;
  requestId?: string;
}

export interface VerifyX402PaymentResponse {
  verified: boolean;
  status: 'verified' | 'pending' | 'insufficient' | 'invalid';
  payer?: string;
  amount?: number;
  confirmations?: number;
  transactionId?: string;
}
```

---

## Epic 17: x402 Gateway Infrastructure

### Overview

Build the foundational x402 payment gateway that enables partners to monetize their APIs via machine payments. This is the infrastructure for **receiving** x402 payments.

**Phase:** A (Weeks 1-4)  
**Priority:** P1  
**Total Points:** 21  

### Stories

#### Story 17.1: x402 Endpoints API
**Points:** 5  
**Priority:** P0  

**Description:**  
Implement CRUD endpoints for managing x402-enabled API endpoints. Partners register their APIs with pricing configuration.

**Acceptance Criteria:**
- [ ] POST /v1/x402/endpoints - Create endpoint registration
- [ ] GET /v1/x402/endpoints - List endpoints with stats
- [ ] GET /v1/x402/endpoints/:id - Get endpoint details
- [ ] PATCH /v1/x402/endpoints/:id - Update endpoint config
- [ ] DELETE /v1/x402/endpoints/:id - Disable endpoint
- [ ] Validate pricing configuration
- [ ] Generate webhook secret on creation
- [ ] Return SDK integration snippet

**API Specification:**

```yaml
/v1/x402/endpoints:
  post:
    summary: Register an x402-enabled endpoint
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateX402EndpointRequest'
    responses:
      201:
        description: Endpoint registered
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  $ref: '#/components/schemas/X402Endpoint'
                webhookSecret:
                  type: string
                sdkSnippet:
                  type: string

  get:
    summary: List x402 endpoints
    parameters:
      - name: status
        in: query
        schema:
          type: string
          enum: [active, paused, disabled]
      - name: page
        in: query
        schema:
          type: integer
      - name: limit
        in: query
        schema:
          type: integer
    responses:
      200:
        description: List of endpoints
```

**Implementation Notes:**
- Generate unique webhook secret using `crypto.randomBytes(32).toString('hex')`
- SDK snippet should include JavaScript and Python examples
- Validate that path doesn't conflict with existing endpoints

---

#### Story 17.2: x402 Payment Verification API
**Points:** 5  
**Priority:** P0  

**Description:**  
Implement the core payment verification endpoint that validates x402 payments on-chain and records transactions.

**Acceptance Criteria:**
- [ ] POST /v1/x402/verify - Verify payment transaction
- [ ] Check transaction on-chain (mocked for PoC)
- [ ] Validate amount matches expected
- [ ] Record transaction in database
- [ ] Update endpoint metrics (calls, revenue)
- [ ] Return verification result with status
- [ ] Handle pending confirmations
- [ ] Support idempotency via request_id

**API Specification:**

```yaml
/v1/x402/verify:
  post:
    summary: Verify an x402 payment
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [txHash, expectedAmount, endpointId]
            properties:
              txHash:
                type: string
              expectedAmount:
                type: number
              endpointId:
                type: string
                format: uuid
              requestId:
                type: string
              network:
                type: string
                default: base
    responses:
      200:
        description: Payment verification result
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyX402PaymentResponse'
```

**Implementation Notes:**
- For PoC, mock on-chain verification
- In production, call blockchain RPC to verify transaction
- Use requestId for idempotency - return cached result if same requestId

---

#### Story 17.3: x402 Transaction History API
**Points:** 3  
**Priority:** P1  

**Description:**  
Implement endpoints to query x402 transaction history with filtering and analytics.

**Acceptance Criteria:**
- [ ] GET /v1/x402/transactions - List transactions
- [ ] Filter by direction (inbound/outbound)
- [ ] Filter by status, endpoint, date range
- [ ] Pagination support
- [ ] GET /v1/x402/transactions/:id - Get single transaction
- [ ] GET /v1/x402/transactions/stats - Aggregate statistics

**API Specification:**

```yaml
/v1/x402/transactions:
  get:
    summary: List x402 transactions
    parameters:
      - name: direction
        in: query
        schema:
          type: string
          enum: [inbound, outbound]
      - name: status
        in: query
        schema:
          type: string
      - name: endpointId
        in: query
        schema:
          type: string
      - name: startDate
        in: query
        schema:
          type: string
          format: date-time
      - name: endDate
        in: query
        schema:
          type: string
          format: date-time
    responses:
      200:
        description: Transaction list with pagination

/v1/x402/transactions/stats:
  get:
    summary: Get transaction statistics
    parameters:
      - name: period
        in: query
        schema:
          type: string
          enum: [day, week, month]
    responses:
      200:
        description: Aggregated statistics
```

---

#### Story 17.4: x402 Settlement Service
**Points:** 5  
**Priority:** P1  

**Description:**  
Implement automated settlement of x402 inbound payments to partner accounts with LATAM currency conversion support.

**Acceptance Criteria:**
- [ ] POST /v1/x402/settle - Trigger manual settlement
- [ ] GET /v1/x402/settlements - List settlement history
- [ ] Aggregate pending inbound payments
- [ ] Support settlement currencies (USDC, USD, BRL, MXN)
- [ ] Create settlement record
- [ ] Update transaction settled status
- [ ] Minimum settlement threshold
- [ ] Integration with existing transfer flow for non-USDC

**API Specification:**

```yaml
/v1/x402/settle:
  post:
    summary: Trigger settlement
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              accountId:
                type: string
                description: Settle only for this account
              currency:
                type: string
                enum: [USDC, USD, BRL, MXN]
                default: USDC
              minAmount:
                type: number
                default: 10
    responses:
      200:
        description: Settlement result
        content:
          application/json:
            schema:
              type: object
              properties:
                settled:
                  type: boolean
                settlementId:
                  type: string
                amount:
                  type: number
                transactionCount:
                  type: integer
```

---

#### Story 17.5: x402 JavaScript SDK
**Points:** 3  
**Priority:** P1  

**Description:**  
Create JavaScript/TypeScript SDK for easy x402 gateway integration.

**Acceptance Criteria:**
- [ ] Express/Hono middleware for payment requirements
- [ ] Automatic 402 response generation
- [ ] Payment verification helper
- [ ] TypeScript types included
- [ ] NPM package structure
- [ ] Documentation and examples

**SDK Usage Example:**

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({ apiKey: 'pk_...' });

// Middleware usage
app.get('/api/data',
  payos.x402.requirePayment({ amount: 0.10, endpointId: '...' }),
  (req, res) => {
    res.json({ data: '...' });
  }
);

// Manual verification
const result = await payos.x402.verify({
  txHash: '0x...',
  expectedAmount: 0.10,
  endpointId: '...'
});
```

---

#### Story 17.6: x402 Dashboard Screens
**Points:** 5  
**Priority:** P1  

**Description:**  
Implement dashboard UI for managing x402 endpoints and viewing analytics.

**Acceptance Criteria:**
- [ ] x402 Overview page with revenue/calls stats
- [ ] Endpoint Management page (list, create, edit)
- [ ] Endpoint Detail with integration code snippet
- [ ] Transaction History with filters
- [ ] Settlement History
- [ ] Add x402 section to sidebar navigation

**New Dashboard Pages:**
- `/x402` - Overview with stats cards
- `/x402/endpoints` - Endpoint list
- `/x402/endpoints/[id]` - Endpoint detail
- `/x402/transactions` - Transaction history
- `/x402/settlements` - Settlement history

---

### Epic 17 Total Estimate

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 17.1 x402 Endpoints API | 5 | P0 | Pending |
| 17.2 x402 Payment Verification API | 5 | P0 | Pending |
| 17.3 x402 Transaction History API | 3 | P1 | Pending |
| 17.4 x402 Settlement Service | 5 | P1 | Pending |
| 17.5 x402 JavaScript SDK | 3 | P1 | Pending |
| 17.6 x402 Dashboard Screens | 5 | P1 | Pending |
| **Total** | **26** | | **0/6 Complete** |

---

## Epic 18: Agent Wallets & Spending Policies

### Overview

Build the agent wallet system that enables AI agents to make autonomous x402 payments within policy-defined bounds. This is the infrastructure for **making** x402 payments.

**Phase:** B (Weeks 5-8)  
**Priority:** P1  
**Total Points:** 23  

### Stories

#### Story 18.1: Agent Account Type Extension
**Points:** 3  
**Priority:** P0  

**Description:**  
Extend the existing account system to support `agent` type accounts with x402-specific configuration.

**Acceptance Criteria:**
- [ ] Add 'agent' to account_type enum
- [ ] Add agent_config JSONB column
- [ ] POST /v1/accounts with type='agent' creates agent account
- [ ] Validate parent_account_id for agent accounts
- [ ] Agent inherits tenant from parent account
- [ ] Auto-create wallet when agent account created
- [ ] Update mapAccountFromDb for agent fields

**Business Rules:**
- Agent accounts must have a parent business account
- Agent accounts use KYA verification type
- Agent spending rolls up to parent account reporting

---

#### Story 18.2: Agent Wallet CRUD API
**Points:** 5  
**Priority:** P0  

**Description:**  
Implement full CRUD operations for agent wallets including balance management and policy configuration.

**Acceptance Criteria:**
- [ ] GET /v1/agents/:id/wallet - Get wallet details with remaining limits
- [ ] POST /v1/agents/:id/wallet/fund - Add funds from treasury or external
- [ ] PATCH /v1/agents/:id/wallet/policies - Update spending policies
- [ ] GET /v1/agents/:id/wallet/transactions - Get spending history
- [ ] Automatic daily/monthly spend reset
- [ ] Auto-fund trigger when balance low

**API Specification:**

```yaml
/v1/agents/{agentId}/wallet:
  get:
    summary: Get agent wallet status
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  allOf:
                    - $ref: '#/components/schemas/AgentWallet'
                    - type: object
                      properties:
                        dailyRemaining:
                          type: number
                        monthlyRemaining:
                          type: number

/v1/agents/{agentId}/wallet/fund:
  post:
    summary: Fund agent wallet
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [amount]
            properties:
              amount:
                type: number
              source:
                type: string
                enum: [treasury, external]
                default: treasury
              externalTxHash:
                type: string

/v1/agents/{agentId}/wallet/policies:
  patch:
    summary: Update wallet policies
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              dailySpendLimit:
                type: number
              monthlySpendLimit:
                type: number
              approvedVendors:
                type: array
                items:
                  type: string
              approvedCategories:
                type: array
                items:
                  type: string
              requiresApprovalAbove:
                type: number
              autoFund:
                type: object
                properties:
                  enabled:
                    type: boolean
                  threshold:
                    type: number
                  amount:
                    type: number
                  sourceAccountId:
                    type: string
```

---

#### Story 18.3: Agent Payment Execution API
**Points:** 5  
**Priority:** P0  

**Description:**  
Implement the core payment execution endpoint that allows agents to make x402 payments within policy bounds.

**Acceptance Criteria:**
- [ ] POST /v1/agents/:id/pay - Execute payment
- [ ] Validate against spending policies
- [ ] Check approved vendors list
- [ ] Enforce daily/monthly limits
- [ ] Handle requires_approval_above threshold
- [ ] Execute on-chain payment (mocked for PoC)
- [ ] Update wallet balance and spending totals
- [ ] Trigger auto-fund if threshold met
- [ ] Return payment result with tx hash

**API Specification:**

```yaml
/v1/agents/{agentId}/pay:
  post:
    summary: Execute x402 payment from agent wallet
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required: [recipient, amount]
            properties:
              recipient:
                type: string
                description: Address or x402 endpoint URL
              amount:
                type: number
              memo:
                type: string
              category:
                type: string
    responses:
      200:
        description: Payment executed
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                txHash:
                  type: string
                newBalance:
                  type: number
                transactionId:
                  type: string
      402:
        description: Approval required (amount exceeds threshold)
      403:
        description: Policy violation
```

**Policy Violation Response Examples:**

```json
// Vendor not approved
{
  "error": "Vendor not approved",
  "vendor": "unknown-api.com",
  "approvedVendors": ["api.openai.com", "anthropic.com"]
}

// Daily limit exceeded
{
  "error": "Daily spend limit exceeded",
  "dailyLimit": 100,
  "dailySpent": 95,
  "requested": 10
}

// Requires approval
{
  "error": "Approval required",
  "approvalId": "uuid",
  "threshold": 50,
  "amount": 75
}
```

---

#### Story 18.4: Payment Approval Workflow
**Points:** 3  
**Priority:** P1  

**Description:**  
Implement approval workflow for payments exceeding the requires_approval_above threshold.

**Acceptance Criteria:**
- [ ] Create payment_approvals table
- [ ] POST /v1/approvals/:id/approve - Approve pending payment
- [ ] POST /v1/approvals/:id/reject - Reject pending payment
- [ ] GET /v1/approvals - List pending approvals
- [ ] Webhook notification on approval request
- [ ] Auto-execute approved payments
- [ ] Expiration for unapproved requests (24h default)

---

#### Story 18.5: Agent Wallet Dashboard
**Points:** 4  
**Priority:** P1  

**Description:**  
Implement dashboard UI for managing agent wallets and viewing spending analytics.

**Acceptance Criteria:**
- [ ] Agent Wallet detail panel on agent page
- [ ] Spending breakdown by category/vendor
- [ ] Policy configuration UI
- [ ] Funding modal
- [ ] Spending history table
- [ ] Daily/monthly limit progress bars
- [ ] Approved vendors management

**UI Components:**
- `AgentWallet.tsx` - Wallet overview card
- `WalletFundModal.tsx` - Funding dialog
- `WalletPolicies.tsx` - Policy editor
- `SpendingChart.tsx` - Spending visualization

---

#### Story 18.6: Agent Payment SDK
**Points:** 3  
**Priority:** P1  

**Description:**  
Create SDK methods for agents to easily make x402 payments with automatic policy handling.

**Acceptance Criteria:**
- [ ] AgentWallet class for SDK
- [ ] Automatic x402 header handling
- [ ] Policy-aware payment methods
- [ ] Balance and limit checking
- [ ] TypeScript types

**SDK Usage Example:**

```typescript
import { AgentWallet } from '@payos/sdk';

const wallet = new AgentWallet({
  apiKey: 'agent_...',
  agentId: 'uuid'
});

// Check if payment is allowed
const canPay = await wallet.canPay(10.00, 'api.openai.com');

// Make payment
const result = await wallet.pay({
  recipient: '0x...',
  amount: 10.00,
  category: 'ai_inference'
});

// Make x402 API call (handles 402 automatically)
const response = await wallet.x402Request('https://api.example.com/data');
```

---

### Epic 18 Total Estimate

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

## Epic 19: PayOS x402 Services (Drink Our Champagne)

### Overview

Build PayOS's own x402-monetized services that demonstrate the platform capabilities while generating revenue. These services provide real value to LATAM-focused startups.

**Phase:** C (Weeks 9-12)  
**Priority:** P2  
**Total Points:** 22  

### Services to Build

| Service | Description | Pricing |
|---------|-------------|---------|
| Compliance Check | LATAM identity/document verification | $0.25-0.50/call |
| FX Intelligence | Rate analysis and timing recommendations | $0.05-0.25/call |
| Payment Routing | Optimal route recommendations | $0.15/call |
| Treasury Analysis | AI treasury recommendations | $1.00/call |
| Document Generation | Compliant LATAM payment docs | $0.50/call |

### Stories

#### Story 19.1: Compliance Check API
**Points:** 5  
**Priority:** P1  

**Description:**  
Build a compliance verification API for LATAM that validates identity documents, checks sanctions, and performs PEP screening.

**Acceptance Criteria:**
- [ ] POST /v1/services/compliance/check - x402-gated endpoint
- [ ] Validate Brazilian CPF/CNPJ
- [ ] Validate Mexican RFC/CURP
- [ ] Validate Colombian NIT/CC
- [ ] Mock sanctions list check
- [ ] Mock PEP database check
- [ ] Tiered pricing (basic $0.25, enhanced $0.50)

**Request/Response:**

```json
// Request
{
  "type": "person",
  "country": "BR",
  "document": "123.456.789-00",
  "name": "João Silva",
  "enhanced": true
}

// Response
{
  "valid": true,
  "documentType": "CPF",
  "status": "active",
  "alerts": [],
  "sanctionsCheck": "clear",
  "pepCheck": "clear"
}
```

---

#### Story 19.2: FX Intelligence API
**Points:** 5  
**Priority:** P1  

**Description:**  
Build an FX intelligence API for LATAM currency analysis and optimal timing recommendations.

**Acceptance Criteria:**
- [ ] GET /v1/services/fx/rates - Current rates (free tier)
- [ ] POST /v1/services/fx/optimal-timing - Timing recommendation ($0.10)
- [ ] POST /v1/services/fx/analysis - Full analysis ($0.25)
- [ ] Support USD/BRL, USD/MXN, USD/COP, USD/ARS
- [ ] Historical rate comparison
- [ ] Confidence scores for recommendations

**Request/Response:**

```json
// Request
{
  "from": "USD",
  "to": "BRL",
  "amount": 10000
}

// Response
{
  "currentRate": 5.12,
  "recommendation": "wait",
  "confidence": 0.73,
  "reasoning": "BRL typically strengthens in first week of month",
  "optimalWindow": {
    "start": "2025-01-02T14:00:00Z",
    "end": "2025-01-02T18:00:00Z",
    "expectedRate": 5.05
  },
  "historicalAccuracy": 0.68
}
```

---

#### Story 19.3: Payment Routing API
**Points:** 4  
**Priority:** P1  

**Description:**  
Build an API that recommends optimal payment routes for LATAM transactions.

**Acceptance Criteria:**
- [ ] POST /v1/services/routing/recommend - Route recommendation ($0.15)
- [ ] Compare stablecoin vs wire vs local rails
- [ ] Estimate costs and timing
- [ ] Consider urgency levels
- [ ] Return alternatives ranked by cost/speed

**Response Example:**

```json
{
  "recommendedRoute": "usdc_spei",
  "estimatedCost": 12.50,
  "estimatedTime": "30 minutes",
  "alternatives": [
    {
      "route": "wire",
      "cost": 45.00,
      "time": "1-2 business days"
    },
    {
      "route": "usdc_spei_batch",
      "cost": 8.75,
      "time": "4 hours",
      "note": "Batched with other payments"
    }
  ]
}
```

---

#### Story 19.4: Treasury Analysis API
**Points:** 5  
**Priority:** P2  

**Description:**  
Build an AI-powered treasury analysis API that provides recommendations for multi-currency operations.

**Acceptance Criteria:**
- [ ] POST /v1/services/treasury/analyze - Full analysis ($1.00)
- [ ] Accept multi-currency account balances
- [ ] Accept upcoming obligations
- [ ] Generate actionable recommendations
- [ ] Project future balances
- [ ] Identify FX opportunities

---

#### Story 19.5: x402 Services Dashboard
**Points:** 3  
**Priority:** P2  

**Description:**  
Build dashboard to view PayOS services usage and manage service configuration.

**Acceptance Criteria:**
- [ ] Services Overview page showing available APIs
- [ ] Usage statistics per service
- [ ] Revenue tracking
- [ ] Interactive API documentation
- [ ] Test endpoints from dashboard

---

### Epic 19 Total Estimate

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 19.1 Compliance Check API | 5 | P1 | Pending |
| 19.2 FX Intelligence API | 5 | P1 | Pending |
| 19.3 Payment Routing API | 4 | P1 | Pending |
| 19.4 Treasury Analysis API | 5 | P2 | Pending |
| 19.5 x402 Services Dashboard | 3 | P2 | Pending |
| **Total** | **22** | | **0/5 Complete** |

---

## Epic 20: Streaming Payments & Agent Registry

### Overview

Build streaming payment infrastructure and agent discovery registry for the emerging agent economy.

**Phase:** D (Weeks 13-16)  
**Priority:** P2  
**Total Points:** 18  

### Stories

#### Story 20.1: Streaming Payments API
**Points:** 5  
**Priority:** P1  

**Description:**  
Implement payment streams that allow continuous per-second payments from agent wallets.

**Acceptance Criteria:**
- [ ] POST /v1/streams/x402 - Create stream
- [ ] POST /v1/streams/x402/:id/start - Start streaming
- [ ] POST /v1/streams/x402/:id/pause - Pause stream
- [ ] POST /v1/streams/x402/:id/stop - Stop and settle
- [ ] GET /v1/streams/x402/:id - Get stream status with real-time totals
- [ ] Background job for balance updates
- [ ] Integration with agent wallet limits

**Use Cases:**
- Contractor payments (stream by hour worked)
- API consumption (stream by usage)
- Compute resources (stream by time)

---

#### Story 20.2: Streaming Dashboard UI
**Points:** 3  
**Priority:** P1  

**Description:**  
Build UI for managing x402 payment streams.

**Acceptance Criteria:**
- [ ] Active Streams list with real-time updates
- [ ] Stream creation modal
- [ ] Stream detail view with progress
- [ ] Start/pause/stop controls
- [ ] Completed streams history

---

#### Story 20.3: Agent Registry API
**Points:** 5  
**Priority:** P2  

**Description:**  
Build a registry for agents to discover and transact with each other.

**Acceptance Criteria:**
- [ ] POST /v1/registry/agents - Register agent capabilities
- [ ] GET /v1/registry/agents - Search agents by capability
- [ ] GET /v1/registry/agents/:id - Get agent details
- [ ] Capability taxonomy (ai_inference, data, etc.)
- [ ] Pricing discovery
- [ ] Reputation/rating system (basic)

---

#### Story 20.4: Agent Discovery Dashboard
**Points:** 3  
**Priority:** P2  

**Description:**  
Build UI for browsing and discovering registered agents.

**Acceptance Criteria:**
- [ ] Agent marketplace browser
- [ ] Search and filter by capability
- [ ] Agent profile pages
- [ ] Integration instructions

---

#### Story 20.5: Python SDK
**Points:** 2  
**Priority:** P2  

**Description:**  
Create Python SDK for x402 integration.

**Acceptance Criteria:**
- [ ] Flask/FastAPI middleware
- [ ] Agent wallet client
- [ ] Streaming payment client
- [ ] PyPI package structure

---

### Epic 20 Total Estimate

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 20.1 Streaming Payments API | 5 | P1 | Pending |
| 20.2 Streaming Dashboard UI | 3 | P1 | Pending |
| 20.3 Agent Registry API | 5 | P2 | Pending |
| 20.4 Agent Discovery Dashboard | 3 | P2 | Pending |
| 20.5 Python SDK | 2 | P2 | Pending |
| **Total** | **18** | | **0/5 Complete** |

---

## Customer Use Case: LATAM Incorporation Service

### Scenario

Your client helps LATAM startups incorporate US subsidiaries. Their customers need to:
- Pay contractors in Brazil/Mexico/Colombia
- Handle vendor payments
- Manage treasury across US and LATAM entities
- Eventually have their own AI agents that need to pay for services

### How x402 Fits

**Phase 1: Traditional PayOS**
- Startups use PayOS dashboard for payroll and vendor payments
- Stablecoin → local currency via Pix/SPEI
- Partner earns referral revenue

**Phase 2: x402 Gateway**
- Startups monetize their own APIs via x402
- Data APIs, ML models, market intelligence
- Settlement to Pix/SPEI in local currency

**Phase 3: Agent Wallets**
- Startups' AI agents get wallets with spending policies
- Agents can call external x402 APIs
- Treasury oversight via dashboard

**Phase 4: Full Agentic**
- Agent-to-agent commerce
- Streaming payments for contractors
- PayOS x402 services for compliance/FX intelligence

### Revenue Model

| Service | Fee | At 100 Startups |
|---------|-----|-----------------|
| Platform fee | $300/mo | $30,000/mo |
| Transaction fees | 0.3% of $50K avg | $15,000/mo |
| x402 Gateway | 2% of $20K avg | $4,000/mo |
| Agent Wallet | $50/mo per startup | $5,000/mo |
| PayOS Services | Usage-based | $5,000/mo |
| **Total** | | **$59,000/mo** |

---

## Implementation Summary

### Total Points by Epic

| Epic | Points | Priority | Phase |
|------|--------|----------|-------|
| Epic 17: x402 Gateway | 26 | P1 | A (Weeks 1-4) |
| Epic 18: Agent Wallets | 23 | P1 | B (Weeks 5-8) |
| Epic 19: PayOS Services | 22 | P2 | C (Weeks 9-12) |
| Epic 20: Streaming & Registry | 18 | P2 | D (Weeks 13-16) |
| **Total** | **89** | | **16 weeks** |

### Recommended Implementation Order

**Sprint 1-2 (Weeks 1-4): x402 Foundation**
- 17.1 Endpoints API (P0)
- 17.2 Verification API (P0)
- 17.3 Transaction History (P1)

**Sprint 3-4 (Weeks 5-8): Agent Wallets**
- 18.1 Agent Account Extension (P0)
- 18.2 Wallet CRUD (P0)
- 18.3 Payment Execution (P0)

**Sprint 5-6 (Weeks 9-12): Polish & Services**
- 17.4 Settlement Service (P1)
- 17.5 JavaScript SDK (P1)
- 17.6 + 18.5 Dashboard Screens (P1)
- 19.1 Compliance API (P1)

**Sprint 7-8 (Weeks 13-16): Advanced Features**
- 19.2-19.4 Additional Services (P2)
- 20.1-20.2 Streaming Payments (P1)
- 20.3-20.5 Registry & Python SDK (P2)

---

## Changelog

### Version 1.7 (December 17, 2025)

**NEW x402 INFRASTRUCTURE EPICS ADDED:**

- **Epic 17: x402 Gateway Infrastructure** 🔌 - P1
  - x402 endpoint registration and management
  - Payment verification and recording
  - Transaction history and settlement
  - JavaScript SDK
  - Dashboard screens
  - 26 points total

- **Epic 18: Agent Wallets & Spending Policies** 🤖 - P1
  - Agent account type extension
  - Wallet management with spending limits
  - Policy-based payment execution
  - Approval workflows
  - Dashboard and SDK
  - 23 points total

- **Epic 19: PayOS x402 Services** 🍾 - P2
  - Compliance Check API
  - FX Intelligence API
  - Payment Routing API
  - Treasury Analysis API
  - 22 points total

- **Epic 20: Streaming Payments & Agent Registry** 🌊 - P2
  - Streaming payments infrastructure
  - Agent discovery registry
  - Python SDK
  - 18 points total

**Data Model Extensions:**
- New `agent` account type with x402 config
- New tables: x402_endpoints, agent_wallets, x402_transactions, payment_streams_x402
- RLS policies for all new tables
- TypeScript types for all x402 entities

**Strategic Rationale:**
- Positions PayOS for agentic economy
- Creates new revenue streams (gateway fees, wallet fees, services)
- Differentiates from traditional PSPs
- "Drink our own champagne" with PayOS x402 services

---

*End of x402 PRD Extension*
