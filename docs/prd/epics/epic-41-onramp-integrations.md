# Epic 41: On-Ramp Integrations & Funding Sources 💳

**Status:** 📋 Pending  
**Phase:** 3.5 (External Integrations)  
**Priority:** P1  
**Total Points:** 110  
**Stories:** 0/29  
**Dependencies:** Epic 40 (Sandbox Integrations), Epic 27 (Settlement)  
**Enables:** Non-crypto-native customer onboarding, Complete payment flows  

[← Back to Epic List](./README.md)

---

## Executive Summary

PayOS currently assumes partners already have USDC to settle. This limits our addressable market to crypto-native companies. **Epic 41 adds on-ramp capabilities** so partners (and their end users) can fund PayOS wallets from traditional payment methods: cards, bank accounts, and local payment methods.

**The Problem:**
```
Current: Partner has USDC → PayOS → Pix/SPEI ✅
Missing: Partner has USD/BRL/MXN → ??? → USDC → PayOS → Pix/SPEI ❌
```

**The Solution:** Integrate multiple on-ramp providers to support:
- Card payments (Visa, Mastercard, Amex)
- Bank account linking (ACH, SEPA, Pix, SPEI)
- Local payment methods (Boleto, OXXO, PSE)
- Crypto on-ramp widgets (MoonPay, Transak)

**Key Insight:** Different customers need different on-ramps. A US payroll company needs ACH. A Brazilian fintech needs Pix collection. A consumer app needs cards. We should support all of them.

---

## Strategic Context

### Why On-Ramps Are Critical

| Without On-Ramps | With On-Ramps |
|------------------|---------------|
| Only crypto-native customers | Any fintech can use PayOS |
| Partners must integrate Circle separately | One integration for everything |
| Complex treasury management | Simplified funding flow |
| Limited to ~5% of market | Access to 95% of fintechs |

### Customer Scenarios

| Customer Type | Funding Source | On-Ramp Needed |
|---------------|----------------|----------------|
| US Payroll Platform | ACH from company bank | Plaid + Stripe ACH |
| Brazilian Remittance App | Pix from sender | Belvo + Pix collection |
| Mexican B2B Procurement | SPEI from buyer | Belvo + SPEI collection |
| Consumer Shopping Agent | User's credit card | Stripe Cards |
| Crypto-Native Treasury | Already has USDC | None (direct deposit) |
| European SaaS | SEPA from customer | Stripe SEPA |

### On-Ramp Provider Landscape

| Provider | Cards | US Banks | EU Banks | LATAM Banks | Crypto Widget |
|----------|-------|----------|----------|-------------|---------------|
| **Stripe** | ✅ Global | ✅ ACH | ✅ SEPA | ⚠️ Limited | ❌ |
| **Plaid** | ❌ | ✅ Best | ✅ Good | ⚠️ Mexico only | ❌ |
| **Belvo** | ❌ | ❌ | ❌ | ✅ Best (BR/MX/CO) | ❌ |
| **MoonPay** | ✅ | ✅ | ✅ | ✅ | ✅ Card→USDC |
| **Transak** | ✅ | ✅ | ✅ | ✅ | ✅ Card→USDC |
| **Circle** | ❌ | ✅ Wire | ✅ Wire | ❌ | ❌ |

**Recommendation:** 
- **Stripe** for cards and US/EU bank payments
- **Belvo** for LATAM bank account linking
- **MoonPay/Transak** for direct card→USDC (simpler but higher fees)

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Funding source management | ✅ Yes | `payos.funding` | P0 | New module |
| Card payment initiation | ✅ Yes | `payos.funding.cards` | P0 | Stripe integration |
| Bank account linking | ✅ Yes | `payos.funding.banks` | P1 | Plaid/Belvo |
| Pix collection | ✅ Yes | `payos.funding.pix` | P1 | Brazil inbound |
| SPEI collection | ✅ Yes | `payos.funding.spei` | P1 | Mexico inbound |
| Crypto widget embed | ✅ Yes | `payos.funding.crypto` | P2 | MoonPay/Transak |
| Funding webhooks | ✅ Yes | Types | P0 | Status updates |

**SDK Stories Required:**
- [ ] Story 36.21: Funding sources module
- [ ] Story 36.22: Bank linking integration
- [ ] Story 36.23: Crypto widget wrapper

---

## Architecture

