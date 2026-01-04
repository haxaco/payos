# Settlement API Architecture

**Last Updated:** January 2026  
**Source:** Technical design discussions, PRD v1.16

---

## Executive Summary

Settlement-as-an-API is the core product concept for PayOS. A single API that any agentic system (procurement AI, shopping agent, fintech app) can call to move money from point A to point B, with automatic protocol handling, FX conversion, and local rail payout.

**The key insight:** Settlement is the common denominator. Whether it's a Monq agent paying a supplier, a shopping agent buying shoes, or a remittance app sending money to Mexico—they all need the same thing: **move value, convert currency, deliver to recipient.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CALLER LAYER                                │
│                                                                     │
│   B2B Procurement        B2C Shopping         Fintech Apps          │
│   ┌─────────────┐       ┌─────────────┐      ┌─────────────┐       │
│   │    Monq     │       │  Shopping   │      │  Remittance │       │
│   │  Mercanis   │       │   Agents    │      │    Apps     │       │
│   │  Magentic   │       │  (x402/ACP) │      │  (Partners) │       │
│   └──────┬──────┘       └──────┬──────┘      └──────┬──────┘       │
└──────────┼─────────────────────┼────────────────────┼───────────────┘
           │                     │                    │
           ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                      PayOS SETTLEMENT API                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │   POST /v1/settlements                                        │ │
│  │                                                               │ │
│  │   {                                                           │ │
│  │     "source": { ... },      // Where money comes from         │ │
│  │     "destination": { ... }, // Where money goes               │ │
│  │     "amount": { ... },      // How much, in what currency     │ │
│  │     "execution": { ... },   // When and how to execute        │ │
│  │     "metadata": { ... }     // Reference IDs, callbacks       │ │
│  │   }                                                           │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │  Protocol   │      │     FX      │      │ Compliance  │        │
│  │  Handler    │      │   Engine    │      │   Layer     │        │
│  │             │      │             │      │             │        │
│  │ • x402      │      │ • Rates     │      │ • KYC/KYB   │        │
│  │ • AP2       │      │ • Spreads   │      │ • AML       │        │
│  │ • ACP       │      │ • Hedging   │      │ • Sanctions │        │
│  │ • Direct    │      │             │      │             │        │
│  └─────────────┘      └─────────────┘      └─────────────┘        │
│                              │                                     │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SETTLEMENT RAILS                              │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Stablecoin │  │    LATAM    │  │   Global    │  │  Legacy   │ │
│  │    Rails    │  │    Rails    │  │    Rails    │  │   Rails   │ │
│  │             │  │             │  │             │  │           │ │
│  │ • USDC      │  │ • Pix       │  │ • SEPA      │  │ • SWIFT   │ │
│  │ • EURC      │  │ • SPEI      │  │ • ACH       │  │ • Wire    │ │
│  │ • Base      │  │ • Nequi     │  │ • FPS (UK)  │  │           │ │
│  │ • Solana    │  │ • CVU (AR)  │  │             │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Settlement Primitives

| Primitive | What It Does | B2B Example | B2C Example |
|-----------|--------------|-------------|-------------|
| **Treasury** | Hold funds in stablecoins | Enterprise payables account | Consumer wallet |
| **Quote** | Lock FX rate for a period | Quote for supplier payment | Quote for remittance |
| **Settlement** | Move money A→B | Pay supplier in MXN | Send to family in BRL |
| **Batch** | Multiple settlements at once | Weekly supplier run | Creator payouts |
| **Escrow** | Hold until conditions met | Milestone payments | Goods delivery |
| **Mandate** | Pre-authorized spend limits | Department budgets | Agent shopping limits |

---

## B2B Use Cases

### Use Case 1: Monq Agent Pays Supplier

**Scenario:** Monq's AI negotiates a $50,000 manufacturing components deal with a Mexican supplier. Deal is approved. Payment needs to happen.

