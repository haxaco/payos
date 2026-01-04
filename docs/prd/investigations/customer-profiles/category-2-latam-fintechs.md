# Category 2: LATAM Fintechs

**Last Updated:** January 2026  
**Profiles:** 4  
**Monthly Volume Range:** $5M - $300M  
**Primary Protocols:** Direct API, x402, AP2

---

## Category Overview

Financial technology companies based in or focused on Latin America. Need cross-border capabilities, local rail integration, and agentic payment features.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $50 - $50,000 |
| **Monthly Volume** | $10M - $500M |
| **Frequency** | 10,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time, on-demand |
| **Corridors** | US → LATAM, EU → LATAM, Intra-LATAM |
| **Key Need** | White-label, instant settlement, competitive FX |
| **Protocols** | Direct API, x402 |

### Why They Need PayOS
- Cross-border is expensive to build from scratch
- Correspondent banking relationships take 12+ months
- Users expect instant (Pix/SPEI speed)
- Need competitive FX to compete with Wise/Remitly
- Want to add agentic features without building infrastructure

---

## Profile 2.1: Digital Bank / Neobank

**Profile Name:** `latam_neobank`

### Description
Mobile-first digital bank serving consumers. Pix/SPEI native for domestic, launching cross-border remittance and B2B services.

### Business Model
- Transaction fees (0.5-1.5%)
- Premium subscriptions
- Interchange revenue
- Float income

### Transaction Profile
| Metric | Value |
|--------|-------|
| Domestic Volume | $100M - $300M/month |
| Cross-Border Target | $10M - $30M/month |
| Avg Transaction | $200 - $500 (remittance) |
| Transactions/Month | 50,000 - 150,000 (cross-border) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 60% | USD → BRL |
| EU → Brazil | 25% | EUR → BRL |
| Other LATAM → Brazil | 15% | Various → BRL |

### Pain Points
1. Building cross-border is 12+ months
2. Correspondent banking is expensive
3. Need instant delivery (users expect Pix speed)
4. Compliance burden for international
5. Can't compete on FX rates

### PayOS Integration
```
API Flow:
1. POST /v1/quotes (FX quote for user display)
2. POST /v1/settlements (execute transfer)
3. GET /v1/settlements/{id}/track (real-time status)
4. Webhooks for app notifications
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Consumer remittance | $500 from Miami to São Paulo | Pix delivered in <10 min |
| 2 | Quote display | $1,000 USD → BRL quote request | Rate, fees, ETA displayed |
| 3 | Peak load | 5,000 transactions in 1 hour | All processed, <15 min avg delivery |
| 4 | Failed Pix key | Invalid CPF format | Clear error, correction flow, retry |

### Seed Data Requirements
- 1 partner account (the neobank)
- 10,000 sender accounts (US-based customers)
- 10,000 recipient accounts (Brazil-based)
- 100,000 historical remittances
- Peak load scenarios (Friday evenings, paydays)
- Failure scenarios (invalid Pix, limits, compliance holds)

### Sample Entities

**Partner Account:**
```json
{
  "name": "PixelPay S.A.",
  "type": "latam_neobank",
  "tier": "enterprise",
  "monthly_volume_usd": 15000000,
  "primary_corridors": ["US-BR", "EU-BR"],
  "integration_type": "white_label",
  "features": ["quotes", "settlements", "tracking", "webhooks"]
}
```

**Sample Remittance:**
```json
{
  "sender": {
    "name": "Maria Garcia",
    "country": "US",
    "state": "FL"
  },
  "recipient": {
    "name": "Ana Garcia",
    "country": "BR",
    "pix_key": "ana.garcia@email.com",
    "pix_key_type": "email"
  },
  "amount_usd": 500,
  "purpose": "family_support"
}
```

---

## Profile 2.2: Digital Wallet

**Profile Name:** `latam_wallet`

### Description
Mobile wallet for payments, P2P transfers, and merchant payments. Strong domestic presence, adding international features.

### Business Model
- Merchant fees (1.5-2.5%)
- P2P fees (free domestic, fee for international)
- Float income
- Premium features

### Transaction Profile
| Metric | Value |
|--------|-------|
| Domestic Volume | $50M - $150M/month |
| Cross-Border Target | $5M - $15M/month |
| Avg Transaction | $50 - $200 |
| Transactions/Month | 200,000 - 500,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 70% | USD → MXN |
| Mexico → US | 20% | MXN → USD |
| Other | 10% | Various |

### Pain Points
1. International P2P is clunky
2. Merchant settlement for cross-border is slow
3. Users want to hold USD
4. No crypto/stablecoin option
5. Compliance for international limits growth

### PayOS Integration
```
API Flow:
1. POST /v1/wallets (user wallet creation)
2. POST /v1/transfers (P2P international)
3. POST /v1/settlements (merchant settlement)
4. GET /v1/wallets/{id}/balance (multi-currency)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | International P2P | $100 US wallet → MX wallet | Instant wallet credit |
| 2 | USD hold | User holds $500 USD in wallet | Balance shown in USD, no auto-convert |
| 3 | Merchant settlement | MX merchant, $10K daily volume | SPEI next-day settlement |
| 4 | Stablecoin option | User prefers USDC | USDC credited to wallet address |

