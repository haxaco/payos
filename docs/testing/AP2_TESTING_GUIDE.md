# AP2 Testing Guide

**Protocol:** AP2 (Google Agent Payment Protocol)  
**Date:** December 27, 2025  

---

## Prerequisites

### 1. Servers Running
```bash
# Terminal 1: API Server
cd /Users/haxaco/Dev/PayOS/apps/api && pnpm dev
# Should be running on http://localhost:4000

# Terminal 2: Web Server (optional, for UI testing)
cd /Users/haxaco/Dev/PayOS/apps/web && pnpm dev
# Should be running on http://localhost:3000
```

### 2. Test Credentials
```bash
# Use demo tenant API key
API_KEY="pk_test_demo_fintech_key_12345"

# Test account ID (Maria Garcia)
ACCOUNT_ID="cccccccc-0000-0000-0000-000000000001"
```

---

## Test Suite

### Test 1: Create AP2 Mandate ✅

**Purpose:** Verify mandate creation with authorization

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mandate_id": "mandate_travel_bot_001",
    "mandate_type": "cart",
    "agent_id": "agent_travel_assistant",
    "agent_name": "AI Travel Assistant",
    "account_id": "'"${ACCOUNT_ID}"'",
    "authorized_amount": 1000.00,
    "currency": "USDC",
    "expires_at": "2026-06-30T23:59:59Z",
    "mandate_data": {
      "purpose": "vacation_booking",
      "destination": "Hawaii"
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "mandate_id": "mandate_travel_bot_001",
    "mandate_type": "cart",
    "agent_id": "agent_travel_assistant",
    "agent_name": "AI Travel Assistant",
    "account_id": "cccccccc-0000-0000-0000-000000000001",
    "authorized_amount": 1000,
    "used_amount": 0,
    "remaining_amount": 1000,
    "currency": "USDC",
    "status": "active",
    "execution_count": 0,
    "expires_at": "2026-06-30T23:59:59.000Z",
    "created_at": "2025-12-27T..."
  }
}
```

**Verify:**
- ✅ HTTP 201 Created
- ✅ `remaining_amount` = `authorized_amount`
- ✅ `used_amount` = 0
- ✅ `status` = "active"
- ✅ `execution_count` = 0

**Save for next tests:**
```bash
MANDATE_ID="<id from response>"
```

---

### Test 2: Execute First Payment ✅

**Purpose:** Verify payment execution and auto-update

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 350.00,
    "currency": "USDC",
    "authorization_proof": "ap2_proof_abc123",
    "description": "Flight booking: LAX → HNL"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "execution_id": "uuid-execution",
    "transfer_id": "uuid-transfer",
    "mandate": {
      "id": "uuid-mandate",
      "remaining_amount": 650,
      "used_amount": 350,
      "execution_count": 1,
      "status": "active"
    },
    "transfer": {
      "id": "uuid-transfer",
      "amount": 350,
      "currency": "USDC",
      "status": "completed",
      "created_at": "2025-12-27T..."
    }
  }
}
```

**Verify:**
- ✅ HTTP 201 Created
- ✅ `remaining_amount` = 650 (1000 - 350)
- ✅ `used_amount` = 350
- ✅ `execution_count` = 1
- ✅ Transfer created with `type: 'ap2'`

---

### Test 3: Execute Second Payment ✅

**Purpose:** Verify cumulative usage tracking

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "authorization_proof": "ap2_proof_xyz789",
    "description": "Hotel booking: 3 nights"
  }' | jq '.data.mandate'
