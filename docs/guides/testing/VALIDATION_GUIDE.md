# x402 Validation Guide - How to Verify Everything

**Purpose:** Independent verification of deployment, bug fixes, and system state  
**Date:** December 23, 2025

---

## 🔍 Quick Health Check (5 minutes)

### 1. Verify Balances Are Correct

```sql
-- Run in Supabase SQL Editor
SELECT 
  'Balance Verification' as check_name,
  (SELECT balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a') as consumer_balance,
  (100.00 - (SELECT balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a')) as consumer_spent,
  (SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') as provider_balance,
  CASE 
    WHEN (SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') > 0 
    THEN '✅ PROVIDER WALLET FUNDED'
    ELSE '❌ STILL ZERO'
  END as provider_status;
```

**Expected Results:**
- `consumer_balance`: ~$99.908
- `consumer_spent`: ~$0.092
- `provider_balance`: ~$0.0893 (should be > 0!)
- `provider_status`: ✅ PROVIDER WALLET FUNDED

---

### 2. Verify Settlement Function Exists

```sql
-- Check database function
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'settle_x402_payment'
  AND routine_schema = 'public';
```

**Expected Results:**
- `routine_name`: settle_x402_payment
- `routine_type`: FUNCTION
- `data_type`: json

**If empty:** Function not created, migration needs to be applied

---

### 3. Check Recent Transactions

```sql
-- Get last 5 x402 payments
SELECT 
  t.created_at,
  t.amount,
  t.fee_amount,
  t.status,
  t.settled_at IS NOT NULL as is_settled,
  from_acc.name as from_account,
  to_acc.name as to_account
FROM transfers t
LEFT JOIN accounts from_acc ON from_acc.id = t.from_account_id
LEFT JOIN accounts to_acc ON to_acc.id = t.to_account_id
WHERE t.type = 'x402'
ORDER BY t.created_at DESC
LIMIT 5;
```

**What to Check:**
- ✅ `status`: 'completed'
- ✅ `is_settled`: true
- ✅ `fee_amount`: Should be ~2.9% of amount

---

## 🧪 Test New Payment (10 minutes)

### Step 1: Record Initial State

```bash
# Get current balances
curl "http://localhost:4000/v1/wallets/d199d814-5f53-4300-b1c8-81bd6ce5f00a" \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
  | jq '.data.balance'

curl "http://localhost:4000/v1/wallets/7a1fa1b0-95a7-4b68-812c-fd7cf3504c13" \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
  | jq '.data.balance'
```

**Record these values:**
- Consumer before: `_____________`
- Provider before: `_____________`

---

### Step 2: Make a Test Payment

```bash
# Start the sample consumer (makes 1 payment)
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --forecast
```

**Expected Output:**
```
✅ Payment successful!
Amount: $0.001
```

---

### Step 3: Verify Provider Got Paid

```bash
# Check balances again
curl "http://localhost:4000/v1/wallets/d199d814-5f53-4300-b1c8-81bd6ce5f00a" \
  -H "Authorization: Bearer pk_test_..." | jq '.data.balance'
# Should decrease by $0.001

curl "http://localhost:4000/v1/wallets/7a1fa1b0-95a7-4b68-812c-fd7cf3504c13" \
  -H "Authorization: Bearer pk_test_..." | jq '.data.balance'
# Should INCREASE by ~$0.00097 (after 2.9% fee) ← KEY CHECK!
```

**Critical Validation:**
```
Consumer after: _____________
Provider after: _____________

Consumer change: Consumer_before - Consumer_after = $0.001 ✅
Provider change: Provider_after - Provider_before = ~$0.00097 ✅

If provider didn't increase → Bug still exists!
```

---

### Step 4: Check Database Records

```sql
-- Get the payment you just made
SELECT 
  t.id,
  t.created_at,
  t.amount,
  t.fee_amount,
  (t.amount::numeric - t.fee_amount::numeric) as net_to_provider,
  t.status,
  t.settled_at,
  t.x402_metadata->>'request_id' as request_id
FROM transfers t
WHERE t.type = 'x402'
  AND t.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY t.created_at DESC
LIMIT 1;
```

**Validate:**
- ✅ `amount`: 0.001
- ✅ `fee_amount`: ~0.000029 (2.9% of $0.001)
- ✅ `net_to_provider`: ~0.000971
- ✅ `status`: 'completed'
- ✅ `settled_at`: NOT NULL (has timestamp)

