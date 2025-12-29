# Epic 33: Metadata Schema 🏷️

**Status:** Pending
**Phase:** AI-Native Enhancement
**Priority:** P1
**Total Points:** 11
**Stories:** 0/4 Complete
**Dependencies:** None
**Enables:** Accounting integration, ERP exports

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Allow partners to define custom fields on any entity that flow through to exports and integrations.

---

## Use Cases

| Industry | Custom Fields |
|----------|---------------|
| Accounting | `gl_code`, `cost_center`, `department`, `fiscal_period` |
| Procurement | `po_number`, `vendor_code`, `budget_line`, `project_id` |
| Payroll | `employee_id`, `pay_period`, `payroll_run_id` |
| CS | `ticket_id`, `refund_reason_code`, `agent_id` |

---

## API Usage

**Define schema:**
```json
POST /v1/metadata-schemas
{
  "entity_type": "transfer",
  "name": "procurement_fields",
  "fields": [
    { "key": "po_number", "type": "string", "required": true, "pattern": "^PO-[0-9]{6}$" },
    { "key": "gl_code", "type": "string", "enum": ["1000", "2000", "3000"] },
    { "key": "department", "type": "string" }
  ]
}
```

**Use in transfer:**
```json
POST /v1/transfers
{
  "from_account_id": "acc_123",
  "amount": "5000.00",
  "currency": "USD",
  "metadata": {
    "po_number": "PO-123456",
    "gl_code": "2000",
    "department": "Engineering"
  }
}
```

---

## Data Model

```sql
CREATE TABLE metadata_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL, -- 'transfer', 'account', 'refund'
  name TEXT NOT NULL,
  fields JSONB NOT NULL, -- Array of field definitions
  required_on_create BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, name)
);
```

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 33.1 | 3 | P1 | Metadata schema CRUD API |
| 33.2 | 3 | P1 | Metadata validation on entity creation |
| 33.3 | 3 | P1 | Metadata in export templates |
| 33.4 | 2 | P2 | Dashboard metadata schema builder |
| **Total** | **11** | | **0/4 Complete** |

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/metadata-schemas.ts`

### Validation
- `apps/api/src/services/metadata-validator.ts` - Schema validation logic

### Export Integration
- Update export templates to include custom metadata fields

### UI Components
- `apps/web/src/app/dashboard/settings/metadata-schemas/` - Schema builder UI

---

## Success Criteria

- ✅ Partners can define custom schemas via API
- ✅ Validation enforced on entity creation
- ✅ Custom fields appear in exports
- ✅ Dashboard UI for schema management
- ✅ Documentation includes integration examples

---

## Related Documentation

- **Epic 7:** Exports System (integration point)
- **Epic 30:** Structured Response System (validation errors)