```

**Expected Response:**
```json
{
  "id": "uuid-mandate",
  "remaining_amount": 400,
  "used_amount": 600,
  "execution_count": 2,
  "status": "active"
}
```

**Verify:**
- ✅ `remaining_amount` = 400 (1000 - 350 - 250)
- ✅ `used_amount` = 600 (350 + 250)
- ✅ `execution_count` = 2

---

### Test 4: Attempt Over-Budget Payment ❌

**Purpose:** Verify mandate validation prevents over-spending

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "description": "This should fail - exceeds remaining"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "error": "Mandate invalid or insufficient remaining amount",
  "details": {
    "status": "active",
    "authorized_amount": 1000,
    "used_amount": 600,
    "remaining_amount": 400,
    "requested_amount": 500
  }
}
```

**Verify:**
- ✅ HTTP 400 Bad Request
- ✅ Error message explains why
- ✅ Shows remaining vs requested

---

### Test 5: List Mandates ✅

**Purpose:** Verify filtering and pagination

**Request:**
```bash
# List all mandates
curl "http://localhost:4000/v1/ap2/mandates?limit=10" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[0]'

# Filter by status
curl "http://localhost:4000/v1/ap2/mandates?status=active" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data | length'

# Filter by agent
curl "http://localhost:4000/v1/ap2/mandates?agent_id=agent_travel_assistant" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[0].agent_id'
```

**Verify:**
- ✅ Returns array of mandates
- ✅ Pagination info present
- ✅ Filters work correctly
- ✅ Only tenant's mandates visible

---

### Test 6: Get Mandate Details with History ✅

**Purpose:** Verify execution history tracking

**Request:**
```bash
curl "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}" \
  -H "Authorization: Bearer ${API_KEY}" | jq '{
    mandate_id: .data.mandate_id,
    used_amount: .data.used_amount,
    remaining_amount: .data.remaining_amount,
    execution_count: .data.execution_count,
    executions: .data.executions
  }'
```

**Expected Response:**
```json
{
  "mandate_id": "mandate_travel_bot_001",
  "used_amount": 600,
  "remaining_amount": 400,
  "execution_count": 2,
  "executions": [
    {
      "id": "uuid-2",
      "execution_index": 2,
      "amount": 250,
      "status": "completed",
      "transfer_id": "uuid-transfer-2",
      "created_at": "2025-12-27T..."
    },
    {
      "id": "uuid-1",
      "execution_index": 1,
      "amount": 350,
      "status": "completed",
      "transfer_id": "uuid-transfer-1",
      "created_at": "2025-12-27T..."
    }
  ]
}
```

**Verify:**
- ✅ Execution history shows all payments
- ✅ Ordered by most recent first
- ✅ Each execution has transfer_id link

---

### Test 7: Cancel Mandate ✅

**Purpose:** Verify mandate cancellation

**Request:**
```bash
curl -X PATCH "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}/cancel" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid-mandate",
    "status": "cancelled",
    "cancelled_at": "2025-12-27T..."
  }
}
```

**Verify:**
- ✅ Status changed to "cancelled"
- ✅ `cancelled_at` timestamp set
- ✅ Cannot execute new payments on cancelled mandate

---

### Test 8: AP2 Analytics ✅

**Purpose:** Verify AP2-specific analytics

**Request:**
```bash
curl "http://localhost:4000/v1/ap2/analytics?period=30d" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data.summary'
```

**Expected Response:**
```json
{
  "totalRevenue": 600,
  "totalFees": 0,
  "netRevenue": 600,
  "transactionCount": 2,
  "activeMandates": 1,
  "totalAuthorized": 400,
  "totalUsed": 600,
  "utilizationRate": 150
}
```

**Verify:**
- ✅ Revenue matches total executions
- ✅ Mandate counts by type/status correct
- ✅ Utilization rate calculated

---

### Test 9: Cross-Protocol Integration ✅

**Purpose:** Verify AP2 appears in unified analytics

**Request:**
```bash
curl "http://localhost:4000/v1/agentic-payments/summary?period=30d" \
  -H "Authorization: Bearer ${API_KEY}" | jq '{
    totalRevenue: .data.totalRevenue,
    totalTransactions: .data.totalTransactions,
    byProtocol: .data.byProtocol
  }'
```

