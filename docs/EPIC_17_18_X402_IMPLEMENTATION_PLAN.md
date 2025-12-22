# Epic 17 & 18: x402 Infrastructure Implementation Plan

**Status:** 📋 Planning  
**Created:** December 19, 2025  
**Updated:** December 21, 2025  
**Priority:** P1  
**Total Points:** 49 (Epic 17: 26 pts + Epic 18: 23 pts)

---

## Executive Summary

This document outlines the implementation plan for **x402 (HTTP 402) payment infrastructure** - the key differentiator that positions PayOS as an agentic payment platform. We will build:

1. **Epic 17: x402 Gateway** - Infrastructure for API providers to RECEIVE machine payments
2. **Epic 18: Wallets & Spending Policies** - Infrastructure for accounts (including agents) to MAKE autonomous payments

**Reference:** [Coinbase x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)

---

## Compatibility with x402 Standard

We are building **compatible with the Coinbase x402 specification** from [x402.org](https://www.x402.org/x402-whitepaper.pdf). Key alignment:

### x402 Protocol Compliance ✅

| Spec Requirement | Our Implementation |
|-----------------|-------------------|
| HTTP 402 response with payment details | ✅ Full compliance |
| Stablecoins only (USDC, EURC) | ✅ Enforced in API |
| Payment request fields (maxAmountRequired, payTo, asset, network, etc.) | ✅ Full compliance |
| EIP-712 signed payment authorization | ✅ Phase 2 (mocked in Phase 1) |
| Idempotency via nonce/paymentId | ✅ request_id field |
| Chain-agnostic (Base, Ethereum, Solana) | ✅ network field supported |

### 402 Response Format (Per x402 Spec)

```json
{
  "maxAmountRequired": "0.25",
  "resource": "/api/compliance/check",
  "description": "LATAM compliance verification",
  "payTo": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
  "asset": "0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606EB48",
  "assetType": "ERC20",
  "network": "base-mainnet",
  "expiresAt": "2025-12-21T12:00:00Z",
  "nonce": "unique-nonce-123",
  "paymentId": "pay_abc123"
}
```

---

## Strategic Context

### What is x402?

**x402 = HTTP 402 "Payment Required" + Stablecoin Micropayments**

> "x402 is an open payment standard that enables AI agents and web services to autonomously pay for API access, data, and digital services."
> — [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)

Traditional APIs use subscriptions or free tiers. x402 enables **pay-per-call** pricing for machine-to-machine payments:

```
1. Agent: GET /api/expensive-endpoint
2. Server: 402 Payment Required
            X-Payment-Address: 0x1234...
            X-Payment-Amount: 0.01 USDC
3. Agent: [Pays via stablecoin wallet]
4. Agent: GET /api/expensive-endpoint
            X-Payment-Proof: tx_hash
5. Server: 200 OK [Returns data]
```

### Key x402 Benefits (from Whitepaper)

| Benefit | Traditional Payment | x402 |
|---------|-------------------|------|
| **Settlement** | Days (batch) | ~200ms (instant) |
| **Fees** | $0.30 + 2.9% | ~$0.0001 (nominal gas) |
| **Chargebacks** | Yes (up to 120 days) | No (irreversible) |
| **Account Required** | Yes (signup, verification) | No (just a wallet) |
| **Agent-Native** | No (human-designed) | Yes (machine-first) |

### Why This Matters

- **For API Providers:** Monetize expensive AI/data endpoints without subscriptions
- **For AI Agents:** Pay only for what they use, no upfront commitments
- **For PayOS:** New revenue streams (gateway fees, wallet fees) + platform differentiation
- **Stablecoins Only:** USDC/EURC ensure price stability (per x402 spec)

---

## Key Architectural Decisions

### 🔑 Decision 1: Blockchain Integration Level

**RECOMMENDED: Hybrid Approach (Option B)**

| Aspect | Full On-Chain (A) | Hybrid (B) ✅ | Database Only (C) |
|--------|-------------------|--------------|-------------------|
| **Agent Wallets** | Real crypto wallets | Internal ledger | Internal ledger |
| **x402 Payments** | Real stablecoin txs | Internal transfers | Internal transfers |
| **Verification** | Blockchain RPC | Mocked blockchain | N/A |
| **Demo Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Complexity** | High | Medium | Low |
| **Timeline** | 6-8 weeks | 3-4 weeks | 2-3 weeks |
| **External Deps** | Base/Ethereum RPC | None | None |

**Why Hybrid?**
- ✅ Faster to build (3-4 weeks vs 6-8 weeks)
- ✅ No external dependencies (Circle, Alchemy, gas fees)
- ✅ Still demonstrates the full x402 flow
- ✅ Can upgrade to real blockchain later without UI changes
- ✅ Good enough for investor demos and partner pilots

**Upgrade Path:**
```
Phase 1 (Now): Internal ledger + mock verification
Phase 2 (Q1): Add real Circle USDC integration
Phase 3 (Q2): Add on-chain verification via Alchemy/Infura
Phase 4 (Q3): Full blockchain with Superfluid streaming
```

---

### 🔑 Decision 2: Story Priorities

**Phase A: Core x402 Infrastructure (Weeks 1-3)**

**Must-Have P0 Stories:**
- ✅ Story 17.1: x402 Endpoints API (5 pts)
- ✅ Story 17.2: x402 Payment Verification API (5 pts)
- ✅ Story 18.1: Agent Account Type Extension (3 pts)
- ✅ Story 18.2: Agent Wallet CRUD API (5 pts)
- ✅ Story 18.3: Agent Payment Execution API (5 pts)

**Total P0:** 23 points (~3 weeks)

**Phase B: Polish & UX (Week 4)**

**Should-Have P1 Stories:**
- 🟡 Story 17.6: x402 Dashboard Screens (5 pts)
- 🟡 Story 18.5: Agent Wallet Dashboard (4 pts)
- 🟡 Story 18.4: Payment Approval Workflow (3 pts)

**Total P1:** 12 points (~1 week)

**Phase C: Developer Experience (Future)**

**Nice-to-Have P1 Stories:**
- 🟢 Story 17.3: x402 Transaction History API (3 pts)
- 🟢 Story 17.4: x402 Settlement Service (5 pts)
- 🟢 Story 17.5: JavaScript SDK (3 pts)
- 🟢 Story 18.6: Agent Payment SDK (3 pts)

**Total Future:** 14 points (~1.5 weeks)

---

## User Flows

### Flow 1: Register x402 Endpoint (Provider Side)

**Actor:** API Provider (PayOS Tenant)  
**Goal:** Monetize an API endpoint via x402

```
┌─────────────────────────────────────────────────────┐
│ 1. Navigate to x402 Dashboard                       │
│    → New "x402 Endpoints" tab in sidebar            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Click "Register Endpoint"                        │
│    Modal opens with form:                           │
│    - Name: "LATAM Compliance Check"                 │
│    - Path: "/api/compliance/check"                  │
│    - Method: POST                                   │
│    - Base Price: 0.25                               │
│    - Currency: USDC                                 │
│    - Volume Discounts (optional):                   │
│      * 1000+ calls: 0.20 USDC                       │
│      * 5000+ calls: 0.15 USDC                       │
│    - Webhook URL (optional)                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Submit → API: POST /v1/x402/endpoints           │
│    {                                                 │
│      name: "LATAM Compliance Check",                │
│      path: "/api/compliance/check",                 │
│      method: "POST",                                │
│      basePrice: 0.25,                               │
│      currency: "USDC",                              │
│      volumeDiscounts: [...]                         │
│    }                                                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Endpoint Created                                 │
│    Response:                                         │
│    {                                                 │
│      id: "uuid",                                    │
│      paymentAddress: "0x1234..." (internal)         │
│      status: "active"                               │
│    }                                                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 5. View in Dashboard                                │
│    - Endpoint list with status                      │
│    - Total calls / revenue per endpoint             │
│    - Recent transactions                            │
│    - Integration instructions                       │
└─────────────────────────────────────────────────────┘
```

---

### Flow 2: Agent Makes x402 Payment (Consumer Side)

**Actor:** AI Agent (autonomous)  
**Goal:** Call a paid API and auto-pay

```
┌─────────────────────────────────────────────────────┐
│ 1. Agent Setup (One-time)                           │
│    Business creates agent account:                  │
│    → POST /v1/accounts                              │
│      { type: "agent", name: "Compliance Bot" }      │
│                                                      │
│    Create wallet for agent:                         │
│    → POST /v1/agent-wallets                         │
│      {                                               │
│        agentAccountId: "uuid",                      │
│        dailySpendLimit: 100,                        │
│        monthlySpendLimit: 2000,                     │
│        approvedVendors: ["api.acme.com"],           │
│        requiresApprovalAbove: 50                    │
│      }                                               │
│                                                      │
│    Fund wallet:                                     │
│    → POST /v1/transfers                             │
│      {                                               │
│        from: "parent_account_id",                   │
│        to: "agent_wallet_id",                       │
│        amount: 500                                  │
│      }                                               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Agent Calls Paid API                             │
│    → GET https://api.acme.com/compliance/check      │
│                                                      │
│    Response:                                         │
│    ← 402 Payment Required                           │
│      X-Payment-Address: "internal://acme/ep123"     │
│      X-Payment-Amount: 0.25                         │
│      X-Payment-Currency: USDC                       │
│      X-Payment-Request-Id: "req_abc123"             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Agent Initiates Payment (Autonomous)             │
│    → POST /v1/x402/pay                              │
│      {                                               │
│        walletId: "agent_wallet_uuid",               │
│        endpointId: "ep123",                         │
│        amount: 0.25,                                │
│        requestId: "req_abc123",                     │
│        category: "compliance"                       │
│      }                                               │
│                                                      │
│    PayOS checks policy:                             │
│    ✓ Vendor approved? (api.acme.com) → YES          │
│    ✓ Daily limit remaining? (99.75 left) → YES     │
│    ✓ Monthly limit remaining? (1999.75 left) → YES │
│    ✓ Requires approval? (0.25 < 50) → NO           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Payment Executed (Internal Transfer)             │
│    - Debit agent wallet: -0.25 USDC                 │
│    - Credit endpoint owner: +0.25 USDC              │
│    - Record x402_transaction                        │
│    - Update wallet daily_spent                      │
│                                                      │
│    Response:                                         │
│    {                                                 │
│      transactionId: "tx_xyz789",                    │
│      paymentProof: "proof_xyz" (mock tx_hash),      │
│      status: "confirmed"                            │
│    }                                                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 5. Agent Retries API Call with Proof               │
│    → GET https://api.acme.com/compliance/check      │
│      X-Payment-Proof: "proof_xyz"                   │
│                                                      │
│    Provider verifies:                               │
│    → POST /v1/x402/verify                           │
│      {                                               │
│        paymentProof: "proof_xyz",                   │
│        expectedAmount: 0.25,                        │
│        endpointId: "ep123",                         │
│        requestId: "req_abc123"                      │
│      }                                               │
│                                                      │
│    PayOS Response:                                  │
│    { verified: true, status: "confirmed" }          │
│                                                      │
│    Provider Response:                               │
│    ← 200 OK                                         │
│      { result: "verified", risk_score: 0.12 }       │
└─────────────────────────────────────────────────────┘
```

---

### Flow 3: Monitor Agent Spending (Parent Account)

**Actor:** Business User (Agent Owner)  
**Goal:** Monitor and control agent spending

```
┌─────────────────────────────────────────────────────┐
│ 1. Navigate to "Agent Wallets" Dashboard            │
│    → New sidebar item                               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. View Wallet Overview                             │
│    ┌─────────────────────────────────────────┐     │
│    │ Compliance Bot                          │     │
│    │ Balance: $475.25 USDC                   │     │
│    │                                          │     │
│    │ Daily Limit: $24.75 / $100 used         │     │
│    │ [████░░░░░░] 24.75%                     │     │
│    │                                          │     │
│    │ Monthly Limit: $24.75 / $2,000 used     │     │
│    │ [█░░░░░░░░░] 1.24%                      │     │
│    │                                          │     │
│    │ Status: Active                          │     │
│    │ [Pause] [Adjust Limits] [View Txs]      │     │
│    └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. View Transaction History                         │
│    Recent Payments:                                 │
│    ┌──────────────────────────────────────────┐    │
│    │ 10:23 AM - Compliance Check              │    │
│    │ api.acme.com/compliance/check            │    │
│    │ -$0.25 USDC                              │    │
│    │ Status: Confirmed                        │    │
│    ├──────────────────────────────────────────┤    │
│    │ 10:15 AM - FX Rate Query                 │    │
│    │ api.acme.com/fx/rate                     │    │
│    │ -$0.05 USDC                              │    │
│    │ Status: Confirmed                        │    │
│    └──────────────────────────────────────────┘    │
│                                                      │
│    Top Vendors:                                     │
│    - api.acme.com: $18.50 (74 calls)                │
│    - api.beta.com: $6.25 (25 calls)                 │
│                                                      │
│    Top Categories:                                  │
│    - compliance: $12.50 (50 calls)                  │
│    - fx_intelligence: $5.00 (100 calls)             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Adjust Spending Policies                         │
│    [Edit Policy] →                                  │
│    - Increase daily limit to $200                   │
│    - Add new approved vendor: api.gamma.com         │
│    - Lower approval threshold to $25                │
│    - Enable auto-refill at $100 → +$500            │
│                                                      │
│    → PATCH /v1/agent-wallets/:id                    │
└─────────────────────────────────────────────────────┘
```

---

## Data Models

### Design Principles

Based on feedback and x402 spec alignment:

1. **Generic Wallets** - Any account can have a wallet (not just agents)
2. **Reuse Existing Tables** - x402 payments are a `transfer_type`, not a separate table
3. **Stablecoins Only** - Enforce USDC/EURC per x402 spec
4. **x402 Protocol Compliance** - All fields per the Coinbase spec

### New Tables

#### 1. `x402_endpoints` (Epic 17)

Registers API endpoints that accept x402 payments.

```sql
CREATE TABLE x402_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id), -- Revenue recipient
  
  -- Endpoint Definition
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'ANY')),
  description TEXT,
  
  -- Pricing (x402 spec: stablecoins only)
  base_price DECIMAL(10,4) NOT NULL, -- Up to 4 decimals for micropayments
  currency TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC', 'EURC')), -- Stablecoins only per x402 spec
  volume_discounts JSONB, -- [{ threshold: 1000, priceMultiplier: 0.8 }]
  
  -- x402 Protocol Fields
  payment_address TEXT, -- Wallet address for this endpoint (or account's default)
  asset_address TEXT, -- ERC20 contract address (e.g., USDC on Base)
  network TEXT NOT NULL DEFAULT 'base-mainnet', -- base-mainnet, ethereum-mainnet, etc.
  
  -- Stats (denormalized for performance)
  total_calls INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,4) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  webhook_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, path, method)
);

CREATE INDEX idx_x402_endpoints_tenant ON x402_endpoints(tenant_id);
CREATE INDEX idx_x402_endpoints_account ON x402_endpoints(account_id);
CREATE INDEX idx_x402_endpoints_status ON x402_endpoints(status);

-- RLS
ALTER TABLE x402_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own endpoints" ON x402_endpoints
  FOR ALL
  USING (tenant_id = (SELECT public.get_user_tenant_id()));
```

#### 2. `wallets` (Epic 18) - Generic Wallet for Any Account

**Key Change:** Wallets are NOT agent-specific. Any account can have wallets. Agent usage is configured via `spending_policy`.

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Owner (any account type: person, business, or agent)
  owner_account_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Optional: If this wallet is managed by an agent
  managed_by_agent_id UUID REFERENCES agents(id),
  
  -- Balance (stablecoins only per x402 spec)
  balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC', 'EURC')),
  
  -- Wallet Identity (for x402 payments)
  wallet_address TEXT, -- On-chain address (Phase 2) or internal ID
  network TEXT DEFAULT 'base-mainnet',
  
  -- Spending Policy (optional - if set, enforced on payments)
  spending_policy JSONB DEFAULT NULL,
  -- spending_policy structure:
  -- {
  --   "daily_limit": 100.00,
  --   "daily_spent": 24.75,
  --   "daily_reset_at": "2025-12-22T00:00:00Z",
  --   "monthly_limit": 2000.00,
  --   "monthly_spent": 245.50,
  --   "monthly_reset_at": "2026-01-01T00:00:00Z",
  --   "approved_vendors": ["api.acme.com", "api.beta.com"],
  --   "approved_categories": ["compliance", "fx_intelligence"],
  --   "requires_approval_above": 50.00,
  --   "auto_fund": {
  --     "enabled": true,
  --     "threshold": 100.00,
  --     "amount": 500.00,
  --     "source_account_id": "uuid"
  --   }
  -- }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'depleted')),
  
  -- Metadata
  name TEXT, -- Optional friendly name (e.g., "Compliance Bot Wallet")
  purpose TEXT, -- Optional description of wallet use
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX idx_wallets_owner ON wallets(owner_account_id);
CREATE INDEX idx_wallets_agent ON wallets(managed_by_agent_id) WHERE managed_by_agent_id IS NOT NULL;
CREATE INDEX idx_wallets_status ON wallets(status);

-- RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own wallets" ON wallets
  FOR ALL
  USING (tenant_id = (SELECT public.get_user_tenant_id()));
```

### Extending Existing Tables (NO new x402_transactions table!)

**Key Change:** x402 payments use the existing `transfers` table with a new type.

#### Extend `transfers` Table

```sql
-- Add x402 as a transfer type
ALTER TYPE transfer_type ADD VALUE IF NOT EXISTS 'x402';

-- Add x402-specific metadata column
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS x402_metadata JSONB DEFAULT NULL;

-- x402_metadata structure (per x402 spec):
-- {
--   "endpoint_id": "uuid",
--   "endpoint_path": "/api/compliance/check",
--   "payment_proof": "proof_xyz789",
--   "request_id": "req_abc123",          -- Idempotency key (nonce)
--   "payment_id": "pay_xyz789",          -- x402 paymentId
--   "vendor_domain": "api.acme.com",
--   "category": "compliance",
--   "asset_address": "0xA0b86991...",    -- USDC contract
--   "network": "base-mainnet",
--   "verified_at": "2025-12-21T10:23:00Z",
--   "expires_at": "2025-12-21T10:25:00Z" -- From x402 payment request
-- }

COMMENT ON COLUMN transfers.x402_metadata IS 'x402 protocol metadata for pay-per-call API payments (per x402.org spec)';

