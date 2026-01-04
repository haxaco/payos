# Investigation: Chargeback-Free Value Proposition

**Status:** 📋 Discussion Needed  
**Related Epics:** Epic 10 (PSP Table Stakes), Epic 30 (Structured Responses)  
**Priority:** P1 (marketing/positioning) / P2 (technical implementation)

---

## Context

From Obsidian research notes on stablecoin infrastructure:

> "No chargeback risk" is cited as a fundamental advantage over credit cards and bank transfers. This is a major PSP selling point that could differentiate PayOS from traditional payment processors.

## The Opportunity

### Traditional Payment Chargeback Reality

| Rail | Chargeback Window | Dispute Rate | Merchant Risk |
|------|-------------------|--------------|---------------|
| Credit Cards | 120 days | 0.5-1.5% | High |
| ACH/Bank Transfer | 60 days | 0.1-0.3% | Medium |
| Wire Transfer | Limited | <0.1% | Low |
| **Stablecoin** | **None** | **0%** | **None** |

### PayOS Current Positioning

**Current:** We have disputes functionality (Epic 10) but position similarly to traditional PSPs.

**Opportunity:** Emphasize settlement finality as core differentiator.

---

## Discussion Points

### 1. Is "No Chargebacks" Accurate?

**Technically Yes:**
- Stablecoin transfers on blockchain are irreversible
- Once confirmed, the transaction cannot be reversed by the sender
- No 120-day fraud window like credit cards

**But Consider:**
- PayOS still supports refunds (voluntary merchant-initiated)
- PayOS still supports disputes (customer service resolution)
- Regulatory requirements may mandate some recourse

**Question for Diego:** How do we message this accurately without overpromising?

### 2. Who Cares About Chargebacks?

**High-Value Targets:**
- High-risk merchants (gambling, adult, crypto)
- Subscription businesses (friendly fraud is rampant)
- Digital goods sellers (no physical proof of delivery)
- Cross-border merchants (higher fraud rates)
- Marketplace operators (two-sided dispute complexity)

**Less Relevant For:**
- Low-ticket B2B transactions
- Recurring payroll (no dispute expectation)
- Agent-to-agent payments (no human disputes)

**Question for Diego:** Which customer segments are we targeting first?

### 3. Technical Implementation Options

#### Option A: Add to Structured Responses (Minimal)

Add settlement finality indicators to Epic 30 responses:

```json
{
  "settlement": {
    "finality": "irreversible",
    "finality_type": "blockchain",
    "confirmation_block": 12345678,
    "chargeback_eligible": false,
    "dispute_window_hours": null
  }
}
```

**Effort:** 2-3 hours (part of Epic 30)

#### Option B: Settlement Finality API (Medium)

New endpoint explaining settlement characteristics:

```
GET /v1/rails/:rail/characteristics
```

Response:
```json
{
  "rail": "pix",
  "settlement_finality": "immediate",
  "reversibility": "none",
  "chargeback_risk": 0,
  "regulatory_recourse": "bcb_mediation",
  "typical_settlement_time_seconds": 10
}
```

**Effort:** 1-2 days

#### Option C: Marketing/Docs Only (No Code)

Update positioning in:
- Landing page
- API documentation
- Sales materials
- Developer guides

**Effort:** Marketing exercise, no engineering

### 4. Messaging Considerations

**Strong Claims (Accurate):**
- "Settlement is final once confirmed on blockchain"
- "No 120-day fraud window"
- "Merchant-friendly payment finality"
- "Eliminate chargeback fees"

**Claims to Avoid:**
- "No refunds ever" (we support voluntary refunds)
- "No disputes" (we have dispute resolution)
- "Zero risk" (regulatory/compliance risks exist)

**Nuanced Positioning:**
> "With stablecoin settlement, your payments are final. Unlike credit cards with 120-day chargeback windows, blockchain transactions cannot be reversed by the payer. You control refunds—they're never forced."

---

## Proposed Action

### Immediate (P1): Add to Epic 30

Add `settlement.finality` fields to structured responses as part of Epic 30 work. Minimal effort, immediate value.

**Suggested Story Addition:**

```markdown
### Story 30.X: Settlement Finality Indicators (Temporary)

**Points:** 1
**Priority:** P1
**Dependencies:** Story 30.2 (Response Wrapper)

#### Description

Add settlement finality information to transfer responses, highlighting the chargeback-free nature of stablecoin settlements.

#### Response Fields

Add to transfer responses:
```json
{
  "settlement": {
    "finality": "irreversible" | "reversible",
    "finality_type": "blockchain" | "ach" | "wire",
    "confirmation_block": 12345678,
    "chargeback_eligible": false,
    "chargeback_window_hours": null,
    "refund_eligible": true,
    "refund_window_hours": 720  // 30 days for voluntary refunds
  }
}
```

#### Acceptance Criteria

- [ ] Transfer responses include settlement.finality object
- [ ] Blockchain settlements show finality: "irreversible"
- [ ] Chargeback fields clearly indicate zero chargeback risk
- [ ] Refund eligibility separate from chargeback eligibility
```

### Later (P2): Rail Characteristics API

If customer demand validates, build dedicated endpoint for rail comparison.

### Marketing: Parallel Track

Work with Federico/Simu on positioning materials that leverage this differentiator.

---

## Questions for Discussion

1. **Target Segment:** Which customer type cares most about chargebacks?
2. **Messaging Tone:** How aggressive should we be in claims?
3. **Regulatory Reality:** Any LATAM-specific considerations for Pix/SPEI?
4. **Competitive Intel:** How do DolarApp/Felix position this?

---

## Decision

**Pending discussion with Diego**

Options:
- [ ] Add to Epic 30 as Story 30.X (minimal effort)
- [ ] Create separate investigation for rail characteristics
- [ ] Marketing-only approach (no code changes)
- [ ] Defer until customer validation

---

## Related Documents

- [Epic 10: PSP Table Stakes](../epics/epic-10-psp-table-stakes.md)
- [Epic 30: Structured Response System](../epics/epic-30-structured-response.md)
- [Obsidian: Stablecoin Infrastructure Notes](../../investigations/stablecoin-infrastructure.md)
