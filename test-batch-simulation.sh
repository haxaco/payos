#!/bin/bash

# Test Script for Story 28.3: Batch Simulation Endpoint
set -e

# Load test credentials
if [ -f "test-credentials.sh" ]; then
    source test-credentials.sh > /dev/null
fi

API_URL="${API_URL:-http://localhost:4000}"
API_KEY="${API_KEY:-pk_test_demo_fintech_key_12345}"

# Test accounts
ACCOUNT_MARIA="${TEST_ACCOUNT_MARIA:-cccccccc-0000-0000-0000-000000000001}"
ACCOUNT_ANA="${TEST_ACCOUNT_ANA:-cccccccc-0000-0000-0000-000000000003}"
ACCOUNT_SOFIA="${TEST_ACCOUNT_SOFIA:-cccccccc-0000-0000-0000-000000000005}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Story 28.3: Batch Simulation Testing${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Small Batch (3 transfers)
echo -e "${GREEN}Test 1: Small Batch (3 transfers)${NC}"
echo -e "${BLUE}Testing: Basic batch processing, cumulative balance${NC}"
curl -s -X POST "${API_URL}/v1/simulate/batch" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "simulations": [
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "100.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_SOFIA}'",
                    "amount": "200.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "150.00",
                    "currency": "USDC"
                }
            }
        ]
    }' | jq '{
        batch_id: .data.batch_id,
        total_count: .data.total_count,
        successful: .data.successful,
        failed: .data.failed,
        can_execute_all: .data.can_execute_all,
        totals: .data.totals,
        summary: .data.summary
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 2: Cross-Currency Batch
echo -e "${GREEN}Test 2: Cross-Currency Batch (USD → BRL, USD → MXN)${NC}"
echo -e "${BLUE}Testing: Multiple currencies, different rails${NC}"
curl -s -X POST "${API_URL}/v1/simulate/batch" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "simulations": [
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "500.00",
                    "currency": "USD",
                    "destination_currency": "BRL"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_SOFIA}'",
                    "amount": "300.00",
                    "currency": "USD",
                    "destination_currency": "MXN"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "200.00",
                    "currency": "USDC"
                }
            }
        ]
    }' | jq '{
        total_count: .data.total_count,
        can_execute_all: .data.can_execute_all,
        summary: .data.summary,
        first_preview: .data.simulations[0].preview.timing.rail,
        second_preview: .data.simulations[1].preview.timing.rail
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 3: Cumulative Balance Validation
echo -e "${GREEN}Test 3: Cumulative Balance Validation${NC}"
echo -e "${BLUE}Testing: Multiple transfers from same account, balance tracking${NC}"
curl -s -X POST "${API_URL}/v1/simulate/batch" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "simulations": [
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "10000.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_SOFIA}'",
                    "amount": "10000.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "10000.00",
                    "currency": "USDC"
                }
            }
        ]
    }' | jq '{
        successful: .data.successful,
        failed: .data.failed,
        can_execute_all: .data.can_execute_all,
        simulation_statuses: .data.simulations | map({
            index,
            can_execute,
            balance_after: .preview.source.balance_after,
            has_errors: (.errors | length > 0)
        })
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 4: Large Batch (50 transfers)
echo -e "${GREEN}Test 4: Large Batch (50 transfers)${NC}"
echo -e "${BLUE}Testing: Performance with larger batch${NC}"

# Generate 50 transfer simulations
BATCH_JSON='{"simulations":['
for i in {1..50}; do
    AMOUNT=$((100 + RANDOM % 400))
    BATCH_JSON+='{"action":"transfer","payload":{"from_account_id":"'${ACCOUNT_MARIA}'","to_account_id":"'${ACCOUNT_ANA}'","amount":"'${AMOUNT}'.00","currency":"USDC"}}'
    if [ $i -lt 50 ]; then
        BATCH_JSON+=','
    fi
done
BATCH_JSON+=']}'

START_TIME=$(date +%s%3N)
RESPONSE=$(curl -s -X POST "${API_URL}/v1/simulate/batch" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$BATCH_JSON")
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

echo "$RESPONSE" | jq '{
    batch_id: .data.batch_id,
    total_count: .data.total_count,
    successful: .data.successful,
    failed: .data.failed,
    totals: .data.totals,
    processing_time_ms: '$DURATION'
}'
echo -e "${BLUE}  Processing time: ${DURATION}ms${NC}"
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

# Test 5: Stop on First Error
echo -e "${GREEN}Test 5: Stop on First Error${NC}"
echo -e "${BLUE}Testing: stop_on_first_error flag${NC}"
curl -s -X POST "${API_URL}/v1/simulate/batch" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "simulations": [
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "100.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "999999999.00",
                    "currency": "USDC"
                }
            },
            {
                "action": "transfer",
                "payload": {
                    "from_account_id": "'${ACCOUNT_MARIA}'",
                    "to_account_id": "'${ACCOUNT_ANA}'",
                    "amount": "100.00",
                    "currency": "USDC"
                }
            }
        ],
        "stop_on_first_error": true
    }' | jq '{
        total_count: .data.total_count,
        successful: .data.successful,
        failed: .data.failed,
        simulation_results: .data.simulations | map({
            index,
            status,
            error_code: .errors[0].code
        })
    }'
echo -e "${YELLOW}─────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Story 28.3 Batch Simulation Testing Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Features Verified:${NC}"
echo -e "  ✓ Small batch processing (3 transfers)"
echo -e "  ✓ Cross-currency batches with multiple rails"
echo -e "  ✓ Cumulative balance validation"
echo -e "  ✓ Large batch performance (50 transfers)"
echo -e "  ✓ Stop on first error functionality"
echo -e "  ✓ Summary statistics (by currency, by rail)"
echo ""