-- Add index for x402 queries
CREATE INDEX idx_transfers_x402_endpoint ON transfers((x402_metadata->>'endpoint_id')) 
  WHERE type = 'x402';
CREATE INDEX idx_transfers_x402_request_id ON transfers((x402_metadata->>'request_id')) 
  WHERE type = 'x402';

-- Unique constraint on request_id to prevent double-payment
CREATE UNIQUE INDEX idx_transfers_x402_request_id_unique 
  ON transfers(tenant_id, (x402_metadata->>'request_id')) 
  WHERE type = 'x402' AND x402_metadata->>'request_id' IS NOT NULL;
```

#### Extend `accounts` Table for Agent Config

```sql
-- Add 'agent' to account types (if not exists)
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'agent';

-- Add agent_config column
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT NULL;

COMMENT ON COLUMN accounts.agent_config IS 'Configuration for agent-type accounts including x402 settings';

-- agent_config structure:
-- {
--   "parent_account_id": "uuid",        -- Account that owns this agent
--   "purpose": "Automate compliance checks",
--   "x402_enabled": true,
--   "default_wallet_id": "uuid"         -- Which wallet this agent uses by default
-- }
```

---

## API Endpoints

### Epic 17: x402 Gateway API

#### 1. Register Endpoint
```typescript
POST /v1/x402/endpoints
Authorization: Bearer <token>

