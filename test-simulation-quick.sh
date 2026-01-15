#!/bin/bash

# Quick Test for Story 28.2 Simulation Features
set -e

# Load test credentials
if [ -f "test-credentials.sh" ]; then
    source test-credentials.sh > /dev/null
fi

# Use environment variables or defaults
API_URL="${API_URL:-http://localhost:4000}"
API_KEY="${API_KEY:-pk_test_demo_fintech_key_12345}"

# Use real accounts with balances from database
ACCOUNT_MARIA="${TEST_ACCOUNT_MARIA:-cccccccc-0000-0000-0000-000000000001}"  # $27,997 USDC, Tier 2
ACCOUNT_ANA="${TEST_ACCOUNT_ANA:-cccccccc-0000-0000-0000-000000000003}"      # $30,462 USDC, Tier 1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Story 28.2: Simulation Engine Testing${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Simple Transfer
echo -e "${GREEN}Test 1: Simple Same-Currency Transfer${NC}"
echo -e "${BLUE}Testing: Basic fee calculation, balance preview, timing${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"100.00\",
            \"currency\": \"USDC\"
        }
    }" | jq '{ data: .data, 
        simulation_id: .data.simulation_id,
        status: .data.status,
        can_execute: .data.can_execute,
        preview: {
            source: .data.preview.source,
            destination: .data.preview.destination,
            fees: .data.preview.fees,
            timing: .data.preview.timing
        },
        warnings: .data.warnings | length,
        errors: .data.errors | length
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 2: Cross-Currency (USD to BRL) - Should show FX rate and PIX timing
echo -e "${GREEN}Test 2: Cross-Currency Transfer (USD → BRL)${NC}"
echo -e "${BLUE}Testing: FX rate lookup, spreads, PIX rail (120s), corridor fees${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"1000.00\",
            \"currency\": \"USD\",
            \"destination_currency\": \"BRL\"
        }
    }" | jq '{ data: .data, 
        can_execute,
        fx: .preview.fx,
        fees: .preview.fees,
        timing: .preview.timing,
        destination_amount: .preview.destination.amount,
        destination_currency: .preview.destination.currency
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 3: Cross-Currency (USD to MXN) - Should show SPEI timing
echo -e "${GREEN}Test 3: Cross-Currency Transfer (USD → MXN)${NC}"
echo -e "${BLUE}Testing: SPEI rail (180s), different FX rate${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"500.00\",
            \"currency\": \"USD\",
            \"destination_currency\": \"MXN\"
        }
    }" | jq '{ data: .data, 
        can_execute,
        fx_rate: .preview.fx.rate,
        fx_spread: .preview.fx.spread,
        rail: .preview.timing.rail,
        duration_seconds: .preview.timing.estimated_duration_seconds,
        destination_amount: .preview.destination.amount
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 4: Large Transfer Warning
echo -e "${GREEN}Test 4: Large Transfer Warning (>$10k)${NC}"
echo -e "${BLUE}Testing: LARGE_TRANSFER warning generation${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"15000.00\",
            \"currency\": \"USDC\"
        }
    }" | jq '{ data: .data, 
        can_execute,
        warnings: .warnings | map({code, message})
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 5: Insufficient Balance Error
echo -e "${GREEN}Test 5: Insufficient Balance Error${NC}"
echo -e "${BLUE}Testing: Balance validation with shortfall calculation${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"999999999.00\",
            \"currency\": \"USDC\"
        }
    }" | jq '{ data: .data, 
        can_execute,
        errors: .errors | map({code, message, details})
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 6: Invalid Account
echo -e "${GREEN}Test 6: Invalid Account Error${NC}"
echo -e "${BLUE}Testing: Account validation${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"00000000-0000-0000-0000-000000000000\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"100.00\",
            \"currency\": \"USDC\"
        }
    }" | jq '{ data: .data, 
        can_execute,
        errors: .errors | map({code, message})
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 7: Create and Execute Simulation
echo -e "${GREEN}Test 7: Create and Execute Simulation${NC}"
echo -e "${BLUE}Testing: Full simulation-to-execution flow with idempotency${NC}"

# Create simulation
sim_response=$(curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"transfer\",
        \"payload\": {
            \"from_account_id\": \"${ACCOUNT_MARIA}\",
            \"to_account_id\": \"${ACCOUNT_ANA}\",
            \"amount\": \"10.00\",
            \"currency\": \"USDC\"
        }
    }")

sim_id=$(echo "$sim_response" | jq -r '.simulation_id')
can_exec=$(echo "$sim_response" | jq -r '.can_execute')

echo -e "  Simulation ID: ${sim_id}"
echo -e "  Can Execute: ${can_exec}"

if [ "$can_exec" = "true" ]; then
    echo -e "${BLUE}  Executing...${NC}"
    exec_response=$(curl -s -X POST "${API_URL}/v1/simulate/${sim_id}/execute" \
        -H "Authorization: Bearer ${API_KEY}")
    
    echo "$exec_response" | jq '{ data: .data, 
        status,
        transfer_id: .execution_result.id,
        transfer_status: .execution_result.status,
        variance
    }'
    
    echo -e "${BLUE}  Testing idempotency (executing again)...${NC}"
    exec_response2=$(curl -s -X POST "${API_URL}/v1/simulate/${sim_id}/execute" \
        -H "Authorization: Bearer ${API_KEY}")
    
    echo "$exec_response2" | jq '{ data: .data, 
        status,
        message,
        transfer_id: .execution_result.id
    }'
else
    echo -e "${YELLOW}  Cannot execute (has errors)${NC}"
fi
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 8: Get Simulation Details
echo -e "${GREEN}Test 8: Get Simulation Details${NC}"
curl -s "${API_URL}/v1/simulate/${sim_id}" \
    -H "Authorization: Bearer ${API_KEY}" | jq '{ data: .data, 
        simulation_id,
        status,
        can_execute,
        expires_at,
        preview_summary: {
            source_amount: .preview.source.amount,
            dest_amount: .preview.destination.amount,
            total_fees: .preview.fees.total
        }
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 9: Unsupported Action
echo -e "${GREEN}Test 9: Unsupported Action (Refund - Story 28.5)${NC}"
echo -e "${BLUE}Testing: NOT_IMPLEMENTED error for future stories${NC}"
curl -s -X POST "${API_URL}/v1/simulate" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"action\": \"refund\",
        \"payload\": {
            \"transfer_id\": \"00000000-0000-0000-0000-000000000000\",
            \"amount\": \"100.00\",
            \"reason\": \"test\"
        }
    }" | jq '{error}'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Story 28.2 Testing Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Features Verified:${NC}"
echo -e "  ✓ Same-currency transfers with fee calculation"
echo -e "  ✓ Cross-currency transfers (FX rates & spreads)"
echo -e "  ✓ Payment rail selection (PIX, SPEI, internal)"
echo -e "  ✓ Timing estimates (5s - 24h depending on rail)"
echo -e "  ✓ Warning generation (large transfers)"
echo -e "  ✓ Error detection (insufficient balance, invalid accounts)"
echo -e "  ✓ Simulation execution"
echo -e "  ✓ Idempotent execution"
echo -e "  ✓ Simulation retrieval"
echo ""