### On-Ramp Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FUNDING SOURCES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    CARDS     │  │  US/EU BANKS │  │ LATAM BANKS  │  │CRYPTO WIDGET │    │
│  │   (Stripe)   │  │(Stripe/Plaid)│  │   (Belvo)    │  │  (MoonPay)   │    │
│  │              │  │              │  │              │  │              │    │
│  │ • Visa       │  │ • ACH        │  │ • Pix (BR)   │  │ • Card→USDC  │    │
│  │ • Mastercard │  │ • SEPA       │  │ • SPEI (MX)  │  │ • Bank→USDC  │    │
│  │ • Amex       │  │ • Wire       │  │ • PSE (CO)   │  │ • Apple Pay  │    │
│  │              │  │              │  │ • Transfer   │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│         └─────────────────┴────────┬────────┴─────────────────┘            │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FUNDING ORCHESTRATOR                              │   │
│  │                                                                      │   │
│  │  • Route to appropriate provider based on method + currency          │   │
│  │  • Handle currency conversion if needed                              │   │
│  │  • Manage funding source lifecycle                                   │   │
│  │  • Track funding status and webhooks                                 │   │
│  │  • Apply limits and compliance checks                                │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONVERSION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  For non-USDC funding:                                                      │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│  │ Receive USD │ ───▶ │   Circle    │ ───▶ │ Credit USDC │                 │
│  │ BRL / MXN   │      │  Mint USDC  │      │ to Account  │                 │
│  └─────────────┘      └─────────────┘      └─────────────┘                 │
│                                                                             │
│  For direct USDC (MoonPay/Transak):                                        │
│  ┌─────────────┐      ┌─────────────┐                                      │
│  │ Receive USDC│ ───▶ │ Credit USDC │                                      │
│  │ directly    │      │ to Account  │                                      │
│  └─────────────┘      └─────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   PayOS Account Balance │
                        │   (Ready for Settlement)│
                        └─────────────────────────┘
```

### Funding Source Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CREATE    │────▶│   VERIFY    │────▶│   ACTIVE    │────▶│   REMOVED   │
│             │     │             │     │             │     │             │
│ Link bank   │     │ Micro-dep   │     │ Can fund    │     │ Unlinked    │
│ Add card    │     │ Plaid auth  │     │ account     │     │ Expired     │
│             │     │ 3DS check   │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Stories

### Part 1: Foundation (13 points)

#### Story 41.1: Funding Source Data Model

**Points:** 3  
**Priority:** P0  
**Dependencies:** None

**Description:**
Design and implement the data model for funding sources, supporting multiple provider types and payment methods.

**Acceptance Criteria:**
- [ ] `funding_sources` table created
- [ ] Support for multiple source types (card, bank_us, bank_latam, crypto)
- [ ] Provider tracking (stripe, plaid, belvo, moonpay)
- [ ] Status lifecycle (pending, verifying, active, failed, removed)
- [ ] Metadata storage for provider-specific data
- [ ] RLS policies for tenant isolation
- [ ] Audit logging for compliance

**Database Schema:**
```sql
CREATE TYPE funding_source_type AS ENUM (
  'card',
  'bank_account_us',
  'bank_account_eu', 
  'bank_account_latam',
  'crypto_wallet'
);

CREATE TYPE funding_source_status AS ENUM (
  'pending',
  'verifying',
  'active',
  'failed',
  'suspended',
  'removed'
);

CREATE TABLE funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Type and provider
  type funding_source_type NOT NULL,
  provider TEXT NOT NULL,  -- 'stripe', 'plaid', 'belvo', 'moonpay'
  
  -- Status
  status funding_source_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  
  -- Display info (safe to show)
  display_name TEXT,  -- "Visa •••• 4242" or "Chase •••• 1234"
  last_four TEXT,
  
  -- Provider references
  provider_id TEXT NOT NULL,  -- External ID at provider
  provider_metadata JSONB DEFAULT '{}',
  
  -- Limits
  daily_limit_cents BIGINT,
  monthly_limit_cents BIGINT,
  per_transaction_limit_cents BIGINT,
  
  -- Usage tracking
  daily_used_cents BIGINT DEFAULT 0,
  monthly_used_cents BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, provider, provider_id)
);

CREATE TABLE funding_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  funding_source_id UUID NOT NULL REFERENCES funding_sources(id),
  
  -- Transaction details
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,  -- Source currency (USD, BRL, MXN)
  
  -- Conversion (if applicable)
  converted_amount_cents BIGINT,  -- In USDC cents
  exchange_rate DECIMAL(18, 8),
  
  -- Status
  status TEXT NOT NULL,  -- 'pending', 'processing', 'completed', 'failed'
  failure_reason TEXT,
  
  -- Provider tracking
  provider_transaction_id TEXT,
  provider_metadata JSONB DEFAULT '{}',
  
  -- Fees
  provider_fee_cents BIGINT DEFAULT 0,
  payos_fee_cents BIGINT DEFAULT 0,
  
  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_funding_sources_account ON funding_sources(account_id);