Request:
{
  name: "LATAM Compliance Check",
  path: "/api/compliance/check",
  method: "POST",
  description?: "Verify LATAM documents",
  basePrice: 0.25,
  currency?: "USDC",
  volumeDiscounts?: [
    { threshold: 1000, priceMultiplier: 0.8 },
    { threshold: 5000, priceMultiplier: 0.6 }
  ],
  webhookUrl?: "https://..."
}

Response: 201 Created
{
  data: {
    id: "ep_abc123",
    tenantId: "uuid",
    accountId: "uuid",
    name: "LATAM Compliance Check",
    path: "/api/compliance/check",
    method: "POST",
    basePrice: 0.25,
    currency: "USDC",
    status: "active",
    totalCalls: 0,
    totalRevenue: 0,
    createdAt: "2025-12-19T...",
    updatedAt: "2025-12-19T..."
  }
}
```

#### 2. Verify Payment
```typescript
POST /v1/x402/verify
Authorization: Bearer <token>

Request:
{
  paymentProof: "proof_xyz789",
  expectedAmount: 0.25,
  endpointId: "ep_abc123",
  requestId?: "req_unique_id"
}

Response: 200 OK
{
  verified: true,
  status: "confirmed",
  transactionId: "tx_xyz789",
  payer: "agent_account_id",
  amount: 0.25,
  timestamp: "2025-12-19T..."
}

// If verification fails:
Response: 400 Bad Request
{
  verified: false,
  status: "insufficient" | "invalid" | "expired",
  error: "Payment amount insufficient"
}
```

#### 3. List Endpoints
```typescript
GET /v1/x402/endpoints
GET /v1/x402/endpoints?status=active
GET /v1/x402/endpoints?account_id=<uuid>

Response: 200 OK
{
  data: [...endpoints],
  pagination: { page: 1, limit: 50, total: 5 }
}
```

#### 4. Get Endpoint Details
```typescript
GET /v1/x402/endpoints/:id

Response: 200 OK
{
  data: {
    ...endpoint,
    recentTransactions: [...], // Last 10
    topPayers: [
      { accountId: "...", accountName: "Agent Bot", totalSpent: 125.50, callCount: 502 }
    ]
  }
}
```

#### 5. Update Endpoint
```typescript
PATCH /v1/x402/endpoints/:id

