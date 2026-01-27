# Epic 43: Cards Infrastructure & Virtual Debit Cards

**Status:** 📋 Planning  
**Priority:** P1  
**Points:** 47  
**Stories:** 12  
**Phase:** 3.5  
**Created:** January 6, 2026

---

## Overview

This epic implements the cards infrastructure needed to support Virtual Debit Cards (VDC) for AP2 mandates and future card issuance capabilities. It addresses the API feedback from Epic 42 frontend integration work.

### Background

During Epic 42 implementation, Gemini identified that Virtual Debit Cards are being mocked by storing card details in mandate `metadata` fields. This is not secure or scalable. This epic creates proper infrastructure for:

1. **VDC Issuance** - Issue virtual cards linked to AP2 mandates
2. **Card Lifecycle** - Activate, freeze, unfreeze, cancel cards
3. **Secure Retrieval** - PCI-compliant card detail access
4. **Spend Controls** - Limits and merchant category restrictions

---

## Stories

### Story 43.1: Cards Database Schema
**Points:** 5

Create the database schema for virtual cards.

```sql
-- Virtual Debit Cards table
CREATE TABLE virtual_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mandate_id UUID REFERENCES ap2_mandates(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Card Details (encrypted at rest)
  card_number_encrypted BYTEA NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  cvv_encrypted BYTEA,
  
  -- Card Metadata
  card_type TEXT NOT NULL DEFAULT 'virtual', -- virtual, physical
  network TEXT NOT NULL DEFAULT 'visa', -- visa, mastercard
  last_four TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, frozen, cancelled
  activated_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Spend Controls
  single_transaction_limit BIGINT, -- in cents
  daily_limit BIGINT,
  monthly_limit BIGINT,
  allowed_mccs TEXT[], -- merchant category codes
  blocked_mccs TEXT[],
  
  -- Tracking
  daily_spent BIGINT DEFAULT 0,
  monthly_spent BIGINT DEFAULT 0,
  daily_reset_at DATE,
  monthly_reset_at DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card Transactions table
CREATE TABLE card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  card_id UUID NOT NULL REFERENCES virtual_cards(id),
  
  -- Transaction Details
  amount BIGINT NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_id TEXT,
  mcc TEXT, -- merchant category code
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, declined, reversed
  decline_reason TEXT,
  
  -- Authorization
  authorization_code TEXT,
  authorized_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Tables created with proper indexes
- [ ] RLS policies for tenant isolation
- [ ] Encryption functions for card numbers
- [ ] TypeScript types generated

---

### Story 43.2: Card Issuance API
**Points:** 5

Implement the card issuance endpoint.

**Endpoint:** `POST /v1/ap2/mandates/:id/issue-card`

```typescript
// Request
{
  "cardType": "virtual",
  "network": "visa",
  "spendControls": {
    "singleTransactionLimit": 100000, // $1000
    "dailyLimit": 500000,
    "monthlyLimit": 2000000,
    "allowedMccs": ["5411", "5812"], // Groceries, Restaurants
  }
}

// Response
{
  "id": "card_xxx",
  "mandateId": "mnd_xxx",
  "lastFour": "4242",
  "network": "visa",
  "status": "pending",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "createdAt": "2026-01-06T..."
}
```

**Acceptance Criteria:**
- [ ] Creates card record linked to mandate
- [ ] Generates virtual card number (test range)
- [ ] Returns masked response (no full PAN)
- [ ] Validates mandate is active
- [ ] Only one active card per mandate

---

### Story 43.3: Secure Card Details API
**Points:** 5

Implement PCI-compliant card detail retrieval.

**Endpoint:** `GET /v1/ap2/mandates/:id/card-details`

```typescript
// Request Headers
Authorization: Bearer <token>
X-Card-Pin: <user_pin_or_otp>

