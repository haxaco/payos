#!/bin/bash

# Quick smoke test for x402 APIs running locally
# Run: bash scripts/smoke-test-local.sh

API_URL="http://localhost:4000"
PASS=0
FAIL=0

echo "╔════════════════════════════════════════╗"
echo "║   x402 Local Smoke Test                ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Test 1: Health Check
echo "🔍 Test 1: Health Check"
RESPONSE=$(curl -s "$API_URL/health")
if echo "$RESPONSE" | grep -q "healthy"; then
  echo "✅ PASS - API is healthy"
  ((PASS++))
else
  echo "❌ FAIL - API health check failed"
  ((FAIL++))
fi
echo ""

# Get Auth Token (using test user)
echo "🔍 Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"haxaco@gmail.com","password":"Password123!"}')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ FAIL - Could not authenticate"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Test 2: List x402 Endpoints (should return empty array or data)
echo "🔍 Test 2: GET /v1/x402/endpoints"
RESPONSE=$(curl -s "$API_URL/v1/x402/endpoints" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"data"'; then
  echo "✅ PASS - x402 endpoints route accessible"
  ((PASS++))
else
  echo "❌ FAIL - x402 endpoints route failed"
  echo "Response: $RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 3: List Wallets (should return empty array or data)
echo "🔍 Test 3: GET /v1/wallets"
RESPONSE=$(curl -s "$API_URL/v1/wallets" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"data"'; then
  echo "✅ PASS - Wallets route accessible"
  ((PASS++))
else
  echo "❌ FAIL - Wallets route failed"
  echo "Response: $RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 4: Get Quote (should fail with 404 for non-existent endpoint, but route should work)
echo "🔍 Test 4: GET /v1/x402/quote/:id (with fake ID)"
FAKE_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s "$API_URL/v1/x402/quote/$FAKE_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q 'error'; then
  echo "✅ PASS - x402 quote route accessible (404 expected)"
  ((PASS++))
else
  echo "❌ FAIL - x402 quote route not responding correctly"
  echo "Response: $RESPONSE"
  ((FAIL++))
fi
echo ""

# Summary
echo "════════════════════════════════════════"
echo "Summary: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "✅ All smoke tests passed! Ready for full test suite."
  exit 0
else
  echo "❌ Some tests failed. Check the output above."
  exit 1
fi