Request:
{
  status?: "active" | "paused" | "disabled",
  basePrice?: 0.30,
  volumeDiscounts?: [...]
}

Response: 200 OK
{ data: {...updated endpoint} }
```

#### 6. Delete Endpoint
```typescript
DELETE /v1/x402/endpoints/:id

Response: 204 No Content
```

---

### Epic 18: Wallets API (Generic - Any Account)

**Note:** Wallets are NOT agent-specific. Any account can have wallets. The `spending_policy` field configures limits when the wallet is used for x402 payments (often by agents).

#### 1. Create Wallet
```typescript
POST /v1/wallets
Authorization: Bearer <token>

Request:
{
  ownerAccountId: "uuid",           // Required: Account that owns this wallet
  managedByAgentId?: "uuid",        // Optional: If wallet is controlled by an agent
  name?: "Compliance Bot Wallet",   // Optional: Friendly name
  purpose?: "x402 payments for compliance checks", // Optional
  currency: "USDC",                 // Required: USDC or EURC only (per x402 spec)
  network?: "base-mainnet",         // Optional: base-mainnet, ethereum-mainnet, etc.
  spendingPolicy?: {                // Optional: If set, enforced on x402 payments
    dailyLimit: 100.00,
    monthlyLimit: 2000.00,
    approvedVendors: ["api.acme.com", "api.beta.com"],
    approvedCategories: ["compliance", "fx_intelligence"],
    requiresApprovalAbove: 50.00,
    autoFund: {
      enabled: true,
      threshold: 100.00,
      amount: 500.00,
      sourceAccountId: "uuid"
    }
  }
}

Response: 201 Created
{
  data: {
    id: "wallet_xyz",
    tenantId: "uuid",
    ownerAccountId: "uuid",
    managedByAgentId: null,
    name: "Compliance Bot Wallet",
    balance: 0,
    currency: "USDC",
    network: "base-mainnet",
    walletAddress: "internal://payos/wallet_xyz", // Phase 1: internal, Phase 2: real address
    spendingPolicy: {
      dailyLimit: 100.00,
      dailySpent: 0,
      dailyRemaining: 100.00,
      monthlyLimit: 2000.00,
      monthlySpent: 0,
      monthlyRemaining: 2000.00,
      approvedVendors: ["api.acme.com"],
      approvedCategories: ["compliance"],
      requiresApprovalAbove: 50.00
    },
    status: "active",
    createdAt: "...",
    updatedAt: "..."
  }
}

// If non-stablecoin currency requested:
Response: 400 Bad Request
{
  error: "Invalid currency",
  message: "Only stablecoins (USDC, EURC) are supported per x402 protocol"
}
```

#### 2. x402 Pay (Payment Execution)
```typescript
POST /v1/x402/pay
Authorization: Bearer <token>

Request:
{
  walletId: "wallet_xyz",
  endpointId: "ep_abc123",
  amount: "0.25",                    // String for precision (per x402 spec)
  requestId: "req_unique_id",        // Required: Idempotency key (nonce)
  category?: "compliance",
  memo?: "Document verification for remittance #123"
}

Response: 200 OK
{
  data: {
    transferId: "uuid",              // ID in transfers table (type='x402')
    paymentProof: "proof_xyz789",    // Use this in X-Payment-Proof header
    paymentId: "pay_abc123",         // x402 paymentId for verification
    status: "confirmed",
    amount: "0.25",
    currency: "USDC",
    walletBalance: "499.75",
    spendingPolicy: {
      dailyRemaining: "99.75",
      monthlyRemaining: "1999.75"
    }
  }
}

// If spending policy violation:
Response: 403 Forbidden
{
  error: "Policy violation",
  code: "DAILY_LIMIT_EXCEEDED",
  reason: "Daily spend limit exceeded",
  spendingPolicy: {
    dailyLimit: "100.00",
    dailyRemaining: "0.00"
  }
}

// If vendor not approved:
Response: 403 Forbidden
{
  error: "Policy violation",
  code: "VENDOR_NOT_APPROVED",
  reason: "Vendor 'api.unknown.com' not in approved vendors list",
  approvedVendors: ["api.acme.com", "api.beta.com"]
}

// If requires approval:
Response: 202 Accepted
{
  transferId: "uuid",
  status: "pending_approval",
  message: "Payment requires approval (amount > $50)",
  approvalUrl: "https://dashboard.payos.com/approvals/<id>"
}
```

#### 3. List Wallets
```typescript
GET /v1/wallets
GET /v1/wallets?status=active
GET /v1/wallets?owner_account_id=<uuid>
GET /v1/wallets?managed_by_agent_id=<uuid>

Response: 200 OK
{
  data: [...wallets],
  pagination: { page: 1, limit: 50, total: 12 }
}
```

#### 4. Get Wallet Details
```typescript
GET /v1/wallets/:id

Response: 200 OK
{
  data: {
    ...wallet,
    recentTransactions: [...], // Last 20 x402 transfers
    topVendors: [
      { vendor: "api.acme.com", spent: "125.50", calls: 502 }
    ],
    topCategories: [
      { category: "compliance", spent: "85.25", calls: 341 }
    ],
    spendingTrend: {
      thisWeek: "45.20",
      lastWeek: "38.50",
      changePercent: 17.4
    }
  }
}
```

#### 5. Update Wallet
```typescript
PATCH /v1/wallets/:id

