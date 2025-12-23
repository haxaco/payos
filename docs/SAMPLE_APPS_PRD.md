# x402 Sample Applications PRD

> Product Requirements for sample applications demonstrating x402 SDK integration.
> 
> **Goal:** Make it as simple as possible for developers to incorporate x402 into their workflow, whether as a provider (monetizing APIs) or consumer (calling paid APIs).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [PayOS Concepts](#payos-concepts)
3. [Getting Started](#getting-started)
4. [Provider Setup](#provider-setup-monetize-your-apis)
5. [Consumer Setup](#consumer-setup-call-paid-apis)
6. [Sample App 1: Weather API Provider](#sample-app-1-weather-api-provider)
7. [Sample App 2: AI Agent Consumer](#sample-app-2-ai-agent-consumer)
8. [E2E Testing](#e2e-testing)
9. [API Reference](#api-reference)
10. [Future Work](#future-work)

---

## Overview

### What is x402?

x402 is an open protocol for HTTP-native payments. When an API server returns HTTP status code `402 Payment Required`, the client:

1. Reads payment details from response headers
2. Processes payment through PayOS
3. Retries the request with proof of payment
4. Receives the protected resource

This enables machine-to-machine payments without pre-negotiated contracts or API key subscriptions.

### What is PayOS?

PayOS is the payment orchestration layer for x402. It provides:

- **For API Providers:** Register endpoints, set pricing, receive payments, track revenue
- **For API Consumers (Agents):** Manage wallets, process payments, track spending
- **Settlement:** Instant wallet-to-wallet transfers with configurable fees

### Provider vs Consumer

These are **not different account types** - they are different business roles:

| Role | What You Do | Example |
|------|-------------|---------|
| **Provider** | Monetize your APIs by returning 402 for paid endpoints | Weather API charging $0.001/request |
| **Consumer** | Call paid APIs, pay automatically via your wallet | AI agent researching weather data |

A single organization can be **both** - consuming APIs from other businesses while providing APIs to others.

---

## PayOS Concepts

Before starting, understand these key concepts:

### Organization (Tenant)

When you sign up for PayOS, you create an **organization**. This is the top-level container for all your PayOS resources.

### Account

An **account** represents a business entity that can send or receive payments. Accounts are used to:
- Receive revenue from API monetization (as a provider)
- Track spending on external APIs (as a consumer)

### Wallet

A **wallet** holds funds in a specific currency (e.g., USDC). Wallets are:
- **Created explicitly** via API or dashboard
- **Linked to accounts** for payment operations
- Used to pay for API calls (consumer) or receive payments (provider)

### Agent

An **agent** is an AI or automated system that makes API calls autonomously. Agents:
- Are registered with PayOS for tracking and security
- Have **one wallet assigned** for spending
- Can call any x402-enabled API and pay automatically

### API Key

An **API key** authenticates programmatic access to PayOS APIs. Keys are:
- Currently **user-scoped** (can access all organization resources)
- Used by SDKs to interact with PayOS
- Found in the PayOS dashboard under **Settings → API Keys**

---

## Getting Started

### Step 1: Create a PayOS Account

1. Navigate to the PayOS dashboard: `https://dashboard.payos.ai` (or `http://localhost:3000` for local development)

2. Click **"Sign Up"** and complete registration

3. Verify your email address

4. You now have a PayOS organization!

### Step 2: Get Your API Key

1. Log into the PayOS dashboard

2. Navigate to **Settings → API Keys**

3. Click **"Create API Key"**

4. Give it a name (e.g., "Development Key")

5. Copy the API key - **you won't see it again!**

```
┌─────────────────────────────────────────────────────────────┐
│  Settings → API Keys                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your API Keys                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Name              Created        Last Used                 │
│  ──────────────────────────────────────────────────────     │
│  Development Key   Dec 23, 2024   Never         [Revoke]    │
│  Production Key    Dec 20, 2024   2 hours ago   [Revoke]    │
│                                                             │
│  [+ Create API Key]                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ⚠️ Keep your API keys secure. Never commit them to git.    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Your API key looks like: `pk_live_a1b2c3d4e5f6...` or `pk_test_...` for test mode.

---

## Provider Setup (Monetize Your APIs)

To monetize your APIs with x402, you need:
1. An **Account** to receive payments
2. A **Wallet** linked to that account
3. The **Provider SDK** integrated into your API

### Step 3a: Create an Account

Using your API key, create an account to receive payments:

**Request:**
```bash
curl -X POST https://api.payos.ai/v1/accounts \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API Inc",
    "type": "business",
    "email": "billing@weatherapi.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "acc_a1b2c3d4e5f6",
    "name": "Weather API Inc",
    "type": "business",
    "email": "billing@weatherapi.com",
    "status": "active",
    "createdAt": "2024-12-23T10:30:00Z"
  }
}
```

Save the `id` - this is your **Account ID** (`acc_a1b2c3d4e5f6`).

### Step 4a: Create a Wallet

Create a wallet to receive payments:

**Request:**
```bash
curl -X POST https://api.payos.ai/v1/wallets \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc_a1b2c3d4e5f6",
    "currency": "USDC",
    "name": "Revenue Wallet"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wal_x1y2z3w4v5u6",
    "accountId": "acc_a1b2c3d4e5f6",
    "name": "Revenue Wallet",
    "currency": "USDC",
    "balance": "0.00",
    "address": "0x1234...abcd",
    "status": "active",
    "createdAt": "2024-12-23T10:31:00Z"
  }
}
```

Save the `id` - this is your **Wallet ID** (`wal_x1y2z3w4v5u6`).

### Step 5a: Integrate the Provider SDK

Install the SDK:
```bash
npm install @payos/x402-provider-sdk
```

Initialize with your API key:
```typescript
import { X402Provider } from '@payos/x402-provider-sdk';

const x402 = new X402Provider({
  apiKey: 'pk_live_your_api_key'
});
```

That's it! See [Sample App 1](#sample-app-1-weather-api-provider) for full implementation.

---

## Consumer Setup (Call Paid APIs)

To call paid APIs with automatic payment, you need:
1. An **Agent** registered with PayOS
2. A **Wallet** with funds, assigned to that agent
3. The **Consumer SDK** integrated into your application

### Step 3b: Create an Agent

Register your AI/bot with PayOS:

**Request:**
```bash
curl -X POST https://api.payos.ai/v1/agents \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Agent",
    "description": "AI agent that researches topics by calling various APIs",
    "capabilities": ["api_calls", "web_search"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agt_m1n2o3p4q5r6",
    "name": "Research Agent",
    "description": "AI agent that researches topics by calling various APIs",
    "capabilities": ["api_calls", "web_search"],
    "status": "active",
    "walletId": null,
    "createdAt": "2024-12-23T10:35:00Z"
  }
}
```

Save the `id` - this is your **Agent ID** (`agt_m1n2o3p4q5r6`).

Note: `walletId` is `null` - the agent needs a wallet assigned before it can make payments.

### Step 4b: Create a Wallet for the Agent

Create a wallet that will fund the agent's API calls:

**Request:**
```bash
curl -X POST https://api.payos.ai/v1/wallets \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USDC",
    "name": "Agent Spending Wallet"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wal_s1t2u3v4w5x6",
    "name": "Agent Spending Wallet",
    "currency": "USDC",
    "balance": "0.00",
    "address": "0x5678...efgh",
    "status": "active",
    "createdAt": "2024-12-23T10:36:00Z"
  }
}
```

### Step 5b: Assign Wallet to Agent

Link the wallet to your agent:

**Request:**
```bash
curl -X PATCH https://api.payos.ai/v1/agents/agt_m1n2o3p4q5r6 \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wal_s1t2u3v4w5x6"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agt_m1n2o3p4q5r6",
    "name": "Research Agent",
    "description": "AI agent that researches topics by calling various APIs",
    "capabilities": ["api_calls", "web_search"],
    "status": "active",
    "walletId": "wal_s1t2u3v4w5x6",
    "updatedAt": "2024-12-23T10:37:00Z"
  }
}
```

### Step 6b: Fund the Wallet

Add funds to the wallet so the agent can pay for API calls:

**Request:**
```bash
curl -X POST https://api.payos.ai/v1/wallets/wal_s1t2u3v4w5x6/deposit \
  -H "Authorization: Bearer pk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "USDC",
    "source": "bank_transfer"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dep_a1b2c3d4e5f6",
    "walletId": "wal_s1t2u3v4w5x6",
    "amount": "100.00",
    "currency": "USDC",
    "status": "completed",
    "newBalance": "100.00",
    "createdAt": "2024-12-23T10:38:00Z"
  }
}
```

### Step 7b: Integrate the Consumer SDK

Install the SDK:
```bash
npm install @payos/x402-client-sdk
```

Initialize with your API key and agent ID:
```typescript
import { X402Client } from '@payos/x402-client-sdk';