---

## 📊 Complete Money Flow Validation

### Validate ALL Historic Transactions

```sql
-- Complete audit: Money in = Money out
WITH totals AS (
  SELECT 
    -- Consumer side
    (100.00 - (SELECT balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a')) as consumer_spent,
    
    -- Provider side
    (SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') as provider_received,
    
    -- Transfer records
    (SELECT SUM(amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed' AND from_account_id = 'f9c37b69-26d8-4a66-a91e-18e77c8e566f') as transfers_claim,
    
    -- Fees
    (SELECT SUM(fee_amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed' AND from_account_id = 'f9c37b69-26d8-4a66-a91e-18e77c8e566f') as fees_collected
)
SELECT 
  consumer_spent,
  provider_received,
  fees_collected,
  (provider_received + fees_collected) as total_accounted,
  consumer_spent - (provider_received + fees_collected) as discrepancy,
  CASE 
    WHEN ABS(consumer_spent - (provider_received + fees_collected)) < 0.01 
    THEN '✅ BALANCED'
    ELSE '❌ DISCREPANCY: ' || (consumer_spent - (provider_received + fees_collected))::text
  END as status
FROM totals;
```

**Expected Results:**
- `discrepancy`: < $0.01 (nearly zero)
- `status`: ✅ BALANCED

**If discrepancy > $0.01:** Something went wrong with backfill

---

## 🔬 Deep Validation Queries

### 1. Check All Provider Wallets

```sql
-- See all providers and what they're owed vs what they have
SELECT 
  a.name as provider_name,
  w.id as wallet_id,
  w.balance as current_balance,
  w.currency,
  COUNT(t.id) as payment_count,
  SUM(t.amount::numeric - COALESCE(t.fee_amount::numeric, 0)) as should_have_received,
  w.balance::numeric - SUM(t.amount::numeric - COALESCE(t.fee_amount::numeric, 0)) as variance
FROM accounts a
JOIN wallets w ON w.owner_account_id = a.id
LEFT JOIN transfers t ON t.to_account_id = a.id AND t.type = 'x402' AND t.status = 'completed'
WHERE EXISTS (
  SELECT 1 FROM transfers t2 WHERE t2.to_account_id = a.id AND t2.type = 'x402'
)
GROUP BY a.name, w.id, w.balance, w.currency
ORDER BY payment_count DESC;
```

**What to Check:**
- Each provider's `current_balance` should roughly equal `should_have_received`
- `variance` should be small (< $0.01)

---

### 2. Validate Settlement Timestamps

```sql
-- Check that all completed transfers have settlement timestamps
SELECT 
  COUNT(*) as total_completed,
  COUNT(settled_at) as have_settled_at,
  COUNT(*) - COUNT(settled_at) as missing_settled_at,
  CASE 
    WHEN COUNT(*) = COUNT(settled_at) THEN '✅ ALL SETTLED'
    ELSE '⚠️ ' || (COUNT(*) - COUNT(settled_at))::text || ' MISSING TIMESTAMPS'
  END as status
FROM transfers
WHERE type = 'x402'
  AND status = 'completed';
```

**Expected:**
- `missing_settled_at`: 0
- `status`: ✅ ALL SETTLED

---

### 3. Check Fee Calculations

```sql
-- Verify fees are correctly calculated (should be ~2.9%)
SELECT 
  COUNT(*) as payments_with_fees,
  AVG((fee_amount::numeric / amount::numeric) * 100) as avg_fee_percentage,
  MIN((fee_amount::numeric / amount::numeric) * 100) as min_fee_percentage,
  MAX((fee_amount::numeric / amount::numeric) * 100) as max_fee_percentage,
  CASE 
    WHEN AVG((fee_amount::numeric / amount::numeric) * 100) BETWEEN 2.8 AND 3.0 
    THEN '✅ CORRECT (2.9%)'
    ELSE '⚠️ UNEXPECTED: ' || AVG((fee_amount::numeric / amount::numeric) * 100)::text || '%'
  END as status
FROM transfers
WHERE type = 'x402'
  AND status = 'completed'
  AND amount::numeric > 0
  AND fee_amount::numeric > 0;
```

**Expected:**
- `avg_fee_percentage`: ~2.9
- `status`: ✅ CORRECT (2.9%)

---

## 🚀 Performance Validation

### Test Payment Latency

