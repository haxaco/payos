# Category 4: Remittance & Money Transfer

**Last Updated:** January 2026  
**Profiles:** 3  
**Monthly Volume Range:** $5M - $100M  
**Primary Protocols:** Direct API

---

## Category Overview

Companies focused on cross-border consumer money transfer. High volume, small amounts, speed-critical.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $50 - $1,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | 20,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time, peaks on paydays |
| **Corridors** | US → LATAM primary |
| **Key Need** | Speed, cost, reliability |
| **Protocols** | Direct API |

### Why They Need PayOS
- Speed is the primary differentiator
- FX rates determine competitiveness
- Reliability affects user trust
- Each basis point matters at scale
- Compliance is table stakes

---

## Profile 4.1: Consumer Remittance App

**Profile Name:** `remittance_consumer_app`

### Description
Mobile app for consumer remittances. Focus on specific diaspora community (e.g., Hispanic in US sending to Mexico/Central America).

### Business Model
- FX margin (1-3%)
- Flat fee ($2-5 per transaction)
- Premium tiers (lower fees, higher limits)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $50M |
| Avg Transaction | $250 - $400 |
| Transactions/Month | 30,000 - 150,000 |
| Peak Times | Fridays, 15th, 30th of month |
| Repeat Rate | 70%+ monthly |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 70% | USD → MXN |
| US → Guatemala | 15% | USD → GTQ |
| US → El Salvador | 10% | USD → USD |
| Other | 5% | USD → Various |

### Pain Points
1. Current provider is slow (24h+)
2. FX rates not competitive (losing to Wise)
3. Can't offer instant delivery
4. Limited to few countries
5. No debit card collection (ACH only)