const x402 = new X402Client({
  apiKey: 'pk_live_your_api_key',
  agentId: 'agt_m1n2o3p4q5r6'  // Wallet is looked up from agent
});
```

That's it! See [Sample App 2](#sample-app-2-ai-agent-consumer) for full implementation.

---

## Sample App 1: Weather API Provider

A complete example of an API that monetizes endpoints using x402.

### What You'll Build

- Express.js API with free and paid endpoints
- x402 middleware that returns 402 for unpaid requests
- Automatic payment verification

### Prerequisites

- Node.js 18+
- PayOS account with API key
- Account and wallet created (see [Provider Setup](#provider-setup-monetize-your-apis))

### Project Setup

```bash
mkdir weather-api
cd weather-api
npm init -y
npm install express @payos/x402-provider-sdk
npm install -D typescript @types/express @types/node tsx
```

### Environment Variables

Create a `.env` file:
```bash
# From PayOS Dashboard → Settings → API Keys
PAYOS_API_KEY=pk_live_your_api_key

# From creating your account (Step 3a)
PAYOS_ACCOUNT_ID=acc_a1b2c3d4e5f6

# Optional
PORT=4000
```

### Implementation

Create `src/server.ts`:

```typescript
import express from 'express';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = express();
app.use(express.json());

// ============================================
// Initialize x402 Provider
// ============================================

