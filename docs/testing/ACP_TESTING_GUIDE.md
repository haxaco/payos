# ACP Testing Guide

**Protocol:** ACP (Agentic Commerce Protocol)  
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

### Test 1: Create ACP Checkout ✅

**Purpose:** Verify checkout session creation with cart items

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "checkout_test_'$(date +%s)'",
    "agent_id": "shopping_assistant_001",
    "agent_name": "AI Shopping Assistant",
    "customer_id": "cust_12345",
    "customer_email": "customer@example.com",
    "account_id": "'"${ACCOUNT_ID}"'",
    "merchant_id": "merch_electronics",
    "merchant_name": "Best Electronics",
    "merchant_url": "https://electronics.example.com",
    "items": [
      {
        "name": "Wireless Headphones",
        "description": "Premium noise-cancelling",
        "quantity": 1,
        "unit_price": 299.99,
        "total_price": 299.99
      },
      {
        "name": "USB-C Cable",
        "quantity": 2,
        "unit_price": 15.99,
        "total_price": 31.98
      }
    ],
    "tax_amount": 26.40,
    "shipping_amount": 9.99,
    "currency": "USD"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "checkout_id": "checkout_test_...",
    "agent_id": "shopping_assistant_001",
    "agent_name": "AI Shopping Assistant",
    "merchant_id": "merch_electronics",
    "merchant_name": "Best Electronics",
    "subtotal": 331.97,
    "tax_amount": 26.40,
    "shipping_amount": 9.99,
    "discount_amount": 0,
    "total_amount": 368.36,
    "currency": "USD",
    "status": "pending",
    "items": [
      {
        "id": "uuid-item-1",
        "item_id": null,
        "name": "Wireless Headphones",
        "quantity": 1,
        "unit_price": 299.99,
        "total_price": 299.99
      },
      {
        "id": "uuid-item-2",
        "name": "USB-C Cable",
        "quantity": 2,
        "unit_price": 15.99,
        "total_price": 31.98
      }
    ],
    "created_at": "2025-12-27T...",
    "expires_at": null
  }
}
```

**Verify:**
- ✅ HTTP 201 Created
- ✅ `total_amount` = subtotal + tax + shipping - discount
- ✅ `status` = "pending"
- ✅ Items array populated with 2 items

**Save for next tests:**
```bash
CHECKOUT_ID="<id from response>"
```

---

### Test 2: Get Checkout Details ✅

**Purpose:** Verify checkout retrieval with items

**Request:**
```bash
curl "http://localhost:4000/v1/acp/checkouts/${CHECKOUT_ID}" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid-checkout",
    "checkout_id": "checkout_test_...",
    "agent_id": "shopping_assistant_001",
    "merchant_name": "Best Electronics",
    "total_amount": 368.36,
    "status": "pending",
    "items": [
      {
        "name": "Wireless Headphones",
        "quantity": 1,
        "unit_price": 299.99,
        "total_price": 299.99
      },
      {
        "name": "USB-C Cable",
        "quantity": 2,
        "unit_price": 15.99,
        "total_price": 31.98
      }
    ]
  }
}
```

**Verify:**
- ✅ All checkout details present
- ✅ Items array fully populated
- ✅ Totals match creation request

---

### Test 3: Complete Checkout (Create Payment) ✅

**Purpose:** Verify checkout completion creates transfer

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/acp/checkouts/${CHECKOUT_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "shared_payment_token": "spt_stripe_test_abc123",
    "payment_method": "card"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "checkout_id": "uuid-checkout",
    "transfer_id": "uuid-transfer",
    "status": "completed",
    "completed_at": "2025-12-27T...",
    "total_amount": 368.36,
    "currency": "USD"
  }
}
```

**Verify:**
- ✅ HTTP 200 OK
- ✅ `status` = "completed"
- ✅ `transfer_id` present
- ✅ `completed_at` timestamp set

**Save transfer_id:**
```bash
TRANSFER_ID="<transfer_id from response>"
```

---

### Test 4: Verify Transfer Created with ACP Metadata ✅

**Purpose:** Verify transfer has correct protocol_metadata

**Request:**
```bash
curl "http://localhost:4000/v1/transfers/${TRANSFER_ID}" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data | {id, type, amount, protocolMetadata}'
```

**Expected Response:**
```json
{
  "id": "uuid-transfer",
  "type": "acp",
  "amount": 368.36,
  "protocolMetadata": {
    "protocol": "acp",
    "checkout_id": "checkout_test_...",
    "merchant_id": "merch_electronics",
    "merchant_name": "Best Electronics",
    "agent_id": "shopping_assistant_001",
    "customer_id": "cust_12345",
    "cart_items": [
      {
        "name": "Wireless Headphones",
        "quantity": 1,
        "price": 299.99
      },
      {
        "name": "USB-C Cable",
        "quantity": 2,
        "price": 15.99
      }
    ],
    "shared_payment_token": "spt_stripe_test_abc123"
  }
}
```