Request:
{
  name?: "Updated Wallet Name",
  status?: "active" | "frozen",
  spendingPolicy?: {
    dailyLimit?: 200.00,
    approvedVendors?: ["api.acme.com", "api.beta.com", "api.gamma.com"],
    requiresApprovalAbove?: 25.00
  }
}

Response: 200 OK
{ data: {...updated wallet} }
```

#### 6. Fund Wallet
```typescript
POST /v1/wallets/:id/fund

Request:
{
  sourceAccountId: "parent_account_uuid",
  amount: "500.00"
}

Response: 200 OK
{
  data: {
    transferId: "uuid",          // Internal transfer record
    walletBalance: "500.00"
  }
}
```

#### 7. Get Wallet Transactions (x402 payments only)
```typescript
GET /v1/wallets/:id/transactions
GET /v1/wallets/:id/transactions?category=compliance
GET /v1/wallets/:id/transactions?start_date=2025-12-01&end_date=2025-12-19

Response: 200 OK
{
  data: [...transfers where type='x402'],  // From transfers table!
  pagination: { ... }
}
```

---

## UI Components

### New Dashboard Sections

#### 1. x402 Endpoints Page (`/x402/endpoints`)

**Epic 17, Story 17.6**

```tsx
// payos-ui/src/pages/X402EndpointsPage.tsx

Layout:
┌──────────────────────────────────────────────────────┐
│ x402 Endpoints                      [+ New Endpoint] │
├──────────────────────────────────────────────────────┤
│ Overview                                              │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ 12         │ │ $1,234.50  │ │ 4,823      │        │
│ │ Endpoints  │ │ Revenue    │ │ Total Calls│        │
│ └────────────┘ └────────────┘ └────────────┘        │
├──────────────────────────────────────────────────────┤
│ Endpoints                                             │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ✓ LATAM Compliance Check               $125.50 │ │
│ │   /api/compliance/check • POST                  │ │
│ │   502 calls • $0.25/call                        │ │
│ │   [Pause] [Edit] [View Stats]                   │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ ✓ FX Rate Intelligence                  $241.00 │ │
│ │   /api/fx/rate • GET                            │ │
│ │   4,820 calls • $0.05/call                      │ │
│ │   [Pause] [Edit] [View Stats]                   │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Features:**
- List all x402 endpoints with status
- Revenue and call count per endpoint
- Quick actions: pause, edit, view stats
- Modal to register new endpoint
- Integration instructions with code snippets

---

#### 2. Wallets Page (`/wallets`)

**Epic 18, Story 18.5**

```tsx
// payos-ui/src/pages/WalletsPage.tsx

Layout:
┌──────────────────────────────────────────────────────┐
│ Wallets                          [+ Create Wallet]   │
├──────────────────────────────────────────────────────┤
│ Overview                                              │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ 5          │ │ $2,450.25  │ │ $1,234.75  │        │
│ │ Wallets    │ │ Balance    │ │ x402 Today │        │
│ └────────────┘ └────────────┘ └────────────┘        │
├──────────────────────────────────────────────────────┤
│ Filter: [All] [Agent-Managed] [Personal]              │
├──────────────────────────────────────────────────────┤
│ Wallets                                               │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 🤖 Compliance Bot Wallet          $475.25 USDC  │ │
│ │    Owner: Acme Corp                              │ │
│ │    Managed by: Compliance Agent                  │ │
│ │    Daily: $24.75 / $100 (24.75%)                │ │
│ │    [████░░░░░░]                                 │ │
│ │    Monthly: $24.75 / $2,000 (1.24%)             │ │
│ │    [█░░░░░░░░░]                                 │ │
│ │    Status: Active • USDC • base-mainnet         │ │
│ │    [View] [Fund] [Adjust Limits]                │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ 💼 Treasury Operations             $5,000.00    │ │
│ │    Owner: Acme Corp                              │ │
│ │    No spending policy (unrestricted)             │ │
│ │    Status: Active • USDC • base-mainnet         │ │
│ │    [View] [Fund]                                │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Features:**
- List all wallets (not just agent wallets)
- Filter by: agent-managed, personal, all
- Visual spend limit indicators (if spending policy set)
- Show owner account and managing agent
- Quick actions: view, fund, adjust limits
- Modal to create new wallet
- Stablecoin badge (USDC/EURC)

---

#### 3. Wallet Detail Page (`/wallets/:id`)

**Epic 18, Story 18.5**

```tsx
// payos-ui/src/pages/AgentWalletDetailPage.tsx

