# PayOS Three-Layer Architecture

**Status:** Reference Document
**Created:** January 20, 2026
**Last Updated:** January 20, 2026

[← Back to Architecture Overview](./README.md)

---

## Overview

PayOS implements a three-layer architecture that separates concerns between commerce protocols, ledger operations, and settlement execution. This design enables:

- **Protocol Agnosticism:** Support x402, AP2, ACP, UCP without changing core infrastructure
- **Settlement Flexibility:** Configure when and how money moves externally
- **Audit Transparency:** Every money movement is a Transfer with full audit trail
- **Handler Pluggability:** Merchants bring their own payment processors

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROTOCOLS (Commerce Layer)                            │
│                                                                             │
│  x402: Micropayments for API access                                         │
│  AP2: Mandate-based recurring payments                                      │
│  ACP: Agent commerce (Stripe/OpenAI compatible)                             │
│  UCP: Universal commerce (checkout, orders, identity linking)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          Creates Transfers ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TRANSFERS (Ledger Layer)                            │
│                                                                             │
│  Every money movement is a Transfer:                                        │
│  - Internal: Wallet A → Wallet B (instant, no fees)                        │
│  - Protocol creates transfer, doesn't care about settlement                 │
│  - Audit trail for every transaction                                       │
│  - Transfers are the universal building block                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                  Triggered by rules (not protocols) ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT RAILS (Execution Layer)                        │
│                                                                             │
│  Only when moving money OUT of PayOS:                                      │
│  - Internal (ledger-only, no external movement)                            │
│  - ACH (US bank accounts)                                                  │
│  - Pix (Brazil instant)                                                    │
│  - SPEI (Mexico)                                                           │
│  - Wire (International)                                                    │
│  - Circle USDC (On-chain)                                                  │
│                                                                             │
│  Triggered by:                                                             │
│  - Schedule (daily at 5pm)                                                 │
│  - Threshold (when balance > $10,000)                                      │
│  - Manual (user requests withdrawal)                                       │
│  - Immediate (certain transfer types)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. Protocols Create Transfers Only

Protocols (x402, AP2, ACP, UCP) are responsible for:
- Authentication and authorization
- Business logic (mandates, checkouts, micropayments)
- Creating Transfer records in the ledger

Protocols do NOT:
- Call settlement directly
- Decide how/when external payouts happen
- Manage payment handler credentials

### 2. Transfers are the Universal Primitive

Every money movement creates a Transfer record:

| Transfer Type | Description |
|---------------|-------------|
| `internal` | Wallet-to-wallet within PayOS |
| `protocol_payment` | Payment via x402/AP2/ACP/UCP |
| `settlement_out` | External payout (Pix/SPEI/ACH) |
| `settlement_in` | External deposit |

### 3. Settlement Triggered by Rules, Not Protocols

Settlement happens when triggered by:

| Trigger Type | Example |
|--------------|---------|
| `schedule` | Daily at 5pm UTC |
| `threshold` | Balance exceeds $10,000 |
| `manual` | User clicks "Withdraw" |
| `immediate` | Payout transfer type |

### 4. Payment Handlers are Pluggable

Merchants connect their own processors:

| Handler | Use Case |
|---------|----------|
| Stripe | Credit cards, global payments |
| PayPal | Consumer payments |
| PayOS-native | Pix (Brazil), SPEI (Mexico) |

---

## Example Workflows

### x402 Micropayment (No External Settlement)

```
1. Consumer calls API with x402 payment header
2. PayOS verifies payment, creates Transfer:
   - From: Consumer Wallet
   - To: Provider Wallet
   - Type: x402_payment
3. Provider receives funds instantly
4. No external settlement (internal ledger movement)
```

### Provider Withdrawal (Manual Settlement)

```
1. Provider clicks "Withdraw $100"
2. PayOS creates Transfer:
   - From: Provider Wallet
   - To: Settlement Holding
   - Type: withdrawal_request
3. Settlement rule triggers:
   - Type: manual
   - Rail: ACH (US bank)
4. External payout executed
5. Transfer marked as settled
```

### Auto-Consolidation (Threshold Settlement)

```
1. User wallet balance reaches $1,000
2. Settlement rule triggers:
   - Type: threshold
   - Condition: balance > $1000
   - Rail: internal_consolidation
3. Transfer created:
   - From: User Wallet
   - To: Master Treasury
   - Type: auto_consolidation
4. Later: Batch settlement from Master Treasury
```

### Cross-Border Payout (AP2 Mandate)

```
1. Company has AP2 mandate for contractor payments
2. Mandate execution triggers Transfer:
   - From: Company Wallet
   - To: Contractor Wallet
   - Type: ap2_mandate_execution
3. Contractor requests Pix withdrawal
4. Settlement rule triggers:
   - Type: manual (or immediate if configured)
   - Rail: pix
5. Pix payout executed to Brazilian bank
```

---

## Business Model

### PayOS = Payment Orchestration Platform

PayOS acts as the orchestration layer between AI agents and payment infrastructure:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MERCHANT INTEGRATION                         │
│                                                                     │
│  1. Merchant integrates PayOS SDK (one integration)                 │
│  2. Merchant connects their processor accounts:                     │
│     - Stripe account → Credit cards globally                        │
│     - PayPal account → Consumer payments                            │
│     - OR PayOS-native → Pix/SPEI directly                           │
│  3. Buyers choose payment method at checkout                        │
│  4. PayOS routes to correct processor using merchant's credentials  │
│  5. Funds go to merchant (PayOS doesn't hold funds for cards)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Merchant-Owned Accounts Model

| Scenario | How It Works |
|----------|--------------|
| Card Payment via Stripe | Funds → Merchant's Stripe account |
| PayPal Payment | Funds → Merchant's PayPal account |
| Pix Payment (PayOS-native) | Option A: Funds → PayOS → Merchant (via settlement) |
|  | Option B: Funds → Merchant's Pix keys directly |

### PayOS-Native Options

For markets without established processors, PayOS provides native rails:

| Rail | Market | Provider |
|------|--------|----------|
| Pix | Brazil | Circle / Direct banking |
| SPEI | Mexico | Circle / Direct banking |
| USDC | Global | Circle (on-chain) |

---

## Implementation Reference

### Relevant Epics

| Epic | Purpose |
|------|---------|
| [Epic 48: Connected Accounts](../prd/epics/epic-48-connected-accounts.md) | Payment handler management |
| [Epic 49: Protocol Discovery](../prd/epics/epic-49-protocol-discovery.md) | Protocol registry & enablement |
| [Epic 50: Settlement Decoupling](../prd/epics/epic-50-settlement-decoupling.md) | Settlement trigger rules |
| [Epic 51: Unified Onboarding](../prd/epics/epic-51-unified-onboarding.md) | Protocol-specific onboarding |

### Key Files

| Component | Location |
|-----------|----------|
| Transfer Service | `apps/api/src/services/transfers/` |
| Settlement Service | `apps/api/src/services/settlements/` |
| Protocol Routes | `apps/api/src/routes/{x402,ap2,acp,ucp}.ts` |
| Handler Registry | `apps/api/src/services/handlers/` (planned) |

---

## Related Documentation

- [Epic 27: Settlement Infrastructure](../prd/epics/epic-27-settlement.md)
- [Epic 43: UCP Integration](../prd/epics/epic-43-ucp-integration.md)
- [PRD Master](../prd/PayOS_PRD_Master.md)

---

*Created: January 20, 2026*