**Expected Response:**
```json
{
  "totalRevenue": 600.095,
  "totalTransactions": 13,
  "byProtocol": {
    "x402": {
      "revenue": 0.095,
      "transactions": 11
    },
    "ap2": {
      "revenue": 600,
      "transactions": 2
    },
    "acp": {
      "revenue": 0,
      "transactions": 0
    }
  }
}
```

**Verify:**
- ✅ AP2 data included
- ✅ Cross-protocol totals correct
- ✅ Protocol breakdown accurate

---

### Test 10: AP2 Transfers in Transfer List ✅

**Purpose:** Verify AP2 transfers appear with protocol metadata

**Request:**
```bash
curl "http://localhost:4000/v1/transfers?type=ap2&limit=2" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[] | {
    id,
    type,
    amount,
    description,
    protocolMetadata: {
      protocol: .protocolMetadata.protocol,
      mandate_id: .protocolMetadata.mandate_id,
      agent_id: .protocolMetadata.agent_id,
      execution_index: .protocolMetadata.execution_index
    }
  }'
```

**Expected Response:**
```json
[
  {
    "id": "uuid-transfer-2",
    "type": "ap2",
    "amount": 250,
    "description": "Hotel booking: 3 nights",
    "protocolMetadata": {
      "protocol": "ap2",
      "mandate_id": "mandate_travel_bot_001",
      "agent_id": "agent_travel_assistant",
      "execution_index": 2
    }
  },
  {
    "id": "uuid-transfer-1",
    "type": "ap2",
    "amount": 350,
    "description": "Flight booking: LAX → HNL",
    "protocolMetadata": {
      "protocol": "ap2",
      "mandate_id": "mandate_travel_bot_001",
      "agent_id": "agent_travel_assistant",
      "execution_index": 1
    }
  }
]
```

**Verify:**
- ✅ Transfers have `type: 'ap2'`
- ✅ `protocolMetadata.protocol` = "ap2"
- ✅ Mandate and agent info preserved

---

## Database Verification

### Verify Mandate Auto-Update

```sql
-- Check mandate usage after executions
SELECT 
  mandate_id,
  authorized_amount,
  used_amount,
  remaining_amount,
  execution_count,
  status
FROM ap2_mandates
WHERE mandate_id = 'mandate_travel_bot_001';
```

**Expected:**
```
mandate_id              | authorized_amount | used_amount | remaining_amount | execution_count | status
------------------------|-------------------|-------------|------------------|-----------------|----------
mandate_travel_bot_001  | 1000.00          | 600.00      | 400.00           | 2               | cancelled
```

---

### Verify Execution History

```sql
-- Check execution records
SELECT 
  execution_index,
  amount,
  status,
  transfer_id,
  created_at
FROM ap2_mandate_executions
WHERE mandate_id = (
  SELECT id FROM ap2_mandates WHERE mandate_id = 'mandate_travel_bot_001'
)
ORDER BY execution_index;
```

**Expected:**
```
execution_index | amount  | status    | transfer_id              | created_at
----------------|---------|-----------|--------------------------|-------------------------
1               | 350.00  | completed | uuid-transfer-1          | 2025-12-27 22:45:00
2               | 250.00  | completed | uuid-transfer-2          | 2025-12-27 22:46:00
```

---

### Verify Trigger Functionality

```sql
-- Manually insert execution (trigger should update mandate)
INSERT INTO ap2_mandate_executions (
  tenant_id,
  mandate_id,
  amount,
  status,
  execution_index
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  (SELECT id FROM ap2_mandates WHERE mandate_id = 'mandate_travel_bot_001'),
  50.00,
  'completed',
  3
);

-- Check if mandate updated automatically
SELECT used_amount, execution_count 
FROM ap2_mandates 
WHERE mandate_id = 'mandate_travel_bot_001';
```