**Current State (without PayOS):**
1. Procurement team manually initiates wire transfer
2. Treasury converts USD to MXN (2-3% spread)
3. SWIFT transfer takes 2-3 days
4. Supplier confirms receipt, updates systems manually
5. AP team reconciles in ERP

**With PayOS:**

```javascript
// Monq agent calls PayOS after deal approval
POST /v1/settlements
{
  "source": {
    "type": "treasury_account",
    "account_id": "acct_enterprise_123",
    "currency": "USD"
  },
  "destination": {
    "type": "bank_account",
    "country": "MX",
    "rail": "spei",
    "clabe": "012180001234567890",
    "beneficiary_name": "Componentes Industriales SA",
    "currency": "MXN"
  },
  "amount": {
    "value": "50000.00",
    "currency": "USD"
  },
  "execution": {
    "type": "immediate",
    "fx_quote_id": "quote_abc123"
  },
  "metadata": {
    "reference": "PO-2025-0847",
    "monq_deal_id": "deal_xyz789",
    "invoice_number": "INV-MX-2025-1234",
    "callback_url": "https://api.monq.io/webhooks/payment"
  }
}

// Response
{
  "settlement_id": "stl_abc123def456",
  "status": "processing",
  "source_amount": "50000.00 USD",
  "destination_amount": "1025000.00 MXN",
  "fx_rate": "20.50",
  "fees": {
    "settlement_fee": "125.00 USD",
    "fx_spread": "0.35%"
  },
  "estimated_arrival": "2025-12-26T15:30:00Z",
  "rail_used": "spei_via_circle",
  "tracking_url": "https://payos.io/track/stl_abc123def456"
}
```

**Settlement Flow:**
1. PayOS debits enterprise's USDC treasury account
2. Routes through Circle's SPEI integration
3. Converts USDC → MXN at wholesale rate
4. Delivers MXN to supplier's CLABE in ~10 minutes
5. Fires webhook to Monq with confirmation
6. Auto-generates reconciliation data for ERP

---

### Use Case 2: Batch Supplier Payments

**Scenario:** Weekly supplier payment run. 47 suppliers across Brazil, Mexico, Colombia.

```javascript
POST /v1/settlements/batch
{
  "batch_id": "batch_weekly_2025w52",
  "source": {
    "type": "treasury_account",
    "account_id": "acct_enterprise_456"
  },
  "settlements": [
    {
      "destination": {
        "type": "bank_account",
        "country": "BR",
        "rail": "pix",
        "pix_key": "supplier1@empresa.com.br",
        "currency": "BRL"
      },
      "amount": { "value": "15000.00", "currency": "USD" },
      "metadata": { "po": "PO-001", "supplier_id": "sup_br_001" }
    },
    {
      "destination": {
        "type": "bank_account", 
        "country": "MX",
        "rail": "spei",
        "clabe": "012180009876543210",
        "currency": "MXN"
      },
      "amount": { "value": "8500.00", "currency": "USD" },
      "metadata": { "po": "PO-002", "supplier_id": "sup_mx_001" }
    }
    // ... 45 more suppliers
  ],
  "execution": {
    "type": "scheduled",
    "execute_at": "2025-12-27T06:00:00Z"
  },
  "callback_url": "https://api.mercanis.com/webhooks/batch"
}

// Response
{
  "batch_id": "batch_weekly_2025w52",
  "status": "scheduled",
  "total_settlements": 47,
  "total_source_amount": "487500.00 USD",
  "estimated_fees": "1218.75 USD",
  "breakdown": {
    "brazil_pix": { "count": 23, "amount": "245000.00 USD" },
    "mexico_spei": { "count": 18, "amount": "178000.00 USD" },
    "colombia_pse": { "count": 6, "amount": "64500.00 USD" }
  }
}
```

---

### Use Case 3: Escrow for Milestone Contracts

**Scenario:** Manufacturing contract with 3 milestones. Pay 30% upfront, 40% on prototype approval, 30% on final delivery.