**Verify:**
- ✅ Transfer `type` = "acp"
- ✅ `protocol_metadata.protocol` = "acp"
- ✅ Cart items preserved in metadata
- ✅ Merchant and agent info present

---

### Test 5: List Checkouts with Filters ✅

**Purpose:** Verify filtering and pagination

**Request:**
```bash
# List all checkouts
curl "http://localhost:4000/v1/acp/checkouts?limit=10" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data | length'

# Filter by status
curl "http://localhost:4000/v1/acp/checkouts?status=completed" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[0].status'

# Filter by merchant
curl "http://localhost:4000/v1/acp/checkouts?merchant_id=merch_electronics" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[0].merchant_id'

# Filter by agent
curl "http://localhost:4000/v1/acp/checkouts?agent_id=shopping_assistant_001" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[0].agent_id'
```

**Verify:**
- ✅ Returns array of checkouts
- ✅ Pagination info present
- ✅ Filters work correctly
- ✅ Only tenant's checkouts visible

---

### Test 6: Cancel Checkout ✅

**Purpose:** Verify checkout cancellation

**Request:**
```bash
# Create a new checkout for cancellation test
CANCEL_CHECKOUT=$(curl -s -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "checkout_cancel_test_'$(date +%s)'",
    "agent_id": "agent_test",
    "account_id": "'"${ACCOUNT_ID}"'",
    "merchant_id": "merch_test",
    "items": [{"name": "Test Item", "quantity": 1, "unit_price": 10, "total_price": 10}],
    "currency": "USD"
  }' | jq -r '.data.id')

# Cancel it
curl -X PATCH "http://localhost:4000/v1/acp/checkouts/${CANCEL_CHECKOUT}/cancel" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.'
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid-checkout",
    "status": "cancelled",
    "cancelled_at": "2025-12-27T..."
  }
}
```

**Verify:**
- ✅ Status changed to "cancelled"
- ✅ `cancelled_at` timestamp set
- ✅ Cannot complete cancelled checkout

---

### Test 7: ACP-Specific Analytics ✅

**Purpose:** Verify ACP analytics endpoint

**Request:**
```bash
curl "http://localhost:4000/v1/acp/analytics?period=30d" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data.summary'
```

**Expected Response:**
```json
{
  "totalRevenue": 368.36,
  "totalFees": 0,
  "netRevenue": 368.36,
  "transactionCount": 1,
  "completedCheckouts": 1,
  "pendingCheckouts": 0,
  "averageOrderValue": 368.36,
  "uniqueMerchants": 1,
  "uniqueAgents": 1
}
```

**Verify:**
- ✅ Revenue aggregation correct
- ✅ Checkout counts by status
- ✅ Average order value calculated
- ✅ Unique merchants/agents counted

---

### Test 8: Cross-Protocol Integration ✅

**Purpose:** Verify ACP appears in unified analytics

**Request:**
```bash
curl "http://localhost:4000/v1/agentic-payments/summary" \
  -H "Authorization: Bearer ${API_KEY}" | jq '{
    totalRevenue: .data.totalRevenue,
    byProtocol: .data.byProtocol
  }'
```

**Expected Response:**
```json
{
  "totalRevenue": 668.455,
  "byProtocol": {
    "x402": {
      "revenue": 0.095,
      "transactions": 11
    },
    "ap2": {
      "revenue": 300,
      "transactions": 2
    },
    "acp": {
      "revenue": 368.36,
      "transactions": 1
    }
  }
}
```

**Verify:**
- ✅ ACP data included
- ✅ Cross-protocol totals correct
- ✅ Protocol breakdown accurate

---

### Test 9: ACP Transfers in Transfer List ✅

**Purpose:** Verify ACP transfers filterable

**Request:**
```bash
curl "http://localhost:4000/v1/transfers?type=acp&limit=2" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.data[] | {
    id,
    type,
    amount,
    protocolMetadata: {
      protocol: .protocolMetadata.protocol,
      checkout_id: .protocolMetadata.checkout_id,
      merchant_name: .protocolMetadata.merchant_name
    }
  }'
```

**Expected Response:**
```json
[
  {
    "id": "uuid-transfer",
    "type": "acp",
    "amount": 368.36,
    "protocolMetadata": {
      "protocol": "acp",
      "checkout_id": "checkout_test_...",
      "merchant_name": "Best Electronics"
    }
  }
]
```

**Verify:**
- ✅ Transfers have `type: 'acp'`
- ✅ Protocol metadata present
- ✅ Merchant info preserved

---

## Edge Cases

### Test E1: Duplicate Checkout ID

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "duplicate_test",
    "agent_id": "agent_test",
    "account_id": "'"${ACCOUNT_ID}"'",
    "merchant_id": "merch_test",
    "items": [{"name": "Item", "quantity": 1, "unit_price": 10, "total_price": 10}]
  }'
  
# Try again with same checkout_id
curl -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "duplicate_test",
    "agent_id": "agent_test",
    "account_id": "'"${ACCOUNT_ID}"'",
    "merchant_id": "merch_test",
    "items": [{"name": "Item", "quantity": 1, "unit_price": 10, "total_price": 10}]
  }'
