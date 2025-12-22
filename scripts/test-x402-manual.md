# Manual x402 API Testing Guide

This guide walks through testing all x402 APIs manually using curl commands.

## Prerequisites

1. API is running at `http://localhost:3001`
2. You have authenticated and have an auth token
3. You have a tenant ID and account ID

## Step 1: Authenticate

```bash
# Get auth token (using test user from seed data)
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "haxaco@gmail.com",
    "password": "Password123!"
  }'

# Save the token
export AUTH_TOKEN="your-token-here"
export ACCOUNT_ID="your-account-id-here"
```

## Step 2: Register x402 Endpoint

Register an API endpoint that will accept x402 payments.

```bash
curl -X POST http://localhost:3001/v1/x402/endpoints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "accountId": "'$ACCOUNT_ID'",
    "name": "Test Compliance API",
    "path": "/api/compliance/check",
    "method": "POST",
    "description": "Test endpoint for compliance checks",
    "basePrice": 0.01,
    "currency": "USDC",
    "volumeDiscounts": [
      { "threshold": 100, "priceMultiplier": 0.9 },
      { "threshold": 1000, "priceMultiplier": 0.8 }
    ],
    "network": "base-mainnet"
  }'

# Save the endpoint ID
export ENDPOINT_ID="endpoint-id-from-response"
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Test Compliance API",
    "path": "/api/compliance/check",
    "method": "POST",
    "basePrice": 0.01,
    "currency": "USDC",
    "paymentAddress": "internal://payos/...",
    "status": "active",
    ...
  }
}
```

## Step 3: List Endpoints

```bash
curl -X GET "http://localhost:3001/v1/x402/endpoints?page=1&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Step 4: Get Endpoint Details

```bash
curl -X GET "http://localhost:3001/v1/x402/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Step 5: Create Wallet

Create a wallet for making x402 payments.

```bash
curl -X POST http://localhost:3001/v1/wallets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "ownerAccountId": "'$ACCOUNT_ID'",
    "currency": "USDC",
    "initialBalance": 100,
    "spendingPolicy": {
      "dailySpendLimit": 50,
      "monthlySpendLimit": 200,
      "approvedVendors": ["/api/compliance"],
      "requiresApprovalAbove": 10
    },
    "network": "base-mainnet"
  }'

# Save the wallet ID
export WALLET_ID="wallet-id-from-response"
```

**Expected Response:**
```json
{
  "data": {
    "id": "uuid",
    "ownerAccountId": "uuid",
    "balance": 100,
    "currency": "USDC",
    "status": "active",
    "paymentAddress": "internal://payos/...",
    ...
  }
}
```

## Step 6: List Wallets

```bash
curl -X GET "http://localhost:3001/v1/wallets?page=1&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Step 7: Get Wallet Details

```bash
curl -X GET "http://localhost:3001/v1/wallets/$WALLET_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Step 8: Register Agent with Wallet

Register an autonomous agent with its own wallet.

```bash
curl -X POST http://localhost:3001/v1/agents/x402/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "accountName": "Test Compliance Agent Account",
    "accountEmail": "agent-test@payos.com",
    "agentName": "Compliance Bot",
    "agentPurpose": "Automated compliance checks",
    "agentType": "autonomous",
    "walletCurrency": "USDC",
    "initialBalance": 50,
    "spendingPolicy": {
      "dailySpendLimit": 10,
      "monthlySpendLimit": 100,
      "approvedVendors": ["/api/compliance"],
      "requiresApprovalAbove": 5,
      "autoFundEnabled": true,
      "autoFundThreshold": 5,
      "autoFundAmount": 20
    },
    "agentConfig": {
      "purpose": "Test autonomous compliance agent",
      "x402": {
        "enabled": true,
        "maxDailySpend": 10,
        "approvedEndpoints": ["/api/compliance/check"],
        "requiresApproval": false
      }
    }
  }'

# Save the agent ID
export AGENT_ID="agent-id-from-response"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Agent registered successfully",
  "data": {
    "id": "uuid",
    "name": "Compliance Bot",
    "account": {
      "id": "uuid",
      "name": "Test Compliance Agent Account",
      "type": "agent",
      "agentConfig": {...}
    },
    "wallet": {
      "id": "uuid",
      "balance": 50,
      "currency": "USDC",
      "spendingPolicy": {...}
    }
  }
}
```

