# Epic 35: Entity Onboarding API 🚀

**Status:** Pending
**Phase:** AI-Native Enhancement
**Priority:** P1
**Total Points:** 14
**Stories:** 0/4 Complete
**Dependencies:** Epic 2 (Account System)
**Enables:** Procurement, Payroll integrations

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Single-call vendor/customer onboarding with verification.

---

## API Usage

**Onboard new entity:**
```json
POST /v1/accounts/onboard
{
  "type": "business",
  "business_name": "Brazilian Supplier Ltd",
  "country": "BR",
  "tax_id": "12.345.678/0001-90",
  "payment_methods": [
    { "type": "pix", "pix_key_type": "cnpj", "pix_key": "12345678000190" }
  ],
  "verification": {
    "skip_kyb": false,
    "documents": [
      { "type": "cnpj_card", "url": "https://..." }
    ]
  },
  "metadata": {
    "vendor_code": "SUPP-001",
    "payment_terms": "net30"
  }
}
```

**Response:**
```json
{
  "account_id": "acc_new",
  "status": "pending_verification",
  "verification": {
    "kyb_status": "in_progress",
    "estimated_completion": "2025-12-29T10:00:00Z"
  },
  "payment_methods": [
    { "id": "pm_1", "type": "pix", "status": "verified" }
  ],
  "ready_for_payments": false,
  "ready_for_payments_after": "kyb_completed"
}
```

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 35.1 | 5 | P1 | Unified onboarding endpoint |
| 35.2 | 3 | P1 | Pix key verification integration |
| 35.3 | 3 | P1 | CLABE verification integration |
| 35.4 | 3 | P2 | Document upload and processing |
| **Total** | **14** | | **0/4 Complete** |

---

## Use Cases

### Procurement Platform
```typescript
// Onboard new vendor in single call
const vendor = await payos.accounts.onboard({
  type: 'business',
  business_name: 'Acme Supplies',
  country: 'MX',
  tax_id: 'ABC123456789',
  payment_methods: [
    { type: 'spei', clabe: '012345678901234567' }
  ],
  metadata: {
    vendor_code: 'V-1234',
    payment_terms: 'net30',
    category: 'office_supplies'
  }
});

// Check status
if (vendor.ready_for_payments) {
  // Can pay immediately
} else {
  // Wait for verification webhook
}
```

### Payroll System
```typescript
// Onboard new employee
const employee = await payos.accounts.onboard({
  type: 'person',
  first_name: 'João',
  last_name: 'Silva',
  country: 'BR',
  tax_id: '123.456.789-00',
  payment_methods: [
    { type: 'pix', pix_key_type: 'cpf', pix_key: '12345678900' }
  ],
  metadata: {
    employee_id: 'EMP-5678',
    department: 'engineering',
    hire_date: '2025-01-15'
  }
});
```

---

## Technical Deliverables

### API Routes
- `POST /v1/accounts/onboard` - Unified onboarding endpoint

### Services
- `apps/api/src/services/entity-onboarding.ts` - Onboarding orchestration
- `apps/api/src/services/payment-method-verification.ts` - PIX/CLABE verification

### External Integrations
- PIX key verification API
- CLABE verification API
- Document verification service

---

## Success Criteria

- ✅ Single API call creates account + payment methods
- ✅ PIX key verification works automatically
- ✅ CLABE verification works automatically
- ✅ Document upload supported
- ✅ Webhook notification when ready for payments

---

## Related Documentation

- **Epic 2:** Account System (prerequisite)
- **Epic 8:** Payment Methods (integration point)