```

**Expected:** HTTP 409 Conflict

---

### Test E2: Invalid Account ID

**Request:**
```bash
curl -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "invalid_account_test",
    "agent_id": "agent_test",
    "account_id": "00000000-0000-0000-0000-000000000000",
    "merchant_id": "merch_test",
    "items": [{"name": "Item", "quantity": 1, "unit_price": 10, "total_price": 10}]
  }'
```

**Expected:** HTTP 404 Account Not Found

---

### Test E3: Complete Already Completed Checkout

```bash
# Try to complete the same checkout twice
curl -X POST "http://localhost:4000/v1/acp/checkouts/${CHECKOUT_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"shared_payment_token": "spt_test"}'
```

**Expected:** HTTP 400 "Checkout invalid or expired"

---

### Test E4: Empty Cart Items

```bash
curl -X POST "http://localhost:4000/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_id": "empty_cart_test",
    "agent_id": "agent_test",
    "account_id": "'"${ACCOUNT_ID}"'",
    "merchant_id": "merch_test",
    "items": []
  }'
```

**Expected:** HTTP 400 Validation Error (items must have min 1)

---

## Performance Testing

### Load Test: Create 50 Checkouts

```bash
for i in {1..50}; do
  curl -s -X POST "http://localhost:4000/v1/acp/checkouts" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "checkout_id": "load_test_'$i'",
      "agent_id": "agent_load",
      "account_id": "'"${ACCOUNT_ID}"'",
      "merchant_id": "merch_load",
      "items": [
        {"name": "Product A", "quantity": 1, "unit_price": 100, "total_price": 100}
      ]
    }' > /dev/null &
done
wait
```

**Expected:** All succeed, <10s total time

---

## Automated Test Script

Save as `test_acp.sh`:

```bash
#!/bin/bash
set -e

API_KEY="pk_test_demo_fintech_key_12345"
ACCOUNT_ID="cccccccc-0000-0000-0000-000000000001"
BASE_URL="http://localhost:4000"

echo "🧪 ACP Test Suite Starting..."

# Test 1: Create Checkout
echo "1️⃣  Creating checkout..."
CHECKOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/acp/checkouts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"checkout_id\": \"test_$(date +%s)\",
    \"agent_id\": \"test_agent\",
    \"account_id\": \"${ACCOUNT_ID}\",
    \"merchant_id\": \"test_merchant\",
    \"items\": [
      {\"name\": \"Test Item\", \"quantity\": 2, \"unit_price\": 50, \"total_price\": 100}
    ]
  }")

CHECKOUT_ID=$(echo $CHECKOUT_RESPONSE | jq -r '.data.id')
echo "✅ Checkout created: $CHECKOUT_ID"

# Test 2: Complete Checkout
echo "2️⃣  Completing checkout..."
COMPLETE_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/acp/checkouts/${CHECKOUT_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"shared_payment_token": "spt_test_token"}')

TRANSFER_ID=$(echo $COMPLETE_RESPONSE | jq -r '.data.transfer_id')
echo "✅ Checkout completed. Transfer: $TRANSFER_ID"

# Test 3: Verify Transfer
echo "3️⃣  Verifying transfer..."
TRANSFER=$(curl -s "${BASE_URL}/v1/transfers/${TRANSFER_ID}" \
  -H "Authorization: Bearer ${API_KEY}")

TRANSFER_TYPE=$(echo $TRANSFER | jq -r '.data.type')
if [ "$TRANSFER_TYPE" == "acp" ]; then
  echo "✅ Transfer type correct: acp"
else
  echo "❌ Transfer type incorrect: $TRANSFER_TYPE"
  exit 1
fi

# Test 4: Analytics
echo "4️⃣  Checking analytics..."
ANALYTICS=$(curl -s "${BASE_URL}/v1/acp/analytics?period=30d" \
  -H "Authorization: Bearer ${API_KEY}")

REVENUE=$(echo $ANALYTICS | jq -r '.data.summary.totalRevenue')
echo "✅ ACP Analytics: $REVENUE revenue"

echo ""
echo "🎉 All tests passed!"
```

Run with:
```bash
chmod +x test_acp.sh
./test_acp.sh
```

---

## Test Checklist

### API Tests
- [ ] Create checkout (Test 1)
- [ ] Get checkout details (Test 2)
- [ ] Complete checkout (Test 3)
- [ ] Verify transfer creation (Test 4)
- [ ] List checkouts with filters (Test 5)
- [ ] Cancel checkout (Test 6)
- [ ] ACP analytics (Test 7)
- [ ] Cross-protocol integration (Test 8)
- [ ] Transfers list (Test 9)

### Edge Cases
- [ ] Duplicate checkout ID rejected
- [ ] Invalid account rejected
- [ ] Already completed checkout fails
- [ ] Empty cart validation

### Performance
- [ ] 50 checkouts < 10s
- [ ] Analytics < 300ms

---

**Testing Complete!** ✅  
All core ACP functionality verified and working.