Layout:
┌──────────────────────────────────────────────────────┐
│ ← Back  Compliance Bot                               │
│         Agent Wallet                                  │
├──────────────────────────────────────────────────────┤
│ Balance & Limits                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Current Balance: $475.25 USDC                    │ │
│ │ [Fund Wallet]                                     │ │
│ │                                                    │ │
│ │ Daily Spending                                    │ │
│ │ $24.75 of $100.00 (24.75%)                       │ │
│ │ [████████░░░░░░░░░░░░] Resets in 14h 32m        │ │
│ │                                                    │ │
│ │ Monthly Spending                                  │ │
│ │ $24.75 of $2,000.00 (1.24%)                      │ │
│ │ [█░░░░░░░░░░░░░░░░░░░] Resets in 11 days        │ │
│ │                                                    │ │
│ │ Spending Policy                                   │ │
│ │ • Requires approval above: $50                   │ │
│ │ • Approved vendors: api.acme.com, api.beta.com   │ │
│ │ • Approved categories: compliance, fx            │ │
│ │ [Edit Policy]                                     │ │
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ Recent Transactions                                   │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 10:23 AM  Compliance Check          -$0.25      │ │
│ │           api.acme.com/compliance/check          │ │
│ │           Status: ✓ Confirmed                    │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ 10:15 AM  FX Rate Query             -$0.05      │ │
│ │           api.acme.com/fx/rate                   │ │
│ │           Status: ✓ Confirmed                    │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ 09:47 AM  Compliance Check          -$0.25      │ │
│ │           api.acme.com/compliance/check          │ │
│ │           Status: ✓ Confirmed                    │ │
│ └──────────────────────────────────────────────────┘ │
│ [View All Transactions]                               │
├──────────────────────────────────────────────────────┤
│ Spending Analytics                                    │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Top Vendors                                       │ │
│ │ 1. api.acme.com          $18.50 (74 calls)       │ │
│ │ 2. api.beta.com          $6.25 (25 calls)        │ │
│ │                                                    │ │
│ │ Top Categories                                    │ │
│ │ 1. compliance            $12.50 (50 calls)       │ │
│ │ 2. fx_intelligence       $5.00 (100 calls)       │ │
│ │                                                    │ │
│ │ Spending Trend (Last 7 Days)                     │ │
│ │ [Line chart showing daily spend]                 │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase A: Core Infrastructure (Week 1-2)

#### Week 1: Database & Core APIs

**Day 1-2: Database Setup**
- [ ] Create migration: `20251222_create_x402_endpoints.sql`
- [ ] Create migration: `20251222_create_wallets.sql` (generic wallets, NOT agent-specific)
- [ ] Create migration: `20251222_extend_transfers_x402.sql` (add x402_metadata to existing table)
- [ ] Create migration: `20251222_extend_accounts_agent_config.sql`
- [ ] Apply migrations to dev environment
- [ ] Verify RLS policies work correctly
- [ ] Verify stablecoin-only currency constraint

**Day 3-4: x402 Endpoints API (Story 17.1)**
- [ ] Create `apps/api/src/routes/x402-endpoints.ts`
- [ ] Implement POST `/v1/x402/endpoints` (register)
- [ ] Implement GET `/v1/x402/endpoints` (list)
- [ ] Implement GET `/v1/x402/endpoints/:id` (details)
- [ ] Implement PATCH `/v1/x402/endpoints/:id` (update)
- [ ] Implement DELETE `/v1/x402/endpoints/:id` (delete)
- [ ] Add validation with Zod
- [ ] Add to `apps/api/src/app.ts`
- [ ] Test with Postman/curl

**Day 5: x402 Payment Verification API (Story 17.2)**
- [ ] Create `apps/api/src/services/x402-payment-verifier.ts`
- [ ] Implement POST `/v1/x402/verify`
- [ ] Mock blockchain verification (return `{ verified: true }`)
- [ ] Record verification in `x402_transactions`
- [ ] Test idempotency (same request_id)

---

#### Week 2: Wallets & Payment Execution

**Day 1-2: Agent Account Type (Story 18.1)**
- [ ] Verify `agent` account type exists (may already be in DB)
- [ ] Update account creation to support `agent` type
- [ ] Add `agent_config` JSONB field handling
- [ ] Update `POST /v1/accounts` to accept agent type
- [ ] Document agent_config structure

**Day 3-4: Wallets API (Story 18.2)**
- [ ] Create `apps/api/src/routes/wallets.ts` (generic wallets, NOT agent-specific)
- [ ] Implement POST `/v1/wallets` (create - any account can have wallets)
- [ ] Implement GET `/v1/wallets` (list with filters)
- [ ] Implement GET `/v1/wallets/:id` (details with spending stats)
- [ ] Implement PATCH `/v1/wallets/:id` (update spending policy)
- [ ] Implement POST `/v1/wallets/:id/fund` (fund wallet)
- [ ] Add validation:
  - [ ] Currency must be USDC or EURC (per x402 spec)
  - [ ] Spending policy limits must be positive
  - [ ] Approved vendors must be valid domains
- [ ] Test all endpoints

**Day 5: x402 Payment Execution (Story 18.3)**
- [ ] Create `apps/api/src/services/x402-payment-executor.ts`
- [ ] Implement POST `/v1/x402/pay`
- [ ] Policy checks (if spending_policy set):
  - [ ] Verify vendor in `approved_vendors`
  - [ ] Check daily spend limit
  - [ ] Check monthly spend limit
  - [ ] Check `requires_approval_above` threshold
- [ ] Execute internal transfer:
  - [ ] Debit wallet balance
  - [ ] Credit endpoint owner's account
  - [ ] Create transfer record with `type='x402'` (NOT new table!)
  - [ ] Set `x402_metadata` with endpoint_id, payment_proof, etc.
- [ ] Update wallet `spending_policy.daily_spent` / `monthly_spent`
- [ ] Generate mock `payment_proof` (UUID-based in Phase 1)
- [ ] Test happy path and all policy violations

---

### Phase B: UI Dashboard (Week 3)

**Day 1: x402 Endpoints UI (Story 17.6)**
- [ ] Create `payos-ui/src/pages/X402EndpointsPage.tsx`
- [ ] Create `payos-ui/src/hooks/api/useX402Endpoints.ts`
- [ ] Implement endpoint list with status
- [ ] Add "Register Endpoint" modal
- [ ] Show revenue and call count
- [ ] Add quick actions (pause, edit, delete)
- [ ] Integration instructions modal