```javascript
// Create escrow agreement
POST /v1/escrow
{
  "escrow_id": "esc_manufacturing_001",
  "total_amount": { "value": "100000.00", "currency": "USD" },
  "source": {
    "type": "treasury_account",
    "account_id": "acct_enterprise_789"
  },
  "destination": {
    "type": "bank_account",
    "country": "MX",
    "rail": "spei",
    "clabe": "012180001234567890"
  },
  "milestones": [
    {
      "id": "milestone_1",
      "name": "Contract Signed",
      "percentage": 30,
      "release_trigger": "manual"
    },
    {
      "id": "milestone_2", 
      "name": "Prototype Approved",
      "percentage": 40,
      "release_trigger": "webhook",
      "webhook_source": "https://api.magentic.com/delivery"
    },
    {
      "id": "milestone_3",
      "name": "Final Delivery",
      "percentage": 30,
      "release_trigger": "manual"
    }
  ],
  "expiry": "2026-06-30T00:00:00Z",
  "dispute_resolution": "payos_arbitration"
}

// Fund the escrow
POST /v1/escrow/esc_manufacturing_001/fund

// Release a milestone
POST /v1/escrow/esc_manufacturing_001/milestones/milestone_1/release
{
  "approved_by": "procurement_manager@enterprise.com",
  "notes": "Contract executed, releasing initial payment"
}
```

---

## B2C Use Cases

### Use Case 4: x402 Shopping Agent

**Scenario:** A consumer's shopping agent finds running shoes at a Mexican retailer. Agent needs to pay $120.

**x402 Flow:**

```
Agent                    Merchant                   PayOS
  │                         │                         │
  │ GET /product/shoes      │                         │
  │────────────────────────>│                         │
  │                         │                         │
  │ 402 Payment Required    │                         │
  │ X-Payment: payos://...  │                         │
  │<────────────────────────│                         │
  │                         │                         │
  │         POST /v1/x402/execute                     │
  │───────────────────────────────────────────────────>│
  │                         │                         │
  │         Payment signed + executed                 │
  │<───────────────────────────────────────────────────│
  │                         │                         │
  │ GET /product/shoes      │                         │
  │ X-Payment-Proof: ...    │                         │
  │────────────────────────>│                         │
  │                         │                         │
  │ 200 OK + Order Created  │                         │
  │<────────────────────────│                         │
```

**API Call:**

```javascript
POST /v1/x402/execute
{
  "payment_request": {
    "merchant": "mx_retailer_123",
    "amount": "120.00",
    "currency": "USD",
    "payment_address": "0x1234...abcd",
    "chain": "base",
    "expiry": "2025-12-26T16:00:00Z"
  },
  "payer": {
    "wallet_id": "wallet_consumer_abc",
    "authorization": "mandate_shopping_xyz"
  },
  "metadata": {
    "agent_id": "shopping_agent_456",
    "session_id": "sess_789",
    "product": "Nike Air Max 2025"
  }
}

// Response
{
  "payment_id": "pay_x402_abc123",
  "status": "completed",
  "amount_paid": "120.00 USD",
  "chain": "base",
  "tx_hash": "0xabcd...1234",
  "merchant_settlement": {
    "type": "spei",
    "amount": "2460.00 MXN",
    "eta": "2025-12-26T15:45:00Z"
  },
  "proof": "eyJhbGciOiJFUzI1NiIs..."
}
```

---

### Use Case 5: White-Label Remittance

**Scenario:** Fintech partner's remittance app. User in US sends $500 to family in Brazil.