// Response (after verification)
{
  "cardNumber": "4242424242424242",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "cvv": "123",
  "cardholderName": "PAYOS AGENT"
}
```

**Security Requirements:**
- [ ] Requires additional authentication (PIN/OTP)
- [ ] Rate limited (3 requests per hour)
- [ ] Audit logged
- [ ] Response not cached
- [ ] Separate from list endpoints

**Acceptance Criteria:**
- [ ] Full card details returned only with verification
- [ ] Audit trail created
- [ ] Rate limits enforced
- [ ] Error handling for invalid PIN

---

### Story 43.4: Card Activation API
**Points:** 3

**Endpoint:** `POST /v1/cards/:id/activate`

```typescript
// Response
{
  "id": "card_xxx",
  "status": "active",
  "activatedAt": "2026-01-06T..."
}
```

**Acceptance Criteria:**
- [ ] Only pending cards can be activated
- [ ] Sets activated_at timestamp
- [ ] Emits card.activated event

---

### Story 43.5: Card Freeze/Unfreeze API
**Points:** 3

**Endpoints:**
- `POST /v1/cards/:id/freeze`
- `POST /v1/cards/:id/unfreeze`

**Acceptance Criteria:**
- [ ] Toggle card status between active/frozen
- [ ] Frozen cards decline all transactions
- [ ] Tracks freeze/unfreeze timestamps
- [ ] Emits card.frozen/card.unfrozen events

---

### Story 43.6: Card Cancellation API
**Points:** 3

**Endpoint:** `POST /v1/cards/:id/cancel`

```typescript
// Request
{
  "reason": "lost_or_stolen" | "fraud" | "user_request" | "mandate_expired"
}

// Response
{
  "id": "card_xxx",
  "status": "cancelled",
  "cancelledAt": "2026-01-06T...",
  "cancellationReason": "user_request"
}
```

**Acceptance Criteria:**
- [ ] Sets card status to cancelled (irreversible)
- [ ] Records cancellation reason
- [ ] Emits card.cancelled event

---

### Story 43.7: Spend Limit Updates API
**Points:** 3

**Endpoint:** `PATCH /v1/cards/:id/limits`

```typescript
// Request
{
  "singleTransactionLimit": 50000,
  "dailyLimit": 200000,
  "monthlyLimit": 1000000,
  "allowedMccs": ["5411"],
  "blockedMccs": ["7995"] // Gambling
}

// Response
{
  "id": "card_xxx",
  "spendControls": { ... },
  "updatedAt": "2026-01-06T..."
}
```

**Acceptance Criteria:**
- [ ] Updates spend limits in real-time
- [ ] Validates limits are positive
- [ ] Cannot exceed mandate limits
- [ ] Emits card.limits_updated event

---

### Story 43.8: Card List/Detail APIs
**Points:** 3

**Endpoints:**
- `GET /v1/cards` - List all cards for tenant
- `GET /v1/cards/:id` - Get card details (masked)
- `GET /v1/ap2/mandates/:id/cards` - List cards for mandate

```typescript
// GET /v1/cards response
{
  "data": [
    {
      "id": "card_xxx",
      "mandateId": "mnd_xxx",
      "lastFour": "4242",
      "network": "visa",
      "status": "active",
      "spendControls": { ... },
      "dailySpent": 15000,
      "monthlySpent": 45000,
      "createdAt": "..."
    }
  ],
  "pagination": { ... }
}
```

**Acceptance Criteria:**
- [ ] List endpoint with filtering (status, mandate)
- [ ] Detail endpoint with masked card number
- [ ] Includes current spend tracking
- [ ] Pagination support

---

### Story 43.9: Card Transaction Authorization (Mock)
**Points:** 5

Create mock authorization flow for testing.

**Endpoint:** `POST /v1/cards/:id/authorize` (internal/mock)

```typescript
// Request (simulates card network authorization request)
{
  "amount": 5000, // $50.00
  "currency": "USD",
  "merchantName": "UBER EATS",
  "merchantId": "mer_xxx",
  "mcc": "5812"
}