```bash
#!/bin/bash
# Save as test-payment-latency.sh

echo "Testing x402 payment latency (10 payments)..."

for i in {1..10}; do
  START=$(date +%s%3N)
  
  cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
  pnpm dev --forecast > /dev/null 2>&1
  
  END=$(date +%s%3N)
  LATENCY=$((END - START))
  
  echo "Payment $i: ${LATENCY}ms"
done
```

**Expected Results:**
- Average latency: < 200ms
- Max latency: < 300ms
- Success rate: 100%

**Target (with optimizations):**
- Average: ~115ms
- p95: < 150ms

---

## 🐛 Troubleshooting

### Problem: Provider wallet still $0.00 after new payment

**Diagnosis:**
```sql
-- Check if function is being called
SELECT 
  t.id,
  t.status,
  t.settled_at,
  t.settlement_metadata
FROM transfers t
WHERE t.type = 'x402'
  AND t.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY t.created_at DESC
LIMIT 1;
```

**If `settled_at` is NULL:**
- Settlement function not being called
- Check API logs for errors

**If `settled_at` has timestamp but provider wallet unchanged:**
- Function might have wrong wallet ID
- Check `x402_metadata->>'provider_wallet_id'` in transfer

---

### Problem: Balances don't match

**Check transfer records:**
```sql
SELECT 
  'Consumer payments' as type,
  COUNT(*) as count,
  SUM(amount::numeric) as total
FROM transfers
WHERE type = 'x402'
  AND status = 'completed'
  AND from_account_id = 'f9c37b69-26d8-4a66-a91e-18e77c8e566f'

UNION ALL

SELECT 
  'Consumer wallet change' as type,
  1 as count,
  (100.00 - (SELECT balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a')) as total;
```

**Expected:** Both totals should match (or be very close)

---

### Problem: Function doesn't exist

**Apply migration:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/api

# Via Supabase MCP (if you have it)
# Or manually copy from:
cat supabase/migrations/20241223_batch_settlement_function.sql

# Then run in Supabase SQL Editor
```

---

## 📋 Validation Checklist

### Pre-Production
- [ ] Database function exists (`settle_x402_payment`)
- [ ] Provider wallets have been backfilled (balance > 0)
- [ ] All completed transfers have `settled_at` timestamps
- [ ] Money flow is balanced (consumer = provider + fees)
- [ ] Fees are calculated correctly (~2.9%)

### Post-Production
- [ ] Made test payment
- [ ] Consumer wallet decreased by payment amount
- [ ] **Provider wallet increased** (critical!)
- [ ] Transfer record created with fees
- [ ] Settlement timestamp populated
- [ ] Average latency < 200ms

### Long-term Monitoring
- [ ] Check provider balances daily
- [ ] Verify money flow stays balanced
- [ ] Monitor payment success rate
- [ ] Track average latency

---

## 🎯 Success Criteria Summary

| Metric | Target | How to Check |
|--------|--------|--------------|
| Provider wallet funded | > $0.08 | Query wallet balance |
| New payments credit provider | +$0.00097 per payment | Make test payment |
| Money balanced | Discrepancy < $0.01 | Run balance check query |
| Fees correct | ~2.9% | Check fee percentage query |
| Latency | < 200ms avg | Run performance test |
| Settlement timestamps | 100% populated | Check settled_at query |

---

## 📞 Quick Reference

**Key Wallet IDs:**
- Consumer (Test): `d199d814-5f53-4300-b1c8-81bd6ce5f00a`
- Provider (Test): `7a1fa1b0-95a7-4b68-812c-fd7cf3504c13`

**Key Account IDs:**
- Consumer: `f9c37b69-26d8-4a66-a91e-18e77c8e566f`
- Provider: `054ad8f1-78b5-41ae-98b7-c84802ed52ae`

**Tenant ID:**
- `da500003-4de9-416b-aebc-61cfcba914c9`

**Test Endpoint:**
- Forecast: `ea6ff54b-a427-40f9-8ea6-30c937d9fbed` ($0.001/call)

---

## 🔗 Related Documents

- **Audit Trail:** `/docs/X402_AUDIT_TRAIL.md` - Complete transaction history
- **Deployment:** `/docs/DEPLOYMENT_COMPLETE.md` - What was deployed
- **Bug Fix:** `/docs/SETTLEMENT_BUG_FIX.md` - Root cause analysis

---

**Last Updated:** December 23, 2025  
**Validation Status:** ✅ All checks passing



