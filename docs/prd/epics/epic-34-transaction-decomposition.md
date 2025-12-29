# Epic 34: Transaction Decomposition 📦

**Status:** Pending
**Phase:** AI-Native Enhancement
**Priority:** P1
**Total Points:** 14
**Stories:** 0/4 Complete
**Dependencies:** None
**Enables:** Partial refunds, Split payments

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Support line-item level operations on transfers for partial refunds, chargebacks, and split payments.

---

## Data Model

```sql
CREATE TABLE transfer_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id),
  line_number INTEGER NOT NULL,
  description TEXT,
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  refunded_amount DECIMAL(20,8) DEFAULT 0,
  disputed_amount DECIMAL(20,8) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_items_transfer ON transfer_line_items(transfer_id);
```

---

## API Usage

**Create transfer with line items:**
```json
POST /v1/transfers
{
  "amount": "5000.00",
  "currency": "USD",
  "line_items": [
    { "description": "Software License", "amount": "3000.00" },
    { "description": "Implementation Services", "amount": "1500.00" },
    { "description": "Training", "amount": "500.00" }
  ]
}
```

**Partial refund by line item:**
```json
POST /v1/refunds
{
  "transfer_id": "txn_123",
  "type": "partial",
  "line_items": [
    { "line_number": 3, "amount": "500.00", "reason": "training_cancelled" }
  ]
}
```

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 34.1 | 3 | P1 | Line items data model |
| 34.2 | 3 | P1 | Create transfer with line items |
| 34.3 | 5 | P1 | Partial refund by line item |
| 34.4 | 3 | P2 | Line item level disputes |
| **Total** | **14** | | **0/4 Complete** |

---

## Use Cases

### E-Commerce Platform
- Refund specific items from multi-item order
- Track which items were disputed
- Split settlement between multiple merchants

### SaaS Billing
- Itemize subscription components
- Prorate refunds for specific features
- Track usage per feature

### Procurement
- Track individual purchase order line items
- Partial refunds for damaged/missing items
- Approval workflows at line item level

---

## Technical Deliverables

### Database Migrations
- `20XX_create_transfer_line_items.sql`

### API Routes
- Update `apps/api/src/routes/transfers.ts` - Line item support
- Update `apps/api/src/routes/refunds.ts` - Line item refunds

### UI Components
- `apps/web/src/components/transfer-line-items/` - Line item display/editor

---

## Success Criteria

- ✅ Transfers support optional line items
- ✅ Line items sum to transfer total
- ✅ Partial refunds by line item work
- ✅ Line item tracking in disputes
- ✅ Dashboard UI shows line item breakdowns

---

## Related Documentation

- **Epic 5:** Refunds System (integration point)
- **Epic 6:** Disputes System (integration point)