### PayOS Integration
```
API Flow:
1. POST /v1/quotes (display to user in real-time)
2. POST /v1/collections/card (debit card collection)
3. POST /v1/settlements (execute payout)
4. GET /v1/settlements/{id}/track (real-time tracking)
5. Webhooks for push notifications
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Standard remittance | $300 Houston → Guadalajara | SPEI delivery in <10 min |
| 2 | Card collection | Visa debit card payment | Collected, settlement initiated |
| 3 | Peak load | 3,000 transactions in 2 hours | All processed, <15 min avg |
| 4 | Cash pickup | $200 to Oxxo location | Pickup code generated, ready in 30 min |

### Seed Data Requirements
- 1 partner account
- 10,000 sender accounts (US-based, Hispanic demographic)
- 10,000 recipient accounts (Mexico, Guatemala, El Salvador)
- 200,000 historical remittances
- Peak load scenarios (Friday 5-8pm, paydays)
- Various delivery methods (bank, cash pickup, mobile wallet)

### Sample Entities

**Partner Account:**
```json
{
  "name": "SendHome Inc",
  "type": "remittance_consumer_app",
  "tier": "growth",
  "monthly_volume_usd": 12000000,
  "primary_corridors": ["US-MX", "US-GT", "US-SV"],
  "integration_type": "api",
  "features": ["quotes", "card_collection", "settlements", "tracking", "cash_pickup"]
}
```

**Sample Remittance:**
```json
{
  "remittance_id": "rem_2026_00001",
  "sender": {
    "id": "snd_00001",
    "name": "Juan Martinez",
    "city": "Houston",
    "state": "TX",
    "phone": "+1-713-555-0123"
  },
  "recipient": {
    "name": "Maria Martinez",
    "city": "Guadalajara",
    "country": "MX",
    "delivery_method": "spei",
    "clabe": "012320001234567890"
  },
  "amount_usd": 300,
  "amount_mxn": 5145,
  "fx_rate": 17.15,
  "fee_usd": 3.99,
  "purpose": "family_support"
}
```

---

## Profile 4.2: Corridor Specialist

**Profile Name:** `remittance_corridor_specialist`

### Description
Focused on specific high-volume corridor with deep local expertise. Partners with local agents, banks, mobile money operators.

### Business Model
- FX margin (0.5-1.5%)
- Agent commissions (revenue share)
- B2B wholesale (to smaller MTOs)
- Premium services (large transfers)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $30M - $100M |
| Avg Transaction | $200 - $600 |
| Transactions/Month | 80,000 - 250,000 |
| B2B Portion | 30% (wholesale to agents) |
| Consumer Portion | 70% (direct) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 100% | USD → BRL |

### Pain Points
1. Pix delivery speed is table stakes now
2. B2B partners demand wholesale rates
3. Compliance costs are significant
4. Agent network management is complex
5. Cash-out options still needed in some regions

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (consumer payout)
2. POST /v1/settlements/wholesale (B2B batch)
3. POST /v1/cashout/locations (cash pickup network)
4. GET /v1/compliance/brazil (regulatory requirements)
5. GET /v1/analytics/corridor (corridor performance)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Pix delivery | $500 US → Brazil | Pix in <5 min |
| 2 | Wholesale batch | Agent batch, 500 transactions | Wholesale rate applied, batch processed |
| 3 | Cash pickup | $300 to Banco do Brasil | Pickup ready in 1 hour |
| 4 | High value | $5,000 transfer (requires docs) | Compliance flow triggered, docs collected |

### Seed Data Requirements
- 1 partner account
- 5 B2B agent/partner accounts
- 20,000 sender accounts (US-based)
- 20,000 recipient accounts (Brazil)
- 500,000 historical transactions
- Wholesale pricing tiers
- Agent performance data

### Sample Entities

**Partner Account:**
```json
{
  "name": "BrazilDirect Remit",
  "type": "remittance_corridor_specialist",
  "tier": "enterprise",
  "monthly_volume_usd": 65000000,
  "primary_corridors": ["US-BR"],
  "integration_type": "api",
  "features": ["settlements", "wholesale", "cash_pickup", "compliance", "analytics"]
}
```

**Sample B2B Partner:**
```json
{
  "partner_id": "agent_br_001",
  "name": "CasaCambio Network",
  "type": "agent_network",
  "monthly_volume_usd": 8000000,
  "pricing_tier": "wholesale_gold",
  "fx_margin": 0.35,
  "settlement_frequency": "daily"
}
```

**Sample High-Value Transaction:**
```json
{
  "transaction_id": "txn_hv_00001",
  "amount_usd": 7500,
  "compliance_status": "documents_required",
  "required_documents": ["source_of_funds", "id_verification"],
  "documents_received": ["id_verification"],
  "status": "pending_compliance"
}
```

---

## Profile 4.3: Digital-First Money Transfer

**Profile Name:** `remittance_digital_first`

### Description
Tech-first money transfer targeting younger demographics. Mobile-native, social features, gamification, crypto options.

### Business Model
- Freemium (first transfer free)
- FX margin (0.5-2%)
- Premium subscriptions
- Referral bonuses
- Crypto on/off ramp

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Transaction | $150 - $300 |
| Transactions/Month | 25,000 - 80,000 |
| User Demographics | 18-35, mobile-native |
| Crypto % | 15% prefer stablecoin option |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USD → MXN |
| US → Colombia | 25% | USD → COP |
| US → Brazil | 25% | USD → BRL |

### Pain Points
1. Need instant for young users (Venmo/Zelle expectations)
2. Want crypto/stablecoin option
3. Social features need payment integration
4. Gamification requires micro-rewards
5. Traditional branding doesn't resonate

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (fiat transfer)
2. POST /v1/settlements/stablecoin (USDC option)
3. POST /v1/rewards (micro-reward credits)
4. POST /v1/referrals/{code}/credit (referral bonus)
5. Webhooks for social features (send notifications)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Instant transfer | $200 US → Mexico | SPEI in <5 min |
| 2 | Stablecoin option | $100 as USDC to recipient wallet | USDC delivered to wallet address |
| 3 | Referral reward | Friend signs up, first transfer | $5 bonus credited to both |
| 4 | Social send | Send to contact, with message | Notification + delivery + message |

### Seed Data Requirements
- 1 partner account
- 15,000 user accounts (young demographic, tech-savvy)
- Social graph data (connections, referrals)
- 150,000 historical transactions
- Gamification data (streaks, rewards, levels)
- Crypto wallet addresses (15% of users)

### Sample Entities

**Partner Account:**
```json
{
  "name": "ZapRemit",
  "type": "remittance_digital_first",
  "tier": "growth",
  "monthly_volume_usd": 8000000,
  "primary_corridors": ["US-MX", "US-CO", "US-BR"],
  "integration_type": "api",
  "features": ["settlements", "stablecoin", "rewards", "referrals", "social"]
}
```

**Sample User:**
```json
{
  "user_id": "usr_zap_00001",
  "name": "Alex Ramirez",
  "age": 24,
  "city": "Los Angeles",
  "joined": "2025-06-15",
  "transfers_count": 18,
  "referrals_count": 5,
  "crypto_enabled": true,
  "usdc_address": "0x1234...abcd",
  "level": "gold",
  "streak_days": 45
}
```

**Sample Social Transfer:**
```json
{
  "transfer_id": "txn_social_00001",
  "sender_id": "usr_zap_00001",
  "recipient_contact": "+52-555-123-4567",
  "amount_usd": 150,
  "message": "Happy birthday! 🎂",
  "delivery_method": "spei",
  "social_share": true
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 4.1 | `remittance_consumer_app` | $10-50M | $250-400 | Mobile-first, card collection |
| 4.2 | `remittance_corridor_specialist` | $30-100M | $200-600 | B2B wholesale, corridor expertise |
| 4.3 | `remittance_digital_first` | $5-20M | $150-300 | Crypto option, social features |

---

## Integration Priority

For PayOS development, prioritize these features for Category 4:

1. **Settlement API** — Critical for all profiles
2. **Real-time Tracking** — Critical for all profiles
3. **Quote API** — Critical for 4.1, 4.3
4. **Card Collection** — Important for 4.1
5. **Wholesale/B2B Pricing** — Critical for 4.2
6. **Cash Pickup Network** — Important for 4.1, 4.2
7. **Stablecoin Option** — Important for 4.3
8. **Social/Gamification** — Nice-to-have for 4.3
9. **Compliance Flow** — Critical for 4.2

---

## Speed Benchmarks

For remittance category, speed is the key differentiator:

| Delivery Method | Target Time | Acceptable |
|-----------------|-------------|------------|
| Pix (Brazil) | <5 min | <15 min |
| SPEI (Mexico) | <5 min | <15 min |
| Bank Transfer | <1 hour | <4 hours |
| Cash Pickup | <30 min | <2 hours |
| Mobile Wallet | <5 min | <15 min |

---

## Compliance Requirements

### US (Sender Side)
- FinCEN MSB registration
- State money transmitter licenses
- BSA/AML compliance
- OFAC screening

### Mexico (Receiver Side)
- CNBV registration (for large volumes)
- UIF reporting requirements
- PLD (AML) compliance

### Brazil (Receiver Side)
- BCB registration considerations
- SPSAV license (for large volumes, post-Feb 2026)
- Monthly reporting requirements

### General
- Transaction monitoring
- Suspicious activity reporting
- Customer identification program
- Record keeping (5+ years)