CREATE INDEX idx_funding_sources_status ON funding_sources(status) WHERE status = 'active';
CREATE INDEX idx_funding_transactions_source ON funding_transactions(funding_source_id);
CREATE INDEX idx_funding_transactions_status ON funding_transactions(status);
```

**SDK Exposure:**
- **Needs SDK exposure?** Types Only
- **Module:** Type definitions for funding sources
- **SDK story:** Part of 36.21

**Files to Create:**
- `apps/api/src/db/migrations/xxx_funding_sources.sql`
- `packages/types/src/funding.ts`

---

#### Story 41.2: Funding Orchestrator Service

**Points:** 5  
**Priority:** P0  
**Dependencies:** 41.1

**Description:**
Implement the core orchestrator that routes funding requests to the appropriate provider based on source type, currency, and availability.

**Acceptance Criteria:**
- [ ] Provider registry with capability declarations
- [ ] Routing logic based on source type and currency
- [ ] Fallback provider support
- [ ] Rate limiting per source
- [ ] Idempotency for funding requests
- [ ] Unified error handling across providers
- [ ] Webhook normalization from all providers

**Provider Interface:**
```typescript
interface FundingProvider {
  name: string;
  supportedTypes: FundingSourceType[];
  supportedCurrencies: string[];
  
  // Funding source management
  createSource(params: CreateSourceParams): Promise<FundingSource>;
  verifySource(sourceId: string): Promise<VerificationResult>;
  removeSource(sourceId: string): Promise<void>;
  
  // Transactions
  initiateFunding(params: FundingParams): Promise<FundingTransaction>;
  getFundingStatus(transactionId: string): Promise<FundingStatus>;
  