### Seed Data Requirements
- 1 partner account
- 20,000 user wallet accounts (mix of US and MX)
- 5,000 merchant accounts (MX-based)
- 500,000 historical transactions
- Multi-currency balances

### Sample Entities

**Partner Account:**
```json
{
  "name": "QuickPay Wallet",
  "type": "latam_wallet",
  "tier": "growth",
  "monthly_volume_usd": 8000000,
  "primary_corridors": ["US-MX", "MX-US"],
  "integration_type": "api",
  "features": ["wallets", "p2p", "merchant_settlement", "multi_currency"]
}
```

**Sample Wallet:**
```json
{
  "user_id": "usr_wallet_12345",
  "balances": {
    "USD": 250.00,
    "MXN": 5000.00,
    "USDC": 100.00
  },
  "country": "MX",
  "kyc_level": "full"
}
```

---

## Profile 2.3: Crypto Exchange (B2B Focus)

**Profile Name:** `latam_crypto_exchange`

### Description
Crypto exchange with strong B2B services: treasury management, cross-border payments, stablecoin on/off ramps for fintechs.

### Business Model
- Trading fees (0.1-0.5%)
- B2B service fees
- Spread on stablecoin conversion
- API access tiers

### Transaction Profile
| Metric | Value |
|--------|-------|
| B2B Volume | $100M - $300M/month |
| Avg Transaction | $10,000 - $50,000 |
| Transactions/Month | 5,000 - 15,000 |
| Client Type | Fintechs, remittance cos, corporates |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USDC → MXN |
| US → Brazil | 30% | USDC → BRL |
| Intra-LATAM | 20% | USDC → Various |

### Pain Points
1. B2B clients want multi-protocol support (x402, AP2)
2. No AP2 mandate support for recurring payments
3. Each integration is custom
4. Agentic commerce clients need flexibility
5. Want to white-label settlement for their clients

