#!/bin/bash

# PayOS Test Credentials
# Safe for version control - contains only test/demo credentials
# Source this file before running tests: source test-credentials.sh

# ============================================
# API Configuration
# ============================================
export API_URL=http://localhost:4000
export API_KEY=pk_test_demo_fintech_key_12345

# ============================================
# Test Tenant & Accounts (Demo Fintech)
# ============================================
export TEST_TENANT_ID=aaaaaaaa-0000-0000-0000-000000000001

# Real accounts from database with balances:
export TEST_ACCOUNT_MARIA=cccccccc-0000-0000-0000-000000000001  # Maria Garcia - $27,997.30 USDC, Tier 2
export TEST_ACCOUNT_ANA=cccccccc-0000-0000-0000-000000000003    # Ana Rodriguez - $30,462.30 USDC, Tier 1
export TEST_ACCOUNT_SOFIA=cccccccc-0000-0000-0000-000000000005  # Sofia Chen - $17,450.50 USDC, Tier 2
export TEST_ACCOUNT_LUIS=cccccccc-0000-0000-0000-000000000006   # Luis Ramirez - $17,221.85 USDC, Tier 0
export TEST_ACCOUNT_ACME=bbbbbbbb-0000-0000-0000-000000000002   # Acme Corp - $8,603.70 USDT, Tier 2

# Alternative tenant accounts
export TEST_ACCOUNT_TECHSTART=9203dd95-dbb4-498d-b6a0-a19c117950aa  # TechStart Inc - $39,212.90 USD, Tier 1
export TEST_ACCOUNT_GLOBAL=e6641744-78da-4670-80be-d8571c1d0650    # Global Services - $35,342.24 USD, Tier 0

echo "✅ Test credentials loaded!"
echo "   API URL: ${API_URL}"
echo "   API Key: ${API_KEY}"
echo "   Maria's Account: ${TEST_ACCOUNT_MARIA}"
echo ""
echo "Usage:"
echo "  source test-credentials.sh"
echo '  curl -X POST "${API_URL}/v1/simulate" \'
echo '    -H "Authorization: Bearer ${API_KEY}" \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"action":"transfer","payload":{...}}'"'"