  // Webhooks
  parseWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Orchestrator routes to appropriate provider
class FundingOrchestrator {
  async fund(accountId: string, params: FundingRequest): Promise<FundingTransaction> {
    const source = await this.getFundingSource(params.sourceId);
    const provider = this.getProvider(source.provider);
    
    // Check limits
    await this.checkLimits(source, params.amount);
    
    // Screen for compliance
    await this.screenTransaction(source, params);
    
    // Initiate funding
    const tx = await provider.initiateFunding({
      sourceId: source.provider_id,
      amount: params.amount,
      currency: params.currency,
      idempotencyKey: params.idempotencyKey,
    });
    
    // Track in our database
    return this.recordTransaction(source, tx);
  }
}
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding`
- **Method(s):** `fund()`, `getFundingStatus()`, `listFundingSources()`
- **MCP tool needed?** Yes - `payos_fund_account`
- **SDK story:** Story 36.21

**Files to Create:**
- `apps/api/src/services/funding/orchestrator.ts`
- `apps/api/src/services/funding/types.ts`
- `apps/api/src/services/funding/providers/interface.ts`

---

#### Story 41.3: Funding API Endpoints

**Points:** 5  
**Priority:** P0  
**Dependencies:** 41.1, 41.2

**Description:**
Implement REST API endpoints for managing funding sources and initiating funding transactions.

**Acceptance Criteria:**
- [ ] CRUD endpoints for funding sources
- [ ] Initiate funding endpoint
- [ ] Get funding status endpoint
- [ ] List funding history endpoint
- [ ] Webhook endpoints for each provider
- [ ] Proper error responses with suggestions
- [ ] Rate limiting applied

**API Endpoints:**
```
# Funding Sources
POST   /v1/funding/sources              → Add funding source
GET    /v1/funding/sources              → List funding sources
GET    /v1/funding/sources/:id          → Get funding source
DELETE /v1/funding/sources/:id          → Remove funding source
POST   /v1/funding/sources/:id/verify   → Trigger verification

# Funding Transactions
POST   /v1/funding/transactions         → Initiate funding
GET    /v1/funding/transactions/:id     → Get transaction status
GET    /v1/funding/transactions         → List transaction history

# Provider Webhooks
POST   /v1/webhooks/stripe/funding      → Stripe funding webhooks
POST   /v1/webhooks/plaid               → Plaid webhooks
POST   /v1/webhooks/belvo               → Belvo webhooks
POST   /v1/webhooks/moonpay             → MoonPay webhooks
```

**Request/Response Examples:**
```typescript
// Add card funding source
POST /v1/funding/sources
{
  "type": "card",
  "provider": "stripe",
  "setup_token": "seti_xxx"  // From Stripe.js
}

// Response
{
  "id": "fs_abc123",
  "type": "card",
  "provider": "stripe",
  "status": "active",
  "display_name": "Visa •••• 4242",
  "last_four": "4242",
  "limits": {
    "per_transaction": 10000_00,
    "daily": 50000_00,
    "monthly": 200000_00
  }
}

// Initiate funding
POST /v1/funding/transactions
{
  "source_id": "fs_abc123",
  "amount": 1000_00,
  "currency": "USD",
  "idempotency_key": "fund_xyz789"
}

// Response
{
  "id": "ft_def456",
  "source_id": "fs_abc123",
  "amount": 1000_00,
  "currency": "USD",
  "converted_amount": 1000_00,  // USDC cents
  "status": "processing",
  "fees": {
    "provider": 29,  // $0.29
    "payos": 0
  },
  "estimated_completion": "2026-01-04T20:00:00Z"
}
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding`
- **Method(s):** Full CRUD operations
- **SDK story:** Story 36.21

**Files to Create:**
- `apps/api/src/routes/funding.ts`
- `apps/api/src/routes/webhooks/funding.ts`

---

### Part 2: Stripe Integration (21 points)

#### Story 41.4: Stripe Connect Setup

**Points:** 3  
**Priority:** P0  
**Dependencies:** 41.1

**Description:**
Configure Stripe Connect for collecting payments on behalf of partners. This enables PayOS to collect funds and settle to partner accounts.

**Acceptance Criteria:**
- [ ] Stripe Connect account configured
- [ ] Platform fees configured
- [ ] Webhook endpoints registered
- [ ] Test mode working
- [ ] Environment variables documented

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Infrastructure setup

**Files to Modify:**
- `.env.example`
- `apps/api/src/config/stripe.ts`

---

#### Story 41.5: Stripe Card Payments

**Points:** 5  
**Priority:** P0  
**Dependencies:** 41.3, 41.4

**Description:**
Implement card payment collection via Stripe, including SetupIntents for saving cards and PaymentIntents for charging.

**Acceptance Criteria:**
- [ ] Create SetupIntent for adding cards
- [ ] Save card as funding source on confirmation
- [ ] Create PaymentIntent for funding
- [ ] Handle 3D Secure authentication
- [ ] Process successful payments
- [ ] Handle declined cards with clear errors
- [ ] Support for Visa, Mastercard, Amex
- [ ] Test with Stripe test cards

**Flow:**
```
1. Frontend calls POST /v1/funding/sources/setup (type: card)
2. Backend creates Stripe SetupIntent, returns client_secret
3. Frontend uses Stripe.js to collect card and confirm
4. Stripe webhook notifies success
5. Backend saves funding source as active
6. Partner can now fund via POST /v1/funding/transactions
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.cards`
- **Method(s):** `createSetupIntent()`, `chargeCard()`
- **SDK story:** Story 36.21

**Files to Create:**
- `apps/api/src/services/funding/providers/stripe-cards.ts`

---

#### Story 41.6: Stripe ACH Payments (US Banks)

**Points:** 5  
**Priority:** P1  
**Dependencies:** 41.3, 41.4

**Description:**
Implement ACH bank payment collection via Stripe for US bank accounts.

**Acceptance Criteria:**
- [ ] Create Financial Connections session for bank linking
- [ ] Save linked bank as funding source
- [ ] Initiate ACH debit for funding
- [ ] Handle ACH processing times (3-5 days)
- [ ] Handle ACH failures (insufficient funds, etc.)
- [ ] Micro-deposit verification fallback
- [ ] Test with Stripe test bank accounts

**ACH Timeline:**
```
Day 0: Initiate ACH debit
Day 1: Pending
Day 2-3: Processing
Day 3-5: Complete (funds available)
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.banks`
- **Method(s):** `linkUSBank()`, `initiateACH()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/stripe-ach.ts`

---

#### Story 41.7: Stripe SEPA Payments (EU Banks)

**Points:** 5  
**Priority:** P2  
**Dependencies:** 41.3, 41.4

**Description:**
Implement SEPA Direct Debit collection via Stripe for European bank accounts.

**Acceptance Criteria:**
- [ ] Create SEPA mandate for bank authorization
- [ ] Save SEPA source as funding source
- [ ] Initiate SEPA debit for funding
- [ ] Handle SEPA processing times
- [ ] Handle mandate revocation
- [ ] Proper IBAN validation
- [ ] Test with Stripe test IBANs

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.banks`
- **Method(s):** `linkEUBank()`, `initiateSEPA()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/stripe-sepa.ts`

---

#### Story 41.8: Stripe Webhook Handler (Funding)

**Points:** 3  
**Priority:** P0  
**Dependencies:** 41.5, 41.6

**Description:**
Handle Stripe webhooks for funding-related events (payment success, failure, disputes).

**Acceptance Criteria:**
- [ ] Handle `payment_intent.succeeded`
- [ ] Handle `payment_intent.payment_failed`
- [ ] Handle `setup_intent.succeeded`
- [ ] Handle `charge.dispute.created`
- [ ] Update funding source status appropriately
- [ ] Update funding transaction status
- [ ] Trigger downstream webhooks to partners
- [ ] Idempotent webhook processing

**SDK Exposure:**
- **Needs SDK exposure?** Types Only
- **Module:** Webhook event types

**Files to Create:**
- `apps/api/src/services/funding/providers/stripe-webhooks.ts`

---

### Part 3: Plaid Integration (US Bank Linking) (13 points)

#### Story 41.9: Plaid Link Integration

**Points:** 5  
**Priority:** P1  
**Dependencies:** 41.1

**Description:**
Integrate Plaid Link for secure bank account linking in the US. Plaid provides better bank coverage and instant account verification compared to Stripe Financial Connections.

**Acceptance Criteria:**
- [ ] Create Link token for frontend
- [ ] Handle public_token exchange
- [ ] Store access_token securely (encrypted)
- [ ] Retrieve account and routing numbers
- [ ] Save as funding source
- [ ] Handle Link errors gracefully
- [ ] Support OAuth institutions
- [ ] Test with Plaid sandbox

**Flow:**
```
1. Backend creates Link token via Plaid API
2. Frontend opens Plaid Link modal
3. User authenticates with bank
4. Plaid returns public_token
5. Backend exchanges for access_token
6. Backend retrieves account details
7. Save funding source as active
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.banks`
- **Method(s):** `createPlaidLinkToken()`, `exchangePlaidToken()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/plaid.ts`
- `apps/api/src/services/funding/providers/plaid-link.ts`

---

#### Story 41.10: Plaid Balance Check

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.9

**Description:**
Implement balance checking before initiating ACH to reduce failure rates.

**Acceptance Criteria:**
- [ ] Fetch real-time balance before funding
- [ ] Check available balance vs requested amount
- [ ] Warn if balance is insufficient
- [ ] Optional: Block funding if insufficient
- [ ] Cache balance briefly (5 min)
- [ ] Handle balance check failures gracefully

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.banks`
- **Method(s):** `getBalance()`
- **SDK story:** Story 36.22

**Files to Modify:**
- `apps/api/src/services/funding/providers/plaid.ts`

---

#### Story 41.11: Plaid Identity Verification

**Points:** 5  
**Priority:** P2  
**Dependencies:** 41.9

**Description:**
Use Plaid Identity to verify account holder matches the PayOS account owner for compliance.

**Acceptance Criteria:**
- [ ] Fetch identity information from Plaid
- [ ] Compare name with account holder
- [ ] Flag mismatches for review
- [ ] Store verification result
- [ ] Integrate with compliance screening
- [ ] Support manual override for legitimate cases

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Internal compliance check

**Files to Create:**
- `apps/api/src/services/funding/providers/plaid-identity.ts`

---

### Part 4: Belvo Integration (LATAM Banks) (21 points)

#### Story 41.12: Belvo Connect Setup

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.1

**Description:**
Configure Belvo for LATAM bank account linking (Brazil, Mexico, Colombia).

**Acceptance Criteria:**
- [ ] Belvo sandbox account configured
- [ ] API keys stored securely
- [ ] Supported institutions documented
- [ ] Webhook endpoint registered
- [ ] Test mode working

**Belvo Coverage:**
| Country | Banks | Open Finance |
|---------|-------|--------------|
| Brazil | 100+ | Yes (BCB regulated) |
| Mexico | 50+ | Partial |
| Colombia | 30+ | Yes |

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Infrastructure setup

**Files to Create:**
- `apps/api/src/services/funding/providers/belvo-client.ts`

---

#### Story 41.13: Belvo Widget Integration

**Points:** 5  
**Priority:** P1  
**Dependencies:** 41.12

**Description:**
Integrate Belvo Connect widget for secure bank linking in LATAM.

**Acceptance Criteria:**
- [ ] Create access token for widget
- [ ] Handle successful link callback
- [ ] Store link credentials securely
- [ ] Retrieve account information
- [ ] Save as funding source
- [ ] Handle widget errors
- [ ] Support for BR, MX, CO banks

**Flow:**
```
1. Backend creates Belvo access token
2. Frontend opens Belvo Connect widget
3. User selects bank and authenticates
4. Belvo returns link_id
5. Backend retrieves account details
6. Save funding source as active
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.banks`
- **Method(s):** `createBelvoToken()`, `linkLATAMBank()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/belvo-widget.ts`

---

#### Story 41.14: Pix Collection (Brazil Inbound)

**Points:** 5  
**Priority:** P1  
**Dependencies:** 41.13

**Description:**
Implement Pix payment collection for Brazilian funding. Users can send Pix to fund their PayOS account.

**Acceptance Criteria:**
- [ ] Generate Pix QR code for funding
- [ ] Generate Pix copy-paste code
- [ ] Receive Pix webhook on payment
- [ ] Credit account on confirmation
- [ ] Handle Pix expiration
- [ ] Support dynamic (amount-specific) Pix
- [ ] Test with Belvo sandbox

**Flow:**
```
1. User requests funding via Pix
2. PayOS generates Pix QR code (via Belvo or partner PSP)
3. User scans and pays via their bank app
4. Pix settles instantly
5. Webhook received
6. PayOS credits account
7. Convert BRL → USDC via Circle
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.pix`
- **Method(s):** `generatePixCode()`, `getPixStatus()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/belvo-pix.ts`

---

#### Story 41.15: SPEI Collection (Mexico Inbound)

**Points:** 5  
**Priority:** P1  
**Dependencies:** 41.13

**Description:**
Implement SPEI payment collection for Mexican funding.

**Acceptance Criteria:**
- [ ] Generate CLABE for receiving SPEI
- [ ] Receive SPEI webhook on payment
- [ ] Credit account on confirmation
- [ ] Handle SPEI reference matching
- [ ] Support recurring CLABE (same for account)
- [ ] Test with Belvo sandbox

**Flow:**
```
1. PayOS provides CLABE + reference for account
2. User initiates SPEI from their bank
3. SPEI settles (minutes)
4. Webhook received
5. PayOS credits account
6. Convert MXN → USDC via Circle
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.spei`
- **Method(s):** `getSPEIDetails()`, `getSPEIStatus()`
- **SDK story:** Story 36.22

**Files to Create:**
- `apps/api/src/services/funding/providers/belvo-spei.ts`

---

#### Story 41.16: Belvo Webhook Handler

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.14, 41.15

**Description:**
Handle Belvo webhooks for account updates and payment notifications.

**Acceptance Criteria:**
- [ ] Handle `ACCOUNT_CREATED` events
- [ ] Handle `TRANSACTION_CREATED` for incoming payments
- [ ] Handle `LINK_UPDATED` for re-authentication
- [ ] Update funding source status
- [ ] Update funding transaction status
- [ ] Trigger downstream webhooks

**SDK Exposure:**
- **Needs SDK exposure?** Types Only

**Files to Create:**
- `apps/api/src/services/funding/providers/belvo-webhooks.ts`

---

### Part 5: Crypto On-Ramp Widgets (13 points)

#### Story 41.17: MoonPay Widget Integration

**Points:** 5  
**Priority:** P2  
**Dependencies:** 41.1

**Description:**
Integrate MoonPay widget for direct card-to-USDC purchases. This is the simplest on-ramp for users who want USDC without managing bank transfers.

**Acceptance Criteria:**
- [ ] Generate MoonPay widget URL with parameters
- [ ] Pre-fill user email and wallet address
- [ ] Handle successful purchase callback
- [ ] Credit account when USDC received
- [ ] Display fees transparently (MoonPay charges 3.5-4.5%)
- [ ] Support for cards in 160+ countries
- [ ] Test with MoonPay sandbox

**MoonPay Fees:**
- Credit/Debit card: 4.5%
- Bank transfer: 1%
- Minimum: $30

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.crypto`
- **Method(s):** `getMoonPayUrl()`, `getMoonPayStatus()`
- **SDK story:** Story 36.23

**Files to Create:**
- `apps/api/src/services/funding/providers/moonpay.ts`

---

#### Story 41.18: Transak Widget Integration

**Points:** 5  
**Priority:** P2  
**Dependencies:** 41.1

**Description:**
Integrate Transak as alternative crypto on-ramp widget with different coverage and fees.

**Acceptance Criteria:**
- [ ] Generate Transak widget URL
- [ ] Pre-fill user details
- [ ] Handle purchase completion webhook
- [ ] Credit account when USDC received
- [ ] Display fees transparently
- [ ] Support for 150+ countries
- [ ] Test with Transak sandbox

**Transak vs MoonPay:**
| Aspect | MoonPay | Transak |
|--------|---------|---------|
| Card fee | 4.5% | 5% |
| Bank fee | 1% | 1% |
| Countries | 160+ | 150+ |
| Compliance | Strong | Strong |
| LATAM | Good | Good |

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.crypto`
- **Method(s):** `getTransakUrl()`, `getTransakStatus()`
- **SDK story:** Story 36.23

**Files to Create:**
- `apps/api/src/services/funding/providers/transak.ts`

---

#### Story 41.19: Direct USDC Deposit

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.1, Story 40.2 (Circle Wallets)

**Description:**
Support direct USDC deposits for crypto-native partners who already hold USDC.

**Acceptance Criteria:**
- [ ] Generate deposit address for account
- [ ] Monitor for incoming USDC (Base network)
- [ ] Credit account on confirmation
- [ ] Support multiple networks (Base, Ethereum, Polygon)
- [ ] Display minimum deposit amount
- [ ] Show estimated confirmation time

**Flow:**
```
1. Partner requests deposit address
2. PayOS returns Circle wallet address + network
3. Partner sends USDC from their wallet
4. Circle detects incoming transfer
5. PayOS credits partner account
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding.crypto`
- **Method(s):** `getDepositAddress()`, `getDepositStatus()`
- **SDK story:** Story 36.23

**Files to Modify:**
- `apps/api/src/services/circle/wallets.ts`

---

### Part 6: Currency Conversion (8 points)

#### Story 41.20: Fiat to USDC Conversion

**Points:** 5  
**Priority:** P0  
**Dependencies:** 41.2, Story 40.6 (Circle FX)

**Description:**
When funding arrives in fiat (USD, BRL, MXN), automatically convert to USDC for the account balance.

**Acceptance Criteria:**
- [ ] Get conversion quote before funding
- [ ] Lock rate during transaction
- [ ] Execute conversion on fund receipt
- [ ] Handle conversion failures
- [ ] Track conversion fees separately
- [ ] Support USD, BRL, MXN → USDC
- [ ] Audit trail for all conversions

**Flow:**
```
1. User funds with $100 USD
2. PayOS receives $100 via Stripe
3. PayOS calls Circle to mint USDC
4. Circle converts USD → USDC (1:1 for USD)
5. PayOS credits 100 USDC to account
```

**For BRL/MXN:**
```
1. User funds with R$500 BRL
2. PayOS receives R$500 via Pix
3. PayOS gets FX quote from Circle
4. Circle converts BRL → USD → USDC
5. PayOS credits ~$100 USDC to account (at current rate)
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding`
- **Method(s):** `getConversionQuote()`
- **SDK story:** Story 36.21

**Files to Create:**
- `apps/api/src/services/funding/conversion.ts`

---

#### Story 41.21: Funding Fee Structure

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.20

**Description:**
Implement transparent fee structure for funding operations.

**Fee Structure:**
| Method | Provider Fee | PayOS Fee | Total |
|--------|--------------|-----------|-------|
| Card (Stripe) | 2.9% + $0.30 | 0% | ~3% |
| ACH (Stripe) | 0.8% max $5 | 0% | <1% |
| SEPA (Stripe) | €0.35 | 0% | €0.35 |
| Pix (Belvo) | ~1% | 0% | ~1% |
| SPEI (Belvo) | ~0.5% | 0% | ~0.5% |
| MoonPay | 4.5% | 0% | 4.5% |
| Direct USDC | Network gas | 0% | ~$0.01 |

**Acceptance Criteria:**
- [ ] Calculate fees before transaction
- [ ] Display fee breakdown to user
- [ ] Track fees in database
- [ ] Support fee waivers (promotional)
- [ ] Partner-specific fee overrides
- [ ] Monthly fee reports

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.funding`
- **Method(s):** `estimateFees()`
- **SDK story:** Story 36.21

**Files to Create:**
- `apps/api/src/services/funding/fees.ts`

---

### Part 7: E2E Scenarios (13 points)

#### Story 41.22: E2E: Card Funding → Settlement

**Points:** 3  
**Priority:** P0  
**Dependencies:** 41.5, Story 40.3

**Description:**
End-to-end test for card funding followed by Pix settlement.

**Test Scenario:**
```
1. Partner adds card via Stripe SetupIntent
2. Partner initiates $100 funding
3. Stripe charges card
4. PayOS converts to USDC
5. Partner initiates Pix settlement
6. Circle sends Pix
7. Recipient receives BRL
```

**Acceptance Criteria:**
- [ ] Full flow completes in sandbox
- [ ] Card charge appears in Stripe dashboard
- [ ] USDC credited to account
- [ ] Pix settlement completes
- [ ] All fees tracked correctly
- [ ] Integration test automated

**Files to Create:**
- `apps/api/test/e2e/card-to-pix.test.ts`

---

#### Story 41.23: E2E: ACH Funding → Settlement

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.6, Story 40.4

**Description:**
End-to-end test for ACH funding followed by SPEI settlement.

**Test Scenario:**
```
1. Partner links US bank via Plaid
2. Partner initiates $1000 ACH funding
3. ACH processes (simulated instant in sandbox)
4. PayOS converts to USDC
5. Partner initiates SPEI settlement
6. Circle sends SPEI
7. Recipient receives MXN
```

**Acceptance Criteria:**
- [ ] Full flow completes in sandbox
- [ ] Bank link verified
- [ ] ACH debit initiated
- [ ] USDC credited after ACH settles
- [ ] SPEI settlement completes

**Files to Create:**
- `apps/api/test/e2e/ach-to-spei.test.ts`

---

#### Story 41.24: E2E: Pix Collection → Pix Settlement (Brazil to Brazil)

**Points:** 3  
**Priority:** P1  
**Dependencies:** 41.14, Story 40.3

**Description:**
End-to-end test for Pix funding followed by Pix settlement (domestic Brazil flow).

**Test Scenario:**
```
1. User generates Pix QR code for funding
2. User pays via their bank app (simulated)
3. PayOS receives Pix
4. PayOS converts BRL → USDC
5. User initiates Pix settlement to another recipient
6. Circle sends Pix
7. Recipient receives BRL
```

**Acceptance Criteria:**
- [ ] Pix QR code generated
- [ ] Incoming Pix detected
- [ ] BRL → USDC conversion works
- [ ] Outgoing Pix completes
- [ ] Total fees < 2%

**Files to Create:**
- `apps/api/test/e2e/pix-to-pix.test.ts`

---

#### Story 41.25: E2E: MoonPay → x402 → Settlement

**Points:** 5  
**Priority:** P2  
**Dependencies:** 41.17, Story 40.10

**Description:**
End-to-end test for MoonPay funding followed by x402 payment and settlement.

**Test Scenario:**
```
1. User purchases USDC via MoonPay widget
2. USDC arrives in PayOS wallet
3. User's agent makes x402 payment
4. x402 settles on Base
5. Recipient receives USDC
6. Recipient settles to Pix
```

**Acceptance Criteria:**
- [ ] MoonPay purchase simulated
- [ ] USDC credited to account
- [ ] x402 payment works
- [ ] Full agent flow completes

**Files to Create:**
- `apps/api/test/e2e/moonpay-to-x402.test.ts`

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| **Part 1: Foundation** | **13** | | | |
| 41.1 | 3 | P0 | Funding Source Data Model | None |
| 41.2 | 5 | P0 | Funding Orchestrator Service | 41.1 |
| 41.3 | 5 | P0 | Funding API Endpoints | 41.1, 41.2 |
| **Part 2: Stripe** | **21** | | | |
| 41.4 | 3 | P0 | Stripe Connect Setup | 41.1 |
| 41.5 | 5 | P0 | Stripe Card Payments | 41.3, 41.4 |
| 41.6 | 5 | P1 | Stripe ACH Payments | 41.3, 41.4 |
| 41.7 | 5 | P2 | Stripe SEPA Payments | 41.3, 41.4 |
| 41.8 | 3 | P0 | Stripe Webhook Handler | 41.5, 41.6 |
| **Part 3: Plaid** | **13** | | | |
| 41.9 | 5 | P1 | Plaid Link Integration | 41.1 |
| 41.10 | 3 | P1 | Plaid Balance Check | 41.9 |
| 41.11 | 5 | P2 | Plaid Identity Verification | 41.9 |
| **Part 4: Belvo (LATAM)** | **21** | | | |
| 41.12 | 3 | P1 | Belvo Connect Setup | 41.1 |
| 41.13 | 5 | P1 | Belvo Widget Integration | 41.12 |
| 41.14 | 5 | P1 | Pix Collection (Brazil) | 41.13 |
| 41.15 | 5 | P1 | SPEI Collection (Mexico) | 41.13 |
| 41.16 | 3 | P1 | Belvo Webhook Handler | 41.14, 41.15 |
| **Part 5: Crypto Widgets** | **13** | | | |
| 41.17 | 5 | P2 | MoonPay Widget | 41.1 |
| 41.18 | 5 | P2 | Transak Widget | 41.1 |
| 41.19 | 3 | P1 | Direct USDC Deposit | 41.1, 40.2 |
| **Part 6: Conversion** | **8** | | | |
| 41.20 | 5 | P0 | Fiat to USDC Conversion | 41.2, 40.6 |
| 41.21 | 3 | P1 | Funding Fee Structure | 41.20 |
| **Part 7: E2E Tests** | **13** | | | |
| 41.22 | 3 | P0 | E2E: Card → Pix | 41.5, 40.3 |
| 41.23 | 3 | P1 | E2E: ACH → SPEI | 41.6, 40.4 |
| 41.24 | 3 | P1 | E2E: Pix → Pix | 41.14, 40.3 |
| 41.25 | 5 | P2 | E2E: MoonPay → x402 | 41.17, 40.10 |
| **TOTAL** | **89** | | | |

---

## Priority Summary

| Priority | Stories | Points | Description |
|----------|---------|--------|-------------|
| **P0** | 8 | 32 | Foundation, Stripe cards, conversion, card E2E |
| **P1** | 11 | 40 | ACH, Plaid, Belvo LATAM, direct USDC, fees |
| **P2** | 5 | 25 | SEPA, MoonPay, Transak, identity verification |
| **Total** | **24** | **89** | |

---

## Success Criteria

| Checkpoint | Criteria |
|------------|----------|
| After P0 | Partners can fund via card, settle to Pix/SPEI |
| After P1 (LATAM) | Brazilian/Mexican partners can fund via local rails |
| After P1 (US) | US partners can fund via ACH |
| After P2 | Global coverage via crypto widgets |

---

## External Resources

| Service | Documentation | Sandbox |
|---------|---------------|---------|
| Stripe | docs.stripe.com | Test mode |
| Plaid | plaid.com/docs | Sandbox |
| Belvo | docs.belvo.com | Sandbox |
| MoonPay | docs.moonpay.com | Sandbox |
| Transak | docs.transak.com | Sandbox |

---

## Regulatory Considerations

### Money Transmission

Adding on-ramps may trigger money transmission licensing requirements:
- **US:** Money transmitter license (state by state) or partnership with licensed entity
- **Brazil:** Payment institution license or partnership
- **Mexico:** CNBV registration

### Recommended Approach

1. **Phase 1:** Partner with licensed entities (Stripe, Belvo) who handle compliance
2. **Phase 2:** Evaluate own licenses based on volume and customer needs
3. **Phase 3:** Apply for licenses in key markets if warranted

### KYC Requirements

| Funding Method | KYC Level |
|----------------|-----------|
| Cards (Stripe) | Handled by Stripe |
| ACH (Plaid) | Account holder verification |
| Pix/SPEI (Belvo) | CPF/CURP verification |
| Crypto widgets | Handled by MoonPay/Transak |
| Direct USDC | Wallet screening only |

---

*Created: January 5, 2026*  
*Last Updated: January 5, 2026*  
*Status: Ready for prioritization*
