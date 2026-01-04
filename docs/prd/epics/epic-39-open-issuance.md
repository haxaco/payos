# Epic 39: Open Issuance — Custom Stablecoin Support

**Status:** 📋 Future Consideration  
**Phase:** Future (Post-PMF)  
**Priority:** P3  
**Total Points:** TBD  
**Stories:** TBD  
**Dependencies:** Epic 17 (Multi-Protocol Gateway), Epic 27 (Settlement Infrastructure)  
**Enables:** Partner yield capture, custom stablecoin settlement, ecosystem expansion

[← Back to Epic List](./README.md)

---

## Executive Summary

**The Trend:** Bridge's platform lets partners create their own stablecoins to capture ~4% yield on reserves. "Open issuance" means stablecoin creation is becoming accessible to any fintech.

**The Opportunity:** PayOS could settle custom partner stablecoins, not just USDC/USDT, enabling partners to capture yield while using PayOS for LATAM rails.

**The Question:** Should PayOS support settlement of partner-issued stablecoins?

---

## Background: The Open Issuance Movement

### From Obsidian Research

> "Bridge's platform lets partners create own stablecoins to capture 4% yield"

> "Multiple stablecoins coexisting" is the future — PayOS's protocol-agnostic approach aligns

### Current Stablecoin Economics

| Issuer | Model | Yield to Partners |
|--------|-------|-------------------|
| **Tether** | "0/100 hedge fund" — keeps all yield | 0% |
| **Circle** | Some yield sharing programs | 1-2% |
| **Bridge** | Partners issue, partners keep yield | ~4% |
| **Paxos** | White-label stablecoin | ~3.5% |

### Why Partners Want Custom Stablecoins

1. **Yield Capture:** 4% APY on reserves vs 0%
2. **Brand Control:** "AcmeDollars" vs generic USDC
3. **Regulatory Arbitrage:** Issue in favorable jurisdiction
4. **Lock-in:** Users hold partner tokens, not transferable

---

## The PayOS Opportunity

### Current State

```
Partner → PayOS → USDC Settlement → Circle → Pix/SPEI
                   ↑
            Only USDC/USDT supported
```

### Future State (with Open Issuance)

```
Partner → PayOS → Partner Stablecoin → Circle/Bridge → Pix/SPEI
                   ↑
            Any supported stablecoin
            (USDC, USDT, PartnerUSD, etc.)
```

### Value Proposition

**For Partners:**
- Keep 4% yield on reserves
- Use PayOS for LATAM settlement
- Best of both worlds

**For PayOS:**
- Increased partner stickiness
- New revenue stream (stablecoin conversion fees)
- Ecosystem expansion (more stablecoins = more volume)

---

## Technical Considerations

### Asset Registry Architecture

```sql
-- Extensible stablecoin registry
CREATE TABLE supported_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),  -- null = globally supported
  
  -- Asset identification
  asset_symbol TEXT NOT NULL,        -- 'USDC', 'PartnerUSD', etc.
  asset_name TEXT,
  contract_address TEXT,             -- For custom stablecoins
  chain TEXT NOT NULL,               -- 'base', 'ethereum', 'solana'
  
  -- Issuer info
  issuer TEXT NOT NULL,              -- 'circle', 'paxos', 'partner', etc.
  issuer_type TEXT,                  -- 'regulated', 'partner', 'algorithmic'
  
  -- Configuration
  decimals INTEGER DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  requires_conversion BOOLEAN,       -- Need to convert before offramp?
  conversion_pair TEXT,              -- e.g., 'PartnerUSD/USDC'
  
  -- Settlement support
  settlement_supported BOOLEAN DEFAULT true,
  min_settlement_amount NUMERIC,
  max_settlement_amount NUMERIC,
  
  -- Compliance
  compliance_tier TEXT,              -- 'standard', 'enhanced', 'restricted'
  restricted_regions TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asset_symbol, chain, tenant_id)
);

-- Asset conversion routes
CREATE TABLE asset_conversion_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_asset_id UUID REFERENCES supported_assets(id),
  to_asset_id UUID REFERENCES supported_assets(id),
  
  -- Conversion method
  conversion_method TEXT,            -- 'dex', 'atomic_swap', 'issuer_redemption'
  conversion_provider TEXT,          -- 'uniswap', 'circle', 'bridge'
  
  -- Pricing
  estimated_slippage_bps INTEGER,
  max_slippage_bps INTEGER,
  fee_bps INTEGER,
  
  -- Limits
  min_amount NUMERIC,
  max_amount NUMERIC,
  daily_limit NUMERIC,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Settlement Flow with Custom Stablecoin

```
1. Partner sends PartnerUSD to PayOS
2. PayOS checks supported_assets registry
3. If requires_conversion = true:
   a. Find conversion route (PartnerUSD → USDC)
   b. Execute conversion via DEX/issuer
   c. Record conversion in transfer metadata
4. Proceed with standard USDC → Pix/SPEI flow
5. Charge conversion fee (if applicable)
```

### API Changes

```typescript
// POST /v1/settlements (enhanced)
{
  "amount": "1000.00",
  "source_asset": "PartnerUSD",      // NEW: Specify source asset
  "destination_currency": "BRL",
  "destination_rail": "pix",
  "recipient": {
    "pix_key": "joao@email.com"
  },
  "conversion_preferences": {        // NEW: Conversion options
    "max_slippage_bps": 50,
    "preferred_route": "issuer_redemption"  // vs 'dex'
  }
}