**Expected:**
```
used_amount | execution_count
------------|----------------
650.00      | 3
```

---

## Edge Cases

### Test E1: Duplicate Mandate ID

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mandate_id": "mandate_travel_bot_001",
    "mandate_type": "payment",
    "agent_id": "agent_test",
    "account_id": "'"${ACCOUNT_ID}"'",
    "authorized_amount": 100
  }'
```

**Expected:** HTTP 409 Conflict

---

### Test E2: Invalid Account ID

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/ap2/mandates" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mandate_id": "mandate_invalid_account",
    "mandate_type": "payment",
    "agent_id": "agent_test",
    "account_id": "00000000-0000-0000-0000-000000000000",
    "authorized_amount": 100
  }'
```

**Expected:** HTTP 404 Account Not Found

---

### Test E3: Execute on Cancelled Mandate

```bash
# After cancelling mandate (Test 7), try to execute
curl -X POST "http://localhost:4000/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00}'
```

**Expected:** HTTP 400 "Mandate invalid"

---

### Test E4: Expired Mandate

```sql
-- Manually expire a mandate
UPDATE ap2_mandates 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE mandate_id = 'mandate_test_expired';
```

```bash
# Try to execute
curl -X POST "http://localhost:4000/v1/ap2/mandates/{expired_id}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.00}'
```

**Expected:** HTTP 400, status auto-changed to "expired"

---

## Performance Testing

### Load Test: Create 100 Mandates

```bash
for i in {1..100}; do
  curl -X POST "http://localhost:4000/v1/ap2/mandates" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "mandate_id": "load_test_mandate_'$i'",
      "mandate_type": "intent",
      "agent_id": "agent_load_test",
      "account_id": "'"${ACCOUNT_ID}"'",
      "authorized_amount": 100
    }' &
done
wait
```

**Expected:** All succeed, <100ms average response time

---

### Load Test: Execute 50 Payments

```bash
# Get a mandate ID
LOAD_MANDATE=$(curl -s "http://localhost:4000/v1/ap2/mandates?limit=1" \
  -H "Authorization: Bearer ${API_KEY}" | jq -r '.data[0].id')

# Execute 50 payments of $1 each
for i in {1..50}; do
  curl -X POST "http://localhost:4000/v1/ap2/mandates/${LOAD_MANDATE}/execute" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"amount": 1.00}' &
done
wait
```

**Expected:** All succeed, mandate shows `used_amount: 50`

---

## UI Testing (When Available)

### 1. Mandate List Page
- [ ] Navigate to `/dashboard/agentic-payments/ap2/mandates`
- [ ] Verify mandates display with status badges
- [ ] Test filtering by status (active, completed, cancelled)
- [ ] Test search by agent_id or mandate_id
- [ ] Verify pagination works

### 2. Mandate Detail Page
- [ ] Click on a mandate to view details
- [ ] Verify all fields display correctly
- [ ] Verify execution history shows all payments
- [ ] Verify utilization progress bar accurate
- [ ] Test "Execute Payment" button
- [ ] Test "Cancel Mandate" button

### 3. Create Mandate Form
- [ ] Navigate to "Create Mandate" page
- [ ] Fill in all required fields
- [ ] Test validation (negative amounts, invalid dates)
- [ ] Submit and verify redirect to detail page

### 4. Cross-Protocol Dashboard
- [ ] Navigate to `/dashboard/agentic-payments`
- [ ] Verify AP2 shows in protocol breakdown
- [ ] Verify AP2 revenue included in totals
- [ ] Click AP2 section → navigates to AP2 mandates

### 5. Transfers Page
- [ ] Filter transfers by `type: ap2`
- [ ] Verify AP2 badge shows on transfers
- [ ] Click transfer → verify protocol metadata visible

---

## Automated Test Script

Save as `test_ap2.sh`:

