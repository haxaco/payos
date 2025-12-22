#!/bin/bash

# x402 Scenarios - Master Test Runner
# Runs all 3 business scenarios in sequence or parallel
#
# Usage:
#   ./scripts/test-all-scenarios.sh          # Run sequentially
#   ./scripts/test-all-scenarios.sh parallel # Run in parallel

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
MODE="${1:-sequential}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         x402 Business Scenarios - Test Runner                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "API URL: $API_URL"
echo "Mode: $MODE"
echo ""

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo -e "${RED}❌ Error: tsx not found${NC}"
    echo "Install with: npm install -g tsx"
    exit 1
fi

# Test files
SCENARIO_1="scripts/test-scenario-1-provider.ts"
SCENARIO_2="scripts/test-scenario-2-agent.ts"
SCENARIO_3="scripts/test-scenario-3-monitoring.ts"

# Results
PASSED=0
FAILED=0

if [ "$MODE" = "parallel" ]; then
    echo -e "${BLUE}🚀 Running all scenarios in PARALLEL...${NC}"
    echo ""
    
    # Run all in background
    tsx "$SCENARIO_1" > /tmp/scenario-1.log 2>&1 &
    PID1=$!
    
    tsx "$SCENARIO_2" > /tmp/scenario-2.log 2>&1 &
    PID2=$!
    
    tsx "$SCENARIO_3" > /tmp/scenario-3.log 2>&1 &
    PID3=$!
    
    # Wait for all
    wait $PID1
    EXIT1=$?
    
    wait $PID2
    EXIT2=$?
    
    wait $PID3
    EXIT3=$?
    
    # Display results
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    if [ $EXIT1 -eq 0 ]; then
        echo -e "${GREEN}✅ Scenario 1 (Provider): PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 1 (Provider): FAILED${NC}"
        ((FAILED++))
        echo "   Log: /tmp/scenario-1.log"
    fi
    
    if [ $EXIT2 -eq 0 ]; then
        echo -e "${GREEN}✅ Scenario 2 (Agent Payment): PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 2 (Agent Payment): FAILED${NC}"
        ((FAILED++))
        echo "   Log: /tmp/scenario-2.log"
    fi
    
    if [ $EXIT3 -eq 0 ]; then
        echo -e "${GREEN}✅ Scenario 3 (Monitoring): PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 3 (Monitoring): FAILED${NC}"
        ((FAILED++))
        echo "   Log: /tmp/scenario-3.log"
    fi
    
else
    echo -e "${BLUE}🔄 Running scenarios SEQUENTIALLY...${NC}"
    echo ""
    
    # Scenario 1
    echo -e "${YELLOW}▶ Running Scenario 1: Register x402 Endpoint (Provider)${NC}"
    echo "───────────────────────────────────────────────────────────"
    if tsx "$SCENARIO_1"; then
        echo -e "${GREEN}✅ Scenario 1: PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 1: FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
    
    # Scenario 2
    echo -e "${YELLOW}▶ Running Scenario 2: Agent Makes x402 Payment${NC}"
    echo "───────────────────────────────────────────────────────────"
    if tsx "$SCENARIO_2"; then
        echo -e "${GREEN}✅ Scenario 2: PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 2: FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
    
    # Scenario 3
    echo -e "${YELLOW}▶ Running Scenario 3: Monitor Agent Spending${NC}"
    echo "───────────────────────────────────────────────────────────"
    if tsx "$SCENARIO_3"; then
        echo -e "${GREEN}✅ Scenario 3: PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Scenario 3: FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
fi

# Final summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     FINAL TEST SUMMARY                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Scenarios: 3"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ALL SCENARIOS PASSED! ✅          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo "x402 infrastructure is working correctly!"
    echo "All 3 business scenarios validated:"
    echo "  ✅ Provider can monetize endpoints"
    echo "  ✅ Agents can make autonomous payments"
    echo "  ✅ Parents can monitor spending"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  SOME SCENARIOS FAILED ❌          ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the logs and fix issues."
    if [ "$MODE" = "parallel" ]; then
        echo "Logs available in /tmp/scenario-*.log"
    fi
    echo ""
    exit 1
fi