## Step 9: Get Agent Wallet

```bash
curl -X GET "http://localhost:3001/v1/agents/x402/$AGENT_ID/wallet" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Step 10: Get Pricing Quote

Get the current price for an endpoint before making a payment.

```bash
curl -X GET "http://localhost:3001/v1/x402/quote/$ENDPOINT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "data": {
    "endpointId": "uuid",
    "name": "Test Compliance API",
    "path": "/api/compliance/check",
    "method": "POST",
    "basePrice": 0.01,
    "currentPrice": 0.01,
    "currency": "USDC",
    "volumeDiscounts": [...],
    "totalCalls": 0
  }
}
```

## Step 11: Process Payment

Process an x402 payment from wallet to endpoint.

```bash
# Generate a unique request ID (for idempotency)
export REQUEST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

curl -X POST http://localhost:3001/v1/x402/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "endpointId": "'$ENDPOINT_ID'",
    "requestId": "'$REQUEST_ID'",
    "amount": 0.01,
    "currency": "USDC",
    "walletId": "'$WALLET_ID'",
    "method": "POST",
    "path": "/api/compliance/check",
    "timestamp": '$(date +%s000)',
    "metadata": {
      "userAgent": "Manual Test",
      "testRun": true
    }
  }'

# Save the transfer ID
export TRANSFER_ID="transfer-id-from-response"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transferId": "uuid",
    "requestId": "uuid",
    "amount": 0.01,
    "currency": "USDC",
    "endpointId": "uuid",
    "walletId": "uuid",
    "newWalletBalance": 99.99,
    "proof": {
      "paymentId": "uuid",
      "signature": "payos:uuid:uuid"
    }
  }
}
```

## Step 12: Verify Payment

Verify that a payment has been completed.

```bash
curl -X POST http://localhost:3001/v1/x402/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "requestId": "'$REQUEST_ID'",
    "transferId": "'$TRANSFER_ID'"
  }'
```

**Expected Response:**
```json
{
  "verified": true,
  "data": {
    "transferId": "uuid",
    "requestId": "uuid",
    "amount": 0.01,
    "currency": "USDC",
    "from": "account-id",
    "to": "account-id",
    "endpointId": "uuid",
    "timestamp": "2025-12-22T10:00:00Z",
    "status": "completed"
  }
}
```

## Step 13: Test Idempotency

Try to process the same payment again with the same requestId.

```bash
curl -X POST http://localhost:3001/v1/x402/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "endpointId": "'$ENDPOINT_ID'",
    "requestId": "'$REQUEST_ID'",
    "amount": 0.01,
    "currency": "USDC",
    "walletId": "'$WALLET_ID'",
    "method": "POST",
    "path": "/api/compliance/check",
    "timestamp": '$(date +%s000)'
  }'
```

**Expected:** Should return the same transferId, not charge again.

## Step 14: Check Wallet Balance

Verify wallet balance was deducted correctly.

```bash
curl -X GET "http://localhost:3001/v1/wallets/$WALLET_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected:** Balance should be 99.99 (100 - 0.01).

## Step 15: Check Endpoint Stats

Verify endpoint stats were updated.

```bash
curl -X GET "http://localhost:3001/v1/x402/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected:** `totalCalls` should be 1, `totalRevenue` should be 0.01.

## Step 16: Fund Agent Wallet

Add funds to an agent's wallet.

```bash
curl -X POST "http://localhost:3001/v1/agents/x402/$AGENT_ID/wallet/fund" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "amount": 25,
    "sourceAccountId": "'$ACCOUNT_ID'",
    "reference": "Manual test funding"
  }'