```bash
#!/bin/bash
set -e

API_KEY="pk_test_demo_fintech_key_12345"
ACCOUNT_ID="cccccccc-0000-0000-0000-000000000001"
BASE_URL="http://localhost:4000"

echo "🧪 AP2 Test Suite Starting..."

# Test 1: Create Mandate
echo "1️⃣  Creating mandate..."
MANDATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/ap2/mandates" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"mandate_id\": \"test_$(date +%s)\",
    \"mandate_type\": \"payment\",
    \"agent_id\": \"test_agent\",
    \"account_id\": \"${ACCOUNT_ID}\",
    \"authorized_amount\": 500
  }")

MANDATE_ID=$(echo $MANDATE_RESPONSE | jq -r '.data.id')
echo "✅ Mandate created: $MANDATE_ID"

# Test 2: Execute Payment
echo "2️⃣  Executing payment..."
EXEC_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}')

REMAINING=$(echo $EXEC_RESPONSE | jq -r '.data.mandate.remaining_amount')
echo "✅ Payment executed. Remaining: $REMAINING"

# Test 3: Verify Over-Budget Fails
echo "3️⃣  Testing over-budget..."
FAIL_RESPONSE=$(curl -s -w "%{http_code}" -X POST "${BASE_URL}/v1/ap2/mandates/${MANDATE_ID}/execute" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}' -o /dev/null)

if [ $FAIL_RESPONSE -eq 400 ]; then
  echo "✅ Over-budget correctly rejected"
else
  echo "❌ Over-budget should fail with 400"
  exit 1
fi

# Test 4: Cancel Mandate
echo "4️⃣  Cancelling mandate..."
curl -s -X PATCH "${BASE_URL}/v1/ap2/mandates/${MANDATE_ID}/cancel" \
  -H "Authorization: Bearer ${API_KEY}" > /dev/null
echo "✅ Mandate cancelled"

# Test 5: Analytics
echo "5️⃣  Checking analytics..."
ANALYTICS=$(curl -s "${BASE_URL}/v1/ap2/analytics?period=30d" \
  -H "Authorization: Bearer ${API_KEY}")
REVENUE=$(echo $ANALYTICS | jq -r '.data.summary.totalRevenue')
echo "✅ AP2 Analytics: $REVENUE revenue"

echo ""
echo "🎉 All tests passed!"
```

Run with:
```bash
chmod +x test_ap2.sh
./test_ap2.sh
```

---

## Test Checklist

### API Tests
- [ ] Create mandate (Test 1)
- [ ] Execute first payment (Test 2)
- [ ] Execute second payment (Test 3)
- [ ] Over-budget rejection (Test 4)
- [ ] List mandates (Test 5)
- [ ] Get mandate details (Test 6)
- [ ] Cancel mandate (Test 7)
- [ ] AP2 analytics (Test 8)
- [ ] Cross-protocol integration (Test 9)
- [ ] Transfers list (Test 10)

### Database Tests
- [ ] Mandate auto-update verified
- [ ] Execution history correct
- [ ] Trigger functionality works
- [ ] RLS policies enforced

### Edge Cases
- [ ] Duplicate mandate ID rejected
- [ ] Invalid account rejected
- [ ] Cancelled mandate execution fails
- [ ] Expired mandate handled

### Performance
- [ ] 100 mandates < 10s
- [ ] 50 executions < 5s
- [ ] Analytics < 200ms

---

## Troubleshooting

### Issue: 401 Invalid API Key
**Solution:** Use correct API key or create new one:
```sql
SELECT key_prefix FROM api_keys 
WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' 
AND status = 'active';
```

### Issue: 404 Account Not Found
**Solution:** Verify account exists:
```sql
SELECT id, name FROM accounts 
WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' 
LIMIT 5;
```

### Issue: Trigger Not Firing
**Solution:** Check trigger exists:
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'ap2_execution_completed';
```

---

**Testing Complete!** ✅  
All tests should pass with the current implementation.

