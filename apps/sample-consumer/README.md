# PayOS Sample Consumer - Multi-Protocol Demo

Demonstrates the new unified `@sly/sdk` with support for:
- **x402**: Micropayments for API monetization
- **AP2**: Mandate-based subscriptions (Google AP2)
- **ACP**: E-commerce checkout (Stripe/OpenAI ACP)

## Features

This sample demonstrates an AI agent that can:
1. Pay for API calls automatically (x402)
2. Set up recurring subscriptions with spending limits (AP2)
3. Complete checkout flows for purchases (ACP)

## Setup

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env

# Edit .env and set:
# PAYOS_API_KEY=payos_sandbox_test  # for sandbox testing
# or get a real key from: http://localhost:3000/dashboard/api-keys

# Run the demo
pnpm dev
```

## Environment Variables

```bash
# PayOS Configuration
PAYOS_API_KEY=payos_sandbox_test     # Your API key
PAYOS_ENVIRONMENT=sandbox             # sandbox | testnet | production
PAYOS_API_URL=http://localhost:4000  # API endpoint

# User Configuration
USER_EMAIL=haxaco@gmail.com
USER_ACCOUNT_ID=acct_haxaco_test

# Provider URL (for x402 demo)
PROVIDER_API_URL=http://localhost:4001
```

## Usage

```bash
# Interactive demo (all protocols)
pnpm dev

# Run specific protocol demos
pnpm dev:x402     # x402 micropayments only
pnpm dev:ap2      # AP2 subscription only
pnpm dev:acp      # ACP checkout only
```

## What It Does

### x402 Demo
- Automatically pays for premium API endpoints
- Enforces spending limits ($0.50 per request, $10/day)
- Real-time balance tracking

### AP2 Demo
- Creates a monthly subscription mandate ($50 authorized)
- Makes usage-based charges (Week 1: $8, Week 2: $12)
- Shows remaining authorization
- Cancels the mandate at the end

### ACP Demo
- Creates a shopping cart with 2 items
- Applies tax and discount codes
- Completes checkout with payment
- Returns order confirmation

## Viewing Results

After running the demo, view transactions at:
- http://localhost:3000/dashboard/transfers
- http://localhost:3000/dashboard/agentic-payments/x402
- http://localhost:3000/dashboard/agentic-payments/ap2/mandates
- http://localhost:3000/dashboard/agentic-payments/acp/checkouts

## Architecture

```
sample-consumer/
├── src/
│   ├── index.ts       # Main entry point & CLI
│   ├── x402-demo.ts   # x402 micropayments
│   ├── ap2-demo.ts    # AP2 subscriptions
│   └── acp-demo.ts    # ACP checkouts
├── package.json
└── .env
```

## Troubleshooting

**401 Unauthorized**: Get a valid API key from the dashboard
**Connection Refused**: Make sure the API server is running (`cd apps/api && pnpm dev`)
**Provider Not Found**: For x402 demo, start the provider (`cd apps/sample-provider && pnpm dev`)