```

## Step 17: Update Endpoint

Update endpoint configuration.

```bash
curl -X PATCH "http://localhost:3001/v1/x402/endpoints/$ENDPOINT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "basePrice": 0.02,
    "status": "active"
  }'
```

## Step 18: Update Wallet

Update wallet spending policy.

```bash
curl -X PATCH "http://localhost:3001/v1/wallets/$WALLET_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "spendingPolicy": {
      "dailySpendLimit": 100,
      "monthlySpendLimit": 500
    }
  }'
```

## Step 19: Update Agent Config

Update agent configuration and spending policy.

```bash
curl -X PATCH "http://localhost:3001/v1/agents/x402/$AGENT_ID/config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "purpose": "Updated compliance agent",
    "agentConfig": {
      "x402": {
        "enabled": true,
        "maxDailySpend": 20
      }
    },
    "spendingPolicy": {
      "dailySpendLimit": 20,
      "monthlySpendLimit": 200
    }
  }'
```

## Test Checklist

- [ ] Authentication works
- [ ] Can register x402 endpoint
- [ ] Can list endpoints with pagination
- [ ] Can get endpoint details
- [ ] Can create wallet with initial balance
- [ ] Can list wallets with pagination
- [ ] Can get wallet details
- [ ] Can register agent with wallet
- [ ] Can get agent wallet details
- [ ] Can get pricing quote
- [ ] Can process payment
- [ ] Can verify payment
- [ ] Payment is idempotent (same requestId doesn't charge twice)
- [ ] Wallet balance is correctly deducted
- [ ] Endpoint stats are updated (totalCalls, totalRevenue)
- [ ] Can fund agent wallet
- [ ] Can update endpoint configuration
- [ ] Can update wallet spending policy
- [ ] Can update agent configuration
- [ ] Spending policy is enforced (test with amount > limit)

## Error Cases to Test

### Insufficient Balance
```bash
# Try to pay more than wallet balance
curl -X POST http://localhost:3001/v1/x402/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "endpointId": "'$ENDPOINT_ID'",
    "requestId": "'$(uuidgen | tr '[:upper:]' '[:lower:]')'",
    "amount": 1000,
    "currency": "USDC",
    "walletId": "'$WALLET_ID'",
    "method": "POST",
    "path": "/api/compliance/check",
    "timestamp": '$(date +%s000)'
  }'
```
**Expected:** 400 error with code `INSUFFICIENT_BALANCE`.

### Amount Mismatch
```bash
# Try to pay wrong amount
curl -X POST http://localhost:3001/v1/x402/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "endpointId": "'$ENDPOINT_ID'",
    "requestId": "'$(uuidgen | tr '[:upper:]' '[:lower:]')'",
    "amount": 0.05,
    "currency": "USDC",
    "walletId": "'$WALLET_ID'",
    "method": "POST",
    "path": "/api/compliance/check",
    "timestamp": '$(date +%s000)'
  }'
```
**Expected:** 400 error with code `AMOUNT_MISMATCH`.

### Invalid Endpoint
```bash
# Try to pay to non-existent endpoint
curl -X POST http://localhost:3001/v1/x402/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "endpointId": "00000000-0000-0000-0000-000000000000",
    "requestId": "'$(uuidgen | tr '[:upper:]' '[:lower:]')'",
    "amount": 0.01,
    "currency": "USDC",
    "walletId": "'$WALLET_ID'",
    "method": "POST",
    "path": "/api/test",
    "timestamp": '$(date +%s000)'
  }'
```
**Expected:** 404 error with code `ENDPOINT_NOT_FOUND`.

## Success Criteria

✅ All CRUD operations work for endpoints, wallets, agents
✅ Payment flow works end-to-end
✅ Payment verification works
✅ Idempotency prevents double-charging
✅ Wallet balances are correctly updated
✅ Endpoint stats are correctly tracked
✅ Spending policies are enforced
✅ Error cases return appropriate error codes
✅ Pagination works for list endpoints
✅ Volume discounts are configured correctly

