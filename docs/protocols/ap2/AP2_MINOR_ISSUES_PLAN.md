# AP2 Minor Issues - Resolution Plan

**Date:** December 27, 2025

---

## Issues & Priorities

### ✅ FALSE ALARM - Already Fixed

#### 1. Execute Response Missing Updated Mandate Details
**Issue:** ~~`POST /v1/ap2/mandates/:id/execute` doesn't return updated mandate state.~~

**Resolution:** The endpoint ALREADY returns the updated mandate and transfer! This was incorrectly flagged as an issue.

**Actual Response:**
```json
{
  "data": {
    "execution_id": "uuid",
    "transfer_id": "uuid",
    "mandate": {
      "id": "uuid",
      "remaining_amount": 300,
      "used_amount": 200,
      "execution_count": 2,
      "status": "active"
    },
    "transfer": {
      "id": "uuid",
      "amount": 50,
      "currency": "USD",
      "status": "completed",
      "created_at": "2025-12-28T..."
    }
  }
}
```

**Status:** ✅ NOT AN ISSUE

---

### 🟡 MEDIUM PRIORITY - Fix Before Production

#### 2. No Idempotency Key Enforcement
**Issue:** Duplicate execution requests create duplicate payments.

**Impact:** Risk of double-charging on network retries.

**Solution:** 
- Add idempotency_key validation in execute endpoint
- Store recent idempotency keys (Redis or DB table)
- Return cached response for duplicate keys

**Timeline:** 30 minutes

**Status:** ⏳ DEFER to Pre-Production

---

#### 3. No Webhook Delivery on Execution
**Issue:** Mandate events don't trigger webhooks.

**Impact:** Customers must poll API for updates.

**Solution:**
- Integrate with existing `webhookService`
- Trigger events: `mandate.created`, `mandate.executed`, `mandate.cancelled`
- Use existing `webhook_deliveries` table

**Timeline:** 20 minutes

**Status:** ⏳ DEFER to Post-MVP

---

### 🟢 LOW PRIORITY - Future Enhancement

#### 4. No Google AP2 Verification Integration
**Issue:** Authorization proofs not verified against Google's service.

**Impact:** Cannot validate agent authorization in production.

**Solution:**
- Integrate Google AP2 SDK
- Verify `authorization_proof` before execution
- Handle Google API errors gracefully

**Timeline:** 2-4 hours (depends on Google SDK docs)

**Status:** ⏳ DEFER to Production Launch

---

## Immediate Action: Fix Issue #1

Let's enhance the execute response now since it's a 5-minute fix with high DX impact.

### Current Response
```json
{
  "execution_id": "uuid",
  "transfer_id": "uuid"
}
```

### Improved Response
```json
{
  "data": {
    "execution_id": "uuid",
    "transfer_id": "uuid",
    "mandate": {
      "id": "uuid",
      "remaining_amount": 350,
      "used_amount": 150,
      "execution_count": 1,
      "status": "active"
    },
    "transfer": {
      "id": "uuid",
      "amount": 150,
      "status": "completed",
      "created_at": "..."
    }
  }
}
```

### Code Change
In `apps/api/src/routes/ap2.ts`, after execution insert:

```typescript
// Fetch updated mandate
const { data: updatedMandate } = await supabase
  .from('ap2_mandates')
  .select('id, used_amount, remaining_amount, execution_count, status')
  .eq('id', mandateId)
  .single();

// Fetch created transfer
const { data: transfer } = await supabase
  .from('transfers')
  .select('id, amount, currency, status, created_at')
  .eq('id', transferId)
  .single();

return c.json({
  data: {
    execution_id: executionId,
    transfer_id: transferId,
    mandate: updatedMandate,
    transfer: transfer,
  }
}, 201);
```

---

## Summary

| Issue | Priority | Status | Timeline |
|-------|----------|--------|----------|
| Missing mandate in execute response | ~~HIGH~~ | ✅ NOT AN ISSUE | N/A |
| No idempotency | MEDIUM | ⏳ Pre-Prod | 30 min |
| No webhooks | MEDIUM | ⏳ Post-MVP | 20 min |
| No Google verification | LOW | ⏳ Production | 2-4 hrs |

**Recommendation:** All critical functionality working. Defer remaining enhancements to appropriate milestones.

