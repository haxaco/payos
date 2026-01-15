# Story 28.5: Refund Simulation - Summary

**Status:** ✅ Complete  
**Points:** 2  
**Completed:** January 4, 2026

## What Was Built

Comprehensive refund simulation with eligibility validation, balance impact preview, and cumulative refund tracking.

## Key Achievements

✅ **Eligibility Validation**: Transfer status, 30-day window, amount limits  
✅ **Balance Impact Preview**: Shows before/after for both accounts  
✅ **Cumulative Tracking**: Tracks already-refunded amounts  
✅ **Intelligent Warnings**: Large partial refunds, expiring windows  
✅ **10 Integration Tests**: All passing, comprehensive coverage

## API Endpoint

```
POST /v1/simulate
{
  "action": "refund",
  "payload": {
    "transfer_id": "txn_abc",
    "amount": "50.00",  // Optional
    "reason": "customer_request"
  }
}
```

## Response Preview

```json
{
  "refund": {
    "refund_type": "partial",
    "refund_amount": "50.00"
  },
  "impact": {
    "source_account": {
      "balance_before": "27997.00",
      "balance_after": "28047.00"  // +50
    },
    "destination_account": {
      "balance_before": "30462.00",
      "balance_after": "30412.00"  // -50
    }
  },
  "eligibility": {
    "can_refund": true,
    "window_expires": "2026-02-03T04:12:56Z"
  },
  "original_transfer": {
    "amount": "100.00",
    "already_refunded": "0.00",
    "remaining_refundable": "100.00"
  }
}
```

## Validation Rules

- **30-day refund window** from original transfer
- **Cannot exceed** remaining refundable amount
- **Destination must have** sufficient balance
- **Transfer must be** in refundable status

## Use Cases

1. **Customer Requests**: Preview refund before processing
2. **Duplicate Payments**: Auto-detect and refund
3. **Fraud Prevention**: Quick refund of suspicious transactions
4. **Service Issues**: Partial refunds for complaints

## Files Changed

- `apps/api/src/routes/simulations.ts` - Refund simulation logic
- `apps/api/tests/integration/refund-simulation.test.ts` - 10 integration tests

## Next: Story 28.6

Stream Simulation - Project streaming payment costs over time.