// Response includes conversion details
{
  "settlement_id": "stl_123",
  "source_asset": "PartnerUSD",
  "converted_to": "USDC",            // NEW
  "conversion_rate": "1.0001",       // NEW
  "conversion_fee_usd": "0.50",      // NEW
  "final_amount_usd": "999.50",
  ...
}
```

---

## Implementation Phases

### Phase 1: Asset Registry (Foundation)

| Story | Points | Description |
|-------|--------|-------------|
| 39.1 | 3 | Create supported_assets table and API |
| 39.2 | 2 | Add asset validation to settlement flow |
| 39.3 | 2 | Dashboard asset configuration UI |

**Outcome:** PayOS can track multiple assets per tenant, but still only settles USDC.

### Phase 2: Circle-Supported Assets

| Story | Points | Description |
|-------|--------|-------------|
| 39.4 | 3 | Add EURC support (Circle's Euro stablecoin) |
| 39.5 | 3 | Add asset-specific settlement routes |
| 39.6 | 2 | FX between stablecoin pairs (USDC↔EURC) |

**Outcome:** PayOS can settle Circle-issued stablecoins directly.

### Phase 3: Partner Stablecoins (DEX Conversion)

| Story | Points | Description |
|-------|--------|-------------|
| 39.7 | 5 | DEX integration for stablecoin conversion |
| 39.8 | 3 | Slippage protection and routing |
| 39.9 | 3 | Conversion fee configuration |

**Outcome:** PayOS can accept any stablecoin, convert to USDC via DEX, then settle.

### Phase 4: Issuer Redemption

| Story | Points | Description |
|-------|--------|-------------|
| 39.10 | 5 | Bridge integration for issuer redemption |
| 39.11 | 3 | Paxos integration for USDP redemption |
| 39.12 | 2 | Issuer selection logic |

**Outcome:** PayOS can redeem partner stablecoins directly with issuers (better rates than DEX).

### Phase 5: Partner Issuance Integration

| Story | Points | Description |
|-------|--------|-------------|
| 39.13 | 5 | Bridge API integration for stablecoin creation |
| 39.14 | 3 | Partner stablecoin dashboard |
| 39.15 | 3 | Compliance framework for custom stablecoins |

**Outcome:** Partners can issue stablecoins through PayOS (advanced).

**Total Estimated Points:** 47

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DEX slippage on conversion | Medium | Medium | Max slippage limits, issuer redemption preference |
| Liquidity fragmentation | Medium | Medium | Focus on high-liquidity pairs |
| Smart contract risk (custom stables) | Low | High | Only support audited, regulated stablecoins |
| Bridge/Paxos API changes | Low | Medium | Abstract issuer integrations |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regulatory scrutiny | Medium | High | Focus on regulated issuers (Bridge, Paxos) |
| Partner stablecoin failure | Low | Medium | Require insurance/reserves disclosure |
| Complexity overhead | Medium | Medium | Phase implementation, start simple |

### Compliance Risks

| Risk | Mitigation |
|------|------------|
| Money transmission for conversion | Use licensed DEX aggregators |
| Know Your Token (KYT) | Require issuer compliance attestation |
| Regional restrictions | Asset-level region blocking |

---

## Decision Framework

### Pursue Open Issuance IF:

1. **Partner Demand:** Multiple partners request custom stablecoin support
2. **Yield Pressure:** Partners leave for platforms offering yield
3. **Market Maturity:** Bridge/Paxos white-label becomes mainstream
4. **Regulatory Clarity:** Clear guidance on stablecoin conversion

### Don't Pursue IF:

1. **No Demand:** Partners satisfied with USDC-only
2. **Complexity Aversion:** Partners prefer simplicity over yield
3. **Regulatory Risk:** Conversion creates licensing requirements
4. **Circle Dominance:** Circle's yield sharing makes custom stables unnecessary

---

## Market Intelligence Questions

1. **Bridge Adoption:** How many fintechs are using Bridge for white-label stablecoins?
2. **Yield Sensitivity:** How much does 4% yield matter to target partners?
3. **Competitor Support:** Do competitors (Conduit, Sphere) support custom stablecoins?
4. **Circle Roadmap:** Will Circle offer yield sharing to compete?

---

## Recommendation

**Status: P3 — Future Consideration**

**Current Action:**
- Monitor Bridge and open issuance trends
- Track partner requests for custom stablecoin support
- Design asset registry as foundation (can be useful for EURC even without full open issuance)

**Revisit When:**
- 3+ partners request custom stablecoin support
- Bridge reaches significant adoption (100+ issuers)
- Circle yield sharing doesn't satisfy partner needs

---

## Related Documents

- [Epic 17: Multi-Protocol Gateway](./epic-17-multi-protocol.md)
- [Epic 27: Settlement Infrastructure](./epic-27-settlement.md)
- [Obsidian: Stablecoin Infrastructure Research](../investigations/stablecoin-infrastructure.md)
- [Bridge Documentation](https://bridge.xyz/docs)
- [Paxos Stablecoin-as-a-Service](https://paxos.com/stablecoin-as-a-service/)