**Day 2-3: Wallets UI (Story 18.5)**
- [ ] Create `payos-ui/src/pages/WalletsPage.tsx`
- [ ] Create `payos-ui/src/pages/WalletDetailPage.tsx`
- [ ] Create `payos-ui/src/hooks/api/useWallets.ts`
- [ ] Implement wallet list with balances
- [ ] Add filter: All / Agent-Managed / Personal
- [ ] Add spend limit visualizations (progress bars, if policy set)
- [ ] Add "Create Wallet" modal
- [ ] Add "Fund Wallet" modal
- [ ] Add "Edit Spending Policy" modal

**Day 4: Wallet Detail Page**
- [ ] x402 Transaction history (from transfers table, type='x402')
- [ ] Top vendors / categories
- [ ] Spending trend chart (7 days)
- [ ] Real-time balance updates
- [ ] Show owner account and managing agent (if applicable)

**Day 5: Polish & Testing**
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states
- [ ] Test all flows end-to-end
- [ ] Fix bugs

---

### Phase C: Seed Data & Demo (Week 4)

**Day 1-2: Seed Data**
- [ ] Create `apps/api/scripts/seed-x402-endpoints.ts`
- [ ] Create `apps/api/scripts/seed-wallets.ts` (various wallet types)
- [ ] Create `apps/api/scripts/seed-x402-transfers.ts` (adds to existing transfers table)
- [ ] Generate realistic data:
  - [ ] 5-10 x402 endpoints per tenant
  - [ ] 3-5 wallets per tenant (mix of agent-managed and regular)
  - [ ] 100+ x402 transfers (last 30 days) - type='x402' in transfers table
  - [ ] All amounts in USDC/EURC only
- [ ] Add to `pnpm seed:all`

**Day 3: Demo Scenario**
- [ ] Create demo script: `docs/DEMO_X402_SCENARIO.md`
- [ ] Define demo user accounts
- [ ] Script the flow:
  1. Show endpoint revenue dashboard
  2. Create new agent wallet
  3. Fund wallet
  4. Simulate agent payments
  5. Show spending analytics
- [ ] Test demo flow

**Day 4: Documentation**
- [ ] Update PRD with completion status
- [ ] Create `docs/EPIC_17_18_COMPLETE.md`
- [ ] Document API endpoints
- [ ] Create integration guide
- [ ] Create FAQ

**Day 5: Testing & Polish**
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security review
- [ ] Bug fixes
- [ ] Final commit

---

## Success Metrics

### Technical Completion

- [ ] All P0 API endpoints implemented and tested
- [ ] All database tables created with proper RLS
- [ ] All UI dashboards functional
- [ ] Seed data generates realistic scenarios
- [ ] Zero linter errors
- [ ] All tests passing

### Demo Quality

- [ ] Can register x402 endpoint in < 2 minutes
- [ ] Can create agent wallet with policy in < 2 minutes
- [ ] Agent payment executes in < 1 second
- [ ] Dashboard shows real-time data
- [ ] Demo flows smoothly without bugs

### Documentation

- [ ] API reference complete
- [ ] Integration guide written
- [ ] Demo scenario documented
- [ ] Epic completion document created

---

## Future Enhancements (Post-PoC)

### Phase 2: Real Blockchain Integration
- Integrate Circle API for real USDC transfers
- Add Alchemy/Infura for on-chain verification
- Support Base, Ethereum, and Solana networks
- Real wallet addresses for agents

### Phase 3: Advanced Features
- **Story 17.3:** x402 Transaction History API (3 pts)
- **Story 17.4:** x402 Settlement Service (5 pts)
- **Story 17.5:** JavaScript SDK (3 pts)
- **Story 18.4:** Payment Approval Workflow (3 pts)
- **Story 18.6:** Agent Payment SDK (3 pts)

### Phase 4: PayOS Services (Epic 19)
- Build PayOS's own x402 services
- Compliance Check API ($0.25/call)
- FX Intelligence API ($0.05/call)
- Payment Routing API ($0.15/call)
- Treasury Analysis API ($1.00/call)

### Phase 5: Agent Registry (Epic 20)
- Public agent discovery
- Agent reviews and ratings
- Streaming payments integration
- Python SDK

---

## Questions to Resolve Before Starting

### 1. Blockchain Strategy
**Decision needed:** Hybrid approach (Option B) confirmed?
- Internal ledger for wallets ✅
- Mock blockchain verification ✅
- Plan to upgrade later ✅

### 2. Scope
**Decision needed:** Just Epic 17 + 18, or include 19 + 20?
- **Recommended:** Epic 17 + 18 only (3-4 weeks)
- Defer Epic 19 + 20 to later

### 3. Demo Focus
**Decision needed:** What's the primary demo scenario?
- Example: "LATAM fintech monetizing compliance API via agents"
- Who's the audience? (Investors, partners, technical?)

### 4. Timeline
**Decision needed:** Can we commit 3-4 weeks to this?
- Week 1-2: Core APIs and database
- Week 3: UI dashboards
- Week 4: Seed data, testing, demo

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complexity too high | Delays | Start with hybrid approach (no real blockchain) |
| Unclear demo story | Poor reception | Define scenario upfront with stakeholders |
| UI takes longer than expected | Delay | Prioritize functional over beautiful for PoC |
| Policy logic bugs | Security issues | Thorough testing of spending limits |
| Performance issues | Poor UX | Optimize queries, add indexes, use pagination |

---

## Ready to Start?

**Next Steps:**

1. **Review this plan** - Confirm approach, scope, timeline
2. **Answer the 4 questions above** - Blockchain, scope, demo, timeline
3. **Approve to proceed** - I'll create the first migration and start building

**Timeline:** 3-4 weeks to complete Epic 17 + 18 (P0 + P1 stories)

---

**Your call:** Should we proceed with this plan? Any changes needed?