const x402 = new X402Provider({
  apiKey: process.env.PAYOS_API_KEY!,
  accountId: process.env.PAYOS_ACCOUNT_ID  // Optional if you only have one account
});

// ============================================
// Register Paid Endpoints (run once on startup)
// ============================================

async function registerEndpoints() {
  // Register the forecast endpoint - $0.001 per call
  await x402.register('/api/weather/forecast', {
    name: 'Weather Forecast API',
    description: '5-day weather forecast',
    price: 0.001,
    currency: 'USDC'
  });

  console.log('✅ Endpoints registered with PayOS');
}

// ============================================
// API Routes
// ============================================

// Free endpoint - no payment required
app.get('/api/weather/current', (req, res) => {
  const location = req.query.location || 'San Francisco';
  
  res.json({
    location,
    temperature: 68,
    conditions: 'Partly cloudy',
    tier: 'free'
  });
});

// Paid endpoint - x402.protect() middleware checks for payment
app.get('/api/weather/forecast', x402.protect(), (req: any, res) => {
  const location = req.query.location || 'San Francisco';
  
  res.json({
    location,
    forecast: [
      { day: 'Mon', high: 72, low: 58 },
      { day: 'Tue', high: 75, low: 60 },
      { day: 'Wed', high: 70, low: 55 },
      { day: 'Thu', high: 68, low: 52 },
      { day: 'Fri', high: 65, low: 50 }
    ],
    tier: 'premium',
    payment: req.x402Payment  // Payment details from middleware
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🌤️ Weather API running on http://localhost:${PORT}`);
  await registerEndpoints();
});
```

### Running the Provider

```bash
npx tsx src/server.ts
```

### Testing the Provider

**Free endpoint (works without payment):**
```bash
curl http://localhost:4000/api/weather/current
```

**Response:**
```json
{
  "location": "San Francisco",
  "temperature": 68,
  "conditions": "Partly cloudy",
  "tier": "free"
}
```

**Paid endpoint (returns 402 without payment):**
```bash
curl -v http://localhost:4000/api/weather/forecast
```

**Response (HTTP 402):**
```
< HTTP/1.1 402 Payment Required
< X-Payment-Required: true
< X-Payment-Amount: 0.001
< X-Payment-Currency: USDC
< X-Endpoint-ID: ep_abc123
< X-Payment-Address: 0x1234...abcd

{
  "error": "Payment Required",
  "message": "This endpoint requires payment of 0.001 USDC",
  "paymentDetails": {
    "amount": 0.001,
    "currency": "USDC",
    "endpointId": "ep_abc123",
    "paymentAddress": "0x1234...abcd"
  }
}
```

---

## Sample App 2: AI Agent Consumer

A complete example of an AI agent that calls paid APIs with automatic payment.

### What You'll Build

- CLI application that calls weather APIs
- Automatic 402 detection and payment
- Spending tracking and limits

### Prerequisites

- Node.js 18+
- PayOS account with API key
- Agent with wallet created and funded (see [Consumer Setup](#consumer-setup-call-paid-apis))
- Weather API provider running (from Sample App 1)

### Project Setup

```bash
mkdir weather-agent
cd weather-agent
npm init -y
npm install @payos/x402-client-sdk
npm install -D typescript @types/node tsx
```

### Environment Variables

Create a `.env` file:
```bash
# From PayOS Dashboard → Settings → API Keys
PAYOS_API_KEY=pk_live_your_api_key

# From creating your agent (Step 3b)
PAYOS_AGENT_ID=agt_m1n2o3p4q5r6

# The Weather API URL (from Sample App 1)
WEATHER_API_URL=http://localhost:4000
```

### Implementation

Create `src/agent.ts`:

```typescript
import { X402Client } from '@payos/x402-client-sdk';

// ============================================
// Initialize x402 Client
// ============================================

const x402 = new X402Client({
  apiKey: process.env.PAYOS_API_KEY!,
  agentId: process.env.PAYOS_AGENT_ID!,
  
  // Safety limits (optional but recommended)
  maxAutoPayAmount: 0.10,  // Don't pay more than $0.10 per request
  maxDailySpend: 10.00,    // Daily spending cap
  
  // Callbacks (optional)
  onPayment: (payment) => {
    console.log(`💰 Paid ${payment.amount} ${payment.currency}`);
    console.log(`   New balance: $${payment.newWalletBalance}`);
  }
});

// ============================================
// Agent Functions
// ============================================

async function getWeatherForecast(location: string) {
  console.log(`\n🔍 Fetching forecast for ${location}...`);
  
  // x402.fetch() handles everything:
  // 1. Makes request to API
  // 2. If 402 returned, reads payment details
  // 3. Processes payment via PayOS
  // 4. Retries request with payment proof
  // 5. Returns successful response
  
  const response = await x402.fetch(
    `${process.env.WEATHER_API_URL}/api/weather/forecast?location=${location}`
  );
  
  if (response.ok) {
    const data = await response.json();
    console.log('\n✅ Forecast received:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } else {
    console.error(`❌ Failed: ${response.status}`);
    return null;
  }
}

async function checkBalance() {
  const status = await x402.getStatus();
  
  console.log('\n💳 Agent Status:');
  console.log(`   Balance: $${status.balance.toFixed(4)}`);
  console.log(`   Today's spend: $${status.todaySpend.toFixed(4)}`);
  console.log(`   Daily limit: $${status.dailyLimit || 'None'}`);
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🤖 AI Agent Starting...\n');
  
  // Check initial balance
  await checkBalance();
  
  // Get weather forecast (will auto-pay)
  await getWeatherForecast('San Francisco');
  
  // Check balance after payment
  await checkBalance();
}

main().catch(console.error);
```

### Running the Agent

```bash
npx tsx src/agent.ts
```

### Expected Output

```
🤖 AI Agent Starting...

💳 Agent Status:
   Balance: $100.0000
   Today's spend: $0.0000
   Daily limit: $10.00

🔍 Fetching forecast for San Francisco...
💰 Paid 0.001 USDC
   New balance: $99.999

✅ Forecast received:
{
  "location": "San Francisco",
  "forecast": [
    { "day": "Mon", "high": 72, "low": 58 },
    { "day": "Tue", "high": 75, "low": 60 },
    ...
  ],
  "tier": "premium",
  "payment": {
    "transferId": "txn_abc123",
    "amount": 0.001,
    "currency": "USDC"
  }
}

💳 Agent Status:
   Balance: $99.9990
   Today's spend: $0.0010
   Daily limit: $10.00
```

---

## E2E Testing

### Test Scenario: Complete Payment Flow

1. **Start the Provider** (Terminal 1):
```bash
cd weather-api
PAYOS_API_KEY=pk_xxx PAYOS_ACCOUNT_ID=acc_xxx npx tsx src/server.ts
```

2. **Run the Agent** (Terminal 2):
```bash
cd weather-agent
PAYOS_API_KEY=pk_xxx PAYOS_AGENT_ID=agt_xxx npx tsx src/agent.ts
```

3. **Verify in Dashboard**:
   - Provider account shows revenue increase
   - Agent wallet shows balance decrease
   - Transfer visible in transaction history

### What Happens Behind the Scenes

```
┌─────────────────────────────────────────────────────────────────┐
│                         Payment Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent                     PayOS                    Provider     │
│    │                         │                          │        │
│    │  1. GET /forecast       │                          │        │
│    │─────────────────────────────────────────────────────>       │
│    │                         │                          │        │
│    │  2. 402 Payment Required (headers)                 │        │
│    │<─────────────────────────────────────────────────────       │
│    │                         │                          │        │
│    │  3. POST /v1/x402/pay   │                          │        │
│    │─────────────────────────>                          │        │
│    │                         │                          │        │
│    │  4. Payment processed   │                          │        │
│    │     (wallet debited)    │                          │        │
│    │<─────────────────────────                          │        │
│    │                         │                          │        │
│    │  5. GET /forecast + proof                          │        │
│    │─────────────────────────────────────────────────────>       │
│    │                         │                          │        │
│    │                         │  6. Verify payment       │        │
│    │                         │<──────────────────────────        │
│    │                         │                          │        │
│    │                         │  7. Payment valid        │        │
│    │                         │──────────────────────────>        │
│    │                         │                          │        │
│    │  8. 200 OK + forecast data                         │        │
│    │<─────────────────────────────────────────────────────       │
│    │                         │                          │        │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Provider SDK

```typescript
import { X402Provider } from '@payos/x402-provider-sdk';

// Initialize
const x402 = new X402Provider({
  apiKey: string,        // Required: Your PayOS API key
  accountId?: string,    // Optional: Account ID (if multiple accounts)
  apiUrl?: string,       // Optional: PayOS API URL (default: production)
  debug?: boolean        // Optional: Enable debug logging
});

// Register an endpoint for monetization
await x402.register(
  path: string,          // API path (e.g., '/api/data')
  config: {
    name: string,        // Display name
    description?: string,// Optional description
    price: number,       // Price per call (e.g., 0.001)
    currency?: string,   // 'USDC' | 'EURC' (default: USDC)
    volumeDiscounts?: [  // Optional volume discounts
      { threshold: 100, discount: 0.1 }  // 10% off after 100 calls
    ]
  },
  method?: string        // HTTP method (default: 'GET')
);

// Middleware for Express/Connect
app.get('/api/data', x402.protect(), handler);

// Middleware for Hono
app.get('/api/data', x402.honoMiddleware(), handler);

// Get revenue analytics
const analytics = await x402.getAnalytics(period?: '7d' | '30d' | '90d');
```

### Consumer SDK

```typescript
import { X402Client } from '@payos/x402-client-sdk';

// Initialize
const x402 = new X402Client({
  apiKey: string,           // Required: Your PayOS API key
  agentId: string,          // Required: Agent ID (wallet looked up from agent)
  walletId?: string,        // Optional: Override wallet
  apiUrl?: string,          // Optional: PayOS API URL
  maxAutoPayAmount?: number,// Optional: Max per-request payment
  maxDailySpend?: number,   // Optional: Daily spending limit
  onPayment?: (payment) => void,      // Optional: Payment callback
  onLimitReached?: (limit) => void,   // Optional: Limit reached callback
  debug?: boolean           // Optional: Enable debug logging
});

// Fetch with automatic payment handling
const response = await x402.fetch(url: string, options?: RequestInit);

// Get wallet and spending status
const status = await x402.getStatus();
// Returns: { balance, currency, todaySpend, dailyLimit, remaining }

// Get price quote for an endpoint
const quote = await x402.getQuote(endpointId: string);
```

---

## Future Work

### Epic: Enhanced API Key Security

Currently, API keys are user-scoped. For better security with AI agents, consider:

- [ ] **Agent-specific API keys**: Each agent gets its own key
- [ ] **Key rotation**: Agents can spawn new keys and revoke old ones
- [ ] **Scoped permissions**: Keys with limited permissions (read-only, spending limits)
- [ ] **Key auditing**: Track which key performed which action

### Epic: Advanced Wallet Management

- [ ] **Multi-wallet agents**: Agent can access multiple wallets for different purposes
- [ ] **Wallet linking**: Connect existing external wallets (not just PayOS-created)
- [ ] **Auto-funding**: Automatically top up agent wallets from a master wallet

### Epic: Provider Features

- [ ] **Tiered pricing**: Different prices for different API tiers
- [ ] **Subscription endpoints**: Monthly access passes instead of per-call
- [ ] **Rate limiting**: Combine with payment for abuse prevention

---

## Appendix: Quick Reference

### Provider Checklist

- [ ] Sign up on PayOS dashboard
- [ ] Get API key from Settings → API Keys
- [ ] Create an Account via API
- [ ] Create a Wallet for that Account
- [ ] Install `@payos/x402-provider-sdk`
- [ ] Initialize with `apiKey` (and `accountId` if multiple)
- [ ] Register endpoints with `x402.register()`
- [ ] Protect routes with `x402.protect()`

### Consumer Checklist

- [ ] Sign up on PayOS dashboard
- [ ] Get API key from Settings → API Keys
- [ ] Create an Agent via API
- [ ] Create a Wallet via API
- [ ] Assign Wallet to Agent via API
- [ ] Fund the Wallet via API or dashboard
- [ ] Install `@payos/x402-client-sdk`
- [ ] Initialize with `apiKey` and `agentId`
- [ ] Use `x402.fetch()` for automatic payments

