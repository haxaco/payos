#!/bin/bash

# PayOS UI Validation Script
# User: haxaco@gmail.com
# Purpose: Run demos and validate on UI

set -e

echo ""
echo "🚀 PayOS UI Validation Script"
echo "=============================="
echo "User: haxaco@gmail.com"
echo "Environment: Sandbox"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Run the complete demo
echo -e "${BLUE}Step 1: Running Complete Demo${NC}"
echo "This will generate \$125.80 in transactions..."
echo ""

cd /Users/haxaco/Dev/PayOS/examples
pnpm demo

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Demo completed successfully!${NC}"
    echo ""
else
    echo -e "${RED}❌ Demo failed. Please check errors above.${NC}"
    exit 1
fi

# Step 2: Check if web app is running
echo -e "${BLUE}Step 2: Checking Web App${NC}"
echo ""

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Web app is running at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Web app not running. Starting it now...${NC}"
    echo ""
    echo "Please run in a separate terminal:"
    echo "  cd /Users/haxaco/Dev/PayOS/apps/web"
    echo "  pnpm dev"
    echo ""
    echo "Then press Enter to continue..."
    read
fi

# Step 3: Check if API is running
echo -e "${BLUE}Step 3: Checking API Server${NC}"
echo ""

if curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✅ API server is running at http://localhost:4000${NC}"
else
    echo -e "${YELLOW}⚠️  API server not running. Starting it now...${NC}"
    echo ""
    echo "Please run in a separate terminal:"
    echo "  cd /Users/haxaco/Dev/PayOS/apps/api"
    echo "  pnpm dev"
    echo ""
    echo "Then press Enter to continue..."
    read
fi

# Step 4: Display validation checklist
echo ""
echo -e "${BLUE}Step 4: UI Validation Checklist${NC}"
echo "================================"
echo ""
echo "Now validate on the dashboard:"
echo ""
echo "1. Open browser: http://localhost:3000"
echo "2. Login as: haxaco@gmail.com"
echo ""
echo "Then check each page:"
echo ""
echo -e "${GREEN}📊 Dashboard Home (/dashboard)${NC}"
echo "   [ ] Total activity: \$125.80"
echo "   [ ] Transactions: 6"
echo "   [ ] Protocol breakdown visible"
echo ""
echo -e "${GREEN}💳 Transactions (/dashboard/transfers)${NC}"
echo "   [ ] 6 transactions visible"
echo "   [ ] All show 'Completed' status"
echo "   [ ] Amounts match demo output"
echo ""
echo -e "${GREEN}🔹 x402 Micropayments (/dashboard/agentic-payments/x402)${NC}"
echo "   [ ] 3 API requests visible"
echo "   [ ] Total: \$0.30"
echo "   [ ] Endpoints: AI Generation, Analytics, Image Enhancement"
echo ""
echo -e "${GREEN}🔹 AP2 Mandates (/dashboard/agentic-payments/ap2/mandates)${NC}"
echo "   [ ] 1 mandate visible"
echo "   [ ] Status: Cancelled"
echo "   [ ] Used: \$20 of \$50 (40%)"
echo "   [ ] 2 executions in history"
echo ""
echo -e "${GREEN}🔹 ACP Checkouts (/dashboard/agentic-payments/acp/checkouts)${NC}"
echo "   [ ] 1 order visible"
echo "   [ ] Status: Completed"
echo "   [ ] Total: \$105.50"
echo "   [ ] 2 items in cart"
echo ""
echo -e "${GREEN}📈 Analytics (/dashboard/agentic-payments/analytics)${NC}"
echo "   [ ] Total volume: \$125.80"
echo "   [ ] Protocol breakdown chart"
echo "   [ ] x402: \$0.30 (0.2%)"
echo "   [ ] AP2: \$20.00 (15.9%)"
echo "   [ ] ACP: \$105.50 (83.9%)"
echo ""

# Step 5: Provide direct links
echo ""
echo -e "${BLUE}Step 5: Direct Links${NC}"
echo "===================="
echo ""
echo "Click these links to validate:"
echo ""
echo "🏠 Dashboard Home:"
echo "   http://localhost:3000/dashboard"
echo ""
echo "💳 All Transactions:"
echo "   http://localhost:3000/dashboard/transfers"
echo ""
echo "🔹 x402 Micropayments:"
echo "   http://localhost:3000/dashboard/agentic-payments/x402"
echo ""
echo "🔹 AP2 Mandates:"
echo "   http://localhost:3000/dashboard/agentic-payments/ap2/mandates"
echo ""
echo "🔹 ACP Checkouts:"
echo "   http://localhost:3000/dashboard/agentic-payments/acp/checkouts"
echo ""
echo "📈 Analytics:"
echo "   http://localhost:3000/dashboard/agentic-payments/analytics"
echo ""

# Step 6: Expected values summary
echo ""
echo -e "${BLUE}Step 6: Expected Values Summary${NC}"
echo "==============================="
echo ""
echo "User: haxaco@gmail.com"
echo "Account: acct_haxaco_test"
echo ""
echo "x402 Micropayments:"
echo "  • 3 API requests"
echo "  • Total: \$0.30"
echo "  • Endpoints:"
echo "    - POST /api/ai/generate: \$0.10"
echo "    - GET /api/analytics/insights: \$0.05"
echo "    - POST /api/images/enhance: \$0.15"
echo ""
echo "AP2 Mandate:"
echo "  • 1 mandate (cancelled)"
echo "  • Authorized: \$50.00"
echo "  • Used: \$20.00 (40%)"
echo "  • Remaining: \$30.00"
echo "  • Executions:"
echo "    - Week 1: \$8.00"
echo "    - Week 2: \$12.00"
echo ""
echo "ACP Checkout:"
echo "  • 1 order (completed)"
echo "  • Items:"
echo "    - API Credits × 2: \$90.00"
echo "    - Premium Support × 1: \$20.00"
echo "  • Subtotal: \$110.00"
echo "  • Tax: +\$5.50"
echo "  • Discount: -\$10.00 (WELCOME10)"
echo "  • Total: \$105.50"
echo ""
echo "Grand Total: \$125.80"
echo ""

# Step 7: Troubleshooting
echo -e "${BLUE}Step 7: Troubleshooting${NC}"
echo "======================"
echo ""
echo "If you don't see the transactions:"
echo ""
echo "1. Check demo output above for errors"
echo "2. Verify you're logged in as: haxaco@gmail.com"
echo "3. Refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)"
echo "4. Check browser console for errors (F12)"
echo "5. Re-run this script if needed"
echo ""

# Step 8: Success message
echo ""
echo -e "${GREEN}✅ Validation script complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login as haxaco@gmail.com"
echo "3. Follow the checklist above"
echo "4. Mark each item as you verify it"
echo ""
echo "Happy validating! 🎉"
echo ""