```javascript
POST /v1/settlements
{
  "source": {
    "type": "partner_collection",
    "partner_id": "partner_remit_xyz",
    "collection_method": "card",
    "card_token": "tok_visa_abc123"
  },
  "destination": {
    "type": "bank_account",
    "country": "BR",
    "rail": "pix",
    "pix_key": "+5511999887766",
    "beneficiary_name": "Maria Silva",
    "currency": "BRL"
  },
  "amount": {
    "value": "500.00",
    "currency": "USD"
  },
  "sender": {
    "name": "John Smith",
    "email": "john@email.com",
    "kyc_verified": true,
    "kyc_provider": "partner"
  },
  "recipient": {
    "name": "Maria Silva",
    "relationship": "mother"
  },
  "execution": {
    "type": "immediate"
  }
}

// Response
{
  "settlement_id": "stl_remit_456",
  "status": "processing",
  "source": {
    "method": "card",
    "amount": "500.00 USD",
    "card_last4": "4242"
  },
  "destination": {
    "rail": "pix",
    "amount": "2875.00 BRL",
    "fx_rate": "5.75"
  },
  "fees": {
    "partner_fee": "5.00 USD",
    "payos_fee": "2.50 USD"
  },
  "net_to_recipient": "2875.00 BRL",
  "estimated_arrival": "2025-12-26T15:35:00Z",
  "tracking": {
    "url": "https://track.payos.io/stl_remit_456",
    "sms_sent": true
  }
}
```

---

### Use Case 6: Creator/Freelancer Payouts

**Scenario:** Platform pays 500 creators across LATAM weekly.

```javascript
POST /v1/payouts/batch
{
  "batch_id": "creator_payout_w52",
  "source": {
    "type": "platform_balance",
    "platform_id": "platform_creator_app"
  },
  "payouts": [
    {
      "recipient_id": "creator_br_001",
      "destination": {
        "type": "pix",
        "pix_key": "creator1@email.com"
      },
      "amount": { "value": "150.00", "currency": "USD" },
      "metadata": { "earnings_period": "2025-W51" }
    },
    {
      "recipient_id": "creator_mx_002",
      "destination": {
        "type": "spei",
        "clabe": "012180001234567890"
      },
      "amount": { "value": "320.00", "currency": "USD" },
      "metadata": { "earnings_period": "2025-W51" }
    }
    // ... 498 more creators
  ],
  "notifications": {
    "email": true,
    "sms": true,
    "template": "creator_payment_received"
  }
}
```

---

## Protocol Abstraction Layer

The API abstracts protocol complexity. Callers don't need to know if they're using x402, AP2, or direct rails:

```javascript
// Simple: Just tell us source, destination, amount
POST /v1/settlements
{
  "source": { ... },
  "destination": { ... },
  "amount": { ... }
}

// PayOS figures out:
// - Best protocol (x402 for micro, AP2 for mandated, direct for bulk)
// - Best rail (Pix vs SPEI vs stablecoin)
// - Best route (lowest cost, fastest)
// - Compliance requirements
```

**Protocol Selection Logic:**

```
IF amount < $5 AND destination is crypto-native
  → Use x402 (micropayments)

ELSE IF mandate exists AND amount within limits
  → Use AP2 (pre-authorized)

ELSE IF destination is LATAM bank account
  → Use Circle CPN (Pix/SPEI)

ELSE IF destination is stablecoin wallet
  → Use direct on-chain transfer

ELSE
  → Fall back to traditional rails (SWIFT/ACH)
```

---

## AI-Native Features (from PRD v1.14)

### Simulation Engine (Epic 28)

Dry-run any settlement before execution:

```javascript
POST /v1/settlements/simulate
{
  "source": { ... },
  "destination": { ... },
  "amount": { ... }
}

// Response
{
  "simulation_id": "sim_abc123",
  "would_succeed": true,
  "estimated_outcome": {
    "source_debit": "50000.00 USD",
    "destination_credit": "1025000.00 MXN",
    "fx_rate": "20.50",
    "fees": "125.00 USD",
    "settlement_time": "~10 minutes"
  },
  "warnings": [],
  "blockers": []
}
```

### Structured Responses (Epic 30)

Machine-parseable errors with recovery actions:

```javascript
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "category": "funding",
    "message": "Treasury account has insufficient funds",
    "details": {
      "required": "50000.00 USD",
      "available": "35000.00 USD",
      "shortfall": "15000.00 USD"
    },
    "suggested_actions": [
      {
        "action": "fund_account",
        "description": "Add funds to treasury account",
        "endpoint": "POST /v1/accounts/{id}/fund"
      },
      {
        "action": "reduce_amount",
        "description": "Reduce settlement amount",
        "max_amount": "35000.00 USD"
      }
    ],
    "retry_guidance": {
      "retryable": true,
      "after_action": "fund_account"
    }
  }
}
```

### Context API (Epic 31)

"Tell me everything about X" endpoints:

```javascript
GET /v1/context/accounts/acct_123

// Response
{
  "account": { ... },
  "balances": { ... },
  "recent_settlements": [ ... ],
  "pending_settlements": [ ... ],
  "compliance_status": { ... },
  "linked_agents": [ ... ],
  "limits": { ... }
}
```

### Tool Discovery (Epic 32)

Machine-readable capability catalog for agent platforms:

```javascript
GET /v1/capabilities

// Response
{
  "capabilities": [
    {
      "name": "settlement",
      "description": "Move money from source to destination",
      "endpoint": "POST /v1/settlements",
      "schema": { ... },
      "limits": {
        "min_amount": "1.00 USD",
        "max_amount": "100000.00 USD"
      }
    },
    {
      "name": "quote",
      "description": "Get FX quote for settlement",
      "endpoint": "POST /v1/quotes",
      "schema": { ... }
    }
    // ... more capabilities
  ],
  "openapi_url": "https://api.payos.io/openapi.json",
  "llm_function_schemas": {
    "openai": "https://api.payos.io/schemas/openai.json",
    "anthropic": "https://api.payos.io/schemas/anthropic.json"
  }
}
```

---

## Integration with Procurement AI

**Monq Integration:**

```
Monq Agent                    PayOS
     │                          │
     │ Negotiation complete     │
     │ Deal approved            │
     │                          │
     │ POST /v1/settlements     │
     │ (with monq_deal_id)      │
     │─────────────────────────>│
     │                          │ Validate
     │                          │ Convert FX
     │                          │ Settle via SPEI
     │                          │
     │ Webhook: completed       │
     │<─────────────────────────│
     │                          │
     │ Update deal status       │
     │ Send to ERP              │
```

**Mercanis Integration:**

```
Mercanis                      PayOS
     │                          │
     │ Weekly batch ready       │
     │                          │
     │ POST /v1/settlements/    │
     │       simulate (batch)   │
     │─────────────────────────>│
     │                          │
     │ Simulation results       │
     │<─────────────────────────│
     │                          │
     │ Approve batch            │
     │                          │
     │ POST /v1/settlements/    │
     │       batch              │
     │─────────────────────────>│
     │                          │
     │ Batch processing...      │
     │                          │
     │ Webhooks per settlement  │
     │<─────────────────────────│
```

---

## Implementation Status (from PRD v1.16)

### Completed
- **Phase 1-2:** Foundation epics (1-16) fully implemented
- **Phase 3:** Multi-protocol infrastructure complete
- **Epic 17:** Multi-Protocol Gateway ✅ (53 points, 12 stories)
  - Full x402 implementation
  - Complete AP2 mandate system
  - Full ACP checkout system
  - Cross-protocol analytics

### Current
- **Phase 3.5:** External sandbox integrations (Circle, Coinbase, Google, Stripe)
- **Epic 27:** Settlement Infrastructure Hardening (29 points, high priority)

### Next
- **Phase 4:** Customer validation
- **Phase 5:** Production hardening
- **Phase 6:** AI-Native infrastructure (Epics 28-35, 158 points)

---

## Sources

- PayOS PRD v1.16 (Master)
- Epic 17: Multi-Protocol Gateway (Complete)
- Epic 27: Settlement Infrastructure Hardening
- Technical design discussions
- API design patterns
- Procurement AI integration analysis