### PayOS Integration
```
API Flow:
1. POST /v1/x402/endpoints (register x402 services)
2. POST /v1/ap2/mandates (mandate management)
3. POST /v1/settlements (fiat off-ramp)
4. POST /v1/agents (agent wallet management)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | x402 API payment | 0.05 USDC per API call | Micro-payment processed, balance updated |
| 2 | AP2 mandate | $50K/month supplier mandate | Mandate created, monthly auto-execution |
| 3 | Bulk off-ramp | $500K USDC → MXN | SPEI delivery in <30 min |
| 4 | Agent wallet | Provision for client's AI agent | Wallet created, spending limits set |

### Seed Data Requirements
- 1 partner account (the exchange)
- 50 B2B client accounts
- 200 agent wallets
- 20,000 x402 transactions
- 100 AP2 mandates
- Off-ramp history

### Sample Entities

**Partner Account:**
```json
{
  "name": "CryptoMex Exchange",
  "type": "latam_crypto_exchange",
  "tier": "enterprise",
  "monthly_volume_usd": 120000000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "multi_protocol",
  "features": ["x402", "ap2", "settlements", "agent_wallets"]
}
```

**Sample B2B Client:**
```json
{
  "name": "RemitFast Inc",
  "type": "remittance_company",
  "monthly_volume_usd": 5000000,
  "corridors": ["US-MX"],
  "services": ["usdc_onramp", "mxn_offramp", "api_access"]
}
```

---

## Profile 2.4: Lending Platform

**Profile Name:** `latam_lending_platform`

### Description
Digital lending platform: personal loans, SMB lending, BNPL. Need disbursement and collection capabilities.

### Business Model
- Interest income (15-40% APR)
- Origination fees (1-5%)
- Late fees
- Insurance products

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Disbursements | $20M - $60M |
| Monthly Collections | $18M - $55M |
| Avg Disbursement | $2,000 - $10,000 |
| Transactions/Month | 10,000 - 30,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Domestic Brazil | 50% | BRL |
| Domestic Mexico | 40% | MXN |
| Cross-border (diaspora) | 10% | USD → BRL/MXN |

### Pain Points
1. Disbursement speed affects conversion
2. Collection costs are high
3. Cross-border diaspora loans are complex
4. Reconciliation is manual
5. No real-time payment status

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (bulk disbursements)
2. POST /v1/collections (set up collection)
3. Webhooks for payment confirmations
4. GET /v1/reconciliation (daily reports)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Bulk disbursement | 500 loans approved, $3M total | All disbursed via Pix in 2 hours |
| 2 | Instant disbursement | Single $5K loan approved | Pix in <5 min |
| 3 | Collection setup | Monthly payment $500 x 12 months | Mandate created, auto-debit scheduled |
| 4 | Diaspora loan | US borrower, disbursement to BR family | Cross-border disbursement, compliant |

### Seed Data Requirements
- 1 partner account (lending platform)
- 20,000 borrower accounts
- 50,000 loan records
- Disbursement and collection history
- Repayment schedules
- Default scenarios

### Sample Entities

**Partner Account:**
```json
{
  "name": "CreditoRapido",
  "type": "latam_lending_platform",
  "tier": "growth",
  "monthly_volume_usd": 35000000,
  "primary_corridors": ["domestic-BR", "domestic-MX", "US-BR"],
  "integration_type": "api",
  "features": ["batch_disbursement", "collections", "reconciliation"]
}
```

**Sample Loan:**
```json
{
  "loan_id": "loan_br_2026_00001",
  "borrower_id": "bor_12345",
  "principal_brl": 5000,
  "term_months": 12,
  "monthly_payment_brl": 485,
  "disbursement_method": "pix",
  "collection_method": "pix_mandate",
  "status": "active"
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 2.1 | `latam_neobank` | $10-30M | $200-500 | White-label remittance, instant Pix |
| 2.2 | `latam_wallet` | $5-15M | $50-200 | Multi-currency wallets, P2P |
| 2.3 | `latam_crypto_exchange` | $100-300M | $10K-50K | Multi-protocol, B2B services |
| 2.4 | `latam_lending_platform` | $20-60M | $2K-10K | Disbursement, collections |

---

## Integration Priority

For PayOS development, prioritize these features for Category 2:

1. **Settlement API** — Core for all profiles
2. **Quote API** — Critical for 2.1, 2.2
3. **Real-time Tracking** — Critical for 2.1, 2.2
4. **x402 Protocol** — Important for 2.3
5. **AP2 Mandates** — Important for 2.3
6. **Agent Wallets** — Important for 2.3
7. **Batch Disbursement** — Critical for 2.4
8. **Collections/Mandates** — Critical for 2.4
9. **Multi-currency Wallets** — Important for 2.2