// Response
{
  "approved": true,
  "authorizationCode": "AUTH123",
  "transactionId": "txn_xxx",
  "remainingDailyLimit": 195000
}
```

**Authorization Checks:**
1. Card is active (not frozen/cancelled)
2. Mandate is active
3. Amount within single transaction limit
4. Amount within remaining daily limit
5. Amount within remaining monthly limit
6. MCC is allowed (if restrictions set)
7. MCC is not blocked

**Acceptance Criteria:**
- [ ] Validates all spend controls
- [ ] Creates card_transaction record
- [ ] Updates daily/monthly spend counters
- [ ] Returns decline reason if rejected

---

### Story 43.10: Card Dashboard UI
**Points:** 5

Add card management to the AP2 mandate detail page.

**Components:**
- `CardDetails` - Display card info with reveal toggle
- `CardActions` - Freeze/Unfreeze/Cancel buttons
- `CardLimits` - Edit spend limits form
- `CardTransactions` - Transaction history table

**Acceptance Criteria:**
- [ ] Issue card button on mandate detail
- [ ] Card display with masked PAN
- [ ] Reveal full PAN (requires PIN)
- [ ] Action buttons for lifecycle management
- [ ] Transaction history with filtering

---

### Story 43.11: Spend Counter Reset Jobs
**Points:** 3

Implement daily/monthly spend counter resets.

```typescript
// Daily reset job (runs at midnight UTC)
await db.execute(`
  UPDATE virtual_cards 
  SET daily_spent = 0, daily_reset_at = CURRENT_DATE
  WHERE daily_reset_at < CURRENT_DATE AND status = 'active'
`);

// Monthly reset job (runs on 1st of month)
await db.execute(`
  UPDATE virtual_cards 
  SET monthly_spent = 0, monthly_reset_at = DATE_TRUNC('month', CURRENT_DATE)
  WHERE monthly_reset_at < DATE_TRUNC('month', CURRENT_DATE) AND status = 'active'
`);
```

**Acceptance Criteria:**
- [ ] Daily reset runs at midnight UTC
- [ ] Monthly reset runs on 1st of month
- [ ] Only resets active cards
- [ ] Idempotent (safe to run multiple times)

---

### Story 43.12: Wallet Top-Up API
**Points:** 4

Implement wallet deposit functionality for sandbox testing.

**Endpoint:** `POST /v1/wallets/:id/deposit`

```typescript
// Request
{
  "amount": "100.00",
  "currency": "USDC",
  "source": "sandbox_faucet"
}

// Response
{
  "walletId": "wlt_xxx",
  "transactionId": "txn_xxx",
  "amount": "100.00",
  "currency": "USDC",
  "newBalance": "150.00",
  "status": "completed"
}
```

**Note:** This is for sandbox/testing only. Production deposits will come from on-ramp integrations (Epic 41).

**Acceptance Criteria:**
- [ ] Only available in sandbox mode
- [ ] Updates wallet balance
- [ ] Creates ledger entry
- [ ] Emits wallet.deposited event

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Epic 40 (Sandbox Integrations) | Required | ✅ Complete |
| Epic 42 (Frontend Dashboard) | Required | ✅ Complete |
| AP2 Mandates API | Required | ✅ Complete |
| Wallet Management API | Required | ✅ Complete |

---

## API Client Updates

Add to `@sly/api-client`:

```typescript
// Card methods
api.cards.list(params?: CardListParams): Promise<CardList>
api.cards.get(id: string): Promise<Card>
api.cards.getDetails(id: string, pin: string): Promise<CardDetails>
api.cards.activate(id: string): Promise<Card>
api.cards.freeze(id: string): Promise<Card>
api.cards.unfreeze(id: string): Promise<Card>
api.cards.cancel(id: string, reason: CancelReason): Promise<Card>
api.cards.updateLimits(id: string, limits: SpendLimits): Promise<Card>

// AP2 Mandate card methods
api.ap2.mandates.issueCard(id: string, params: IssueCardParams): Promise<Card>
api.ap2.mandates.listCards(id: string): Promise<CardList>

// Wallet deposit (sandbox only)
api.wallets.deposit(id: string, params: DepositParams): Promise<DepositResult>
```

---

## Security Considerations

1. **PCI Compliance**
   - Card numbers encrypted at rest
   - Full PAN only accessible via authenticated endpoint
   - CVV never stored (generated on-demand)
   
2. **Access Control**
   - Card details require additional PIN/OTP
   - Rate limiting on sensitive endpoints
   - Full audit trail

3. **Sandbox vs Production**
   - Test card number ranges (4242...)
   - Deposit endpoint sandbox-only
   - Clear indicators in UI

---

## Success Metrics

- [ ] Card issuance <500ms latency
- [ ] Authorization decisions <100ms
- [ ] Zero PAN exposure in logs
- [ ] 100% audit coverage on card access


