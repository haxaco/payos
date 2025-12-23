# x402 Sample Applications PRD

> Product Requirements for sample applications demonstrating x402 SDK integration.
> 
> **Goal:** Make it as simple as possible for developers to incorporate x402 into their workflow, whether as a provider (monetizing APIs) or consumer (calling paid APIs).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [PayOS Onboarding](#payos-onboarding)
3. [SDK Design Philosophy](#sdk-design-philosophy)
4. [App 1: Weather API Provider](#app-1-weather-api-provider)
5. [App 2: AI Agent Consumer](#app-2-ai-agent-consumer)
6. [App 3: Compliance Service (Both)](#app-3-compliance-service-both)
7. [E2E Testing](#e2e-testing)
8. [Success Metrics](#success-metrics)

---

## Overview

### What is x402?

x402 is an open protocol for HTTP-native payments. When a server returns HTTP 402 (Payment Required), the client automatically:
1. Parses payment details from response headers
2. Processes payment via a payment provider (PayOS)
3. Retries the request with proof of payment
4. Receives the protected resource

### PayOS Role

PayOS is the payment orchestration layer that:
- **For Providers:** Registers endpoints, verifies payments, tracks revenue
- **For Consumers:** Manages wallets, processes payments, tracks spending
- **Settlement:** Handles instant wallet-to-wallet transfers

### Sample Apps Overview

| App | Role | Description |
|-----|------|-------------|
| **Weather API** | Provider | Monetizes weather data endpoints |
| **AI Agent** | Consumer | Autonomous agent that calls paid APIs |
| **Compliance Service** | Both | Sells compliance checks, uses upstream APIs |

---

## PayOS Onboarding

> **Critical:** Before using the SDK, users must complete PayOS onboarding.

### Step 1: Create PayOS Account

**Via Dashboard:**
1. Navigate to `https://dashboard.payos.ai` (or `http://localhost:3000` for local dev)
2. Click "Sign Up"
3. Complete email verification
4. You now have a PayOS account

**Via API (programmatic):**
```bash
curl -X POST https://api.payos.ai/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "secure-password",
    "name": "My Company"
  }'
```

### Step 2: Create an Account (Provider or Consumer)

An "Account" in PayOS represents an entity that can send/receive payments.

**For API Providers:**
```bash
curl -X POST https://api.payos.ai/v1/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API Provider",
    "type": "business",
    "email": "billing@weatherapi.com"
  }'
```

**For AI Agent Consumers:**
```bash
curl -X POST https://api.payos.ai/v1/agents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Agent",
    "description": "AI agent that researches topics by calling various APIs",
    "capabilities": ["web_search", "api_calls"]
  }'
```

**Response includes:**
- `id` - Your account/agent ID
- `apiKey` - API key for SDK authentication (for agents)
- `walletId` - Auto-created wallet for payments (for agents)

### Step 3: Fund Your Wallet (Consumers Only)

Agents need funds to pay for API calls:

```bash
# Get wallet details
curl https://api.payos.ai/v1/wallets/YOUR_WALLET_ID \
  -H "Authorization: Bearer YOUR_API_KEY"

# Fund wallet (via dashboard or API)
curl -X POST https://api.payos.ai/v1/wallets/YOUR_WALLET_ID/fund \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USDC",
    "source": "card_xxxx"
  }'
```

### Step 4: Get API Key

**For Providers:**
```bash
curl -X POST https://api.payos.ai/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "accountId": "YOUR_ACCOUNT_ID",
    "permissions": ["endpoints:write", "endpoints:read", "analytics:read"]
  }'
```

**For Agents (created automatically with agent):**
When you create an agent, an API key is automatically generated and returned.

### Quick Reference

| Role | What You Need | How to Get It |
|------|---------------|---------------|
| **Provider** | Account ID + API Key | Create account, generate API key |
| **Consumer (Agent)** | API Key only | Create agent (wallet auto-created) |
| **Consumer (Manual)** | API Key + Wallet ID | Create account, create wallet, generate API key |

---

## SDK Design Philosophy

### Principle 1: Minimal Configuration

**Provider SDK - Only needs API key:**
```typescript
import { X402Provider } from '@payos/x402-provider-sdk';

const provider = new X402Provider({
  apiKey: 'pk_live_xxx'  // That's it!
});

// Account ID is derived from API key
// API URL defaults to production
```

**Consumer SDK - Only needs API key (for agents):**
```typescript
import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({
  apiKey: 'ak_live_xxx'  // Agent API key - wallet is auto-derived
});

// Wallet is automatically determined from the authenticated agent
```

### Principle 2: Smart Defaults, Optional Overrides

```typescript
// Simple: Use defaults
const client = new X402Client({
  apiKey: 'ak_live_xxx'
});

// Advanced: Override specific options
const client = new X402Client({
  apiKey: 'ak_live_xxx',
  walletId: 'specific-wallet',  // Optional: use specific wallet
  apiUrl: 'https://api.payos.ai',  // Optional: custom API URL
  maxAutoPayAmount: 1.0,  // Optional: limit auto-payments
  debug: true  // Optional: enable logging
});
```

### Principle 3: Zero-Config for Common Cases

**Provider middleware should just work:**
```typescript
import express from 'express';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = express();
const x402 = new X402Provider({ apiKey: 'pk_live_xxx' });

// Register endpoint (one-time, on app startup)
await x402.register('/api/data', {
  name: 'Data API',
  price: 0.001
});

// Protect route (that's it!)
app.get('/api/data', x402.protect(), (req, res) => {
  res.json({ data: 'premium content' });
});
```

**Consumer fetch should just work:**
```typescript
import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({ apiKey: 'ak_live_xxx' });

// Just fetch - payment handled automatically
const response = await client.fetch('https://api.weather.com/premium');
const data = await response.json();
```

---

## App 1: Weather API Provider

### Description

A REST API that monetizes weather data. Free tier for basic weather, paid tier for detailed forecasts and historical data.

### User Journey

1. **Developer signs up for PayOS**
2. **Creates a business account** for their Weather API
3. **Gets API key** with endpoint permissions
4. **Integrates SDK** into their Express/Fastify/Hono app
5. **Registers endpoints** with pricing
6. **Deploys** - endpoints are now monetized!

### Technical Specification

**Stack:**
- Runtime: Node.js 20+
- Framework: Express
- SDK: `@payos/x402-provider-sdk`

**Endpoints:**

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/weather/current` | Free | Current conditions |
| `GET /api/weather/forecast` | $0.001 | 5-day forecast |
| `GET /api/weather/historical` | $0.01 | 30-day history |
| `POST /api/weather/alerts` | $0.005 | Custom weather alerts |

**Complete Implementation:**

```typescript
// server.ts
import express from 'express';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = express();
app.use(express.json());

// Initialize provider with just API key
const x402 = new X402Provider({
  apiKey: process.env.PAYOS_API_KEY!,
  debug: process.env.NODE_ENV === 'development'
});

// Startup: Register all monetized endpoints
async function registerEndpoints() {
  await x402.register('/api/weather/forecast', {
    name: 'Weather Forecast API',
    description: '5-day weather forecast with hourly resolution',
    price: 0.001,
    currency: 'USDC'
  });

  await x402.register('/api/weather/historical', {
    name: 'Historical Weather API',
    description: '30-day historical weather data',
    price: 0.01,
    currency: 'USDC',
    volumeDiscounts: [
      { threshold: 100, discount: 0.1 },   // 10% off after 100 calls
      { threshold: 1000, discount: 0.25 }  // 25% off after 1000 calls
    ]
  });

  console.log('✅ Endpoints registered with PayOS');
}

// Free endpoint - no protection
app.get('/api/weather/current', (req, res) => {
  res.json({
    location: req.query.location || 'San Francisco',
    temperature: 68,
    conditions: 'Partly cloudy',
    tier: 'free'
  });
});

// Paid endpoint - protected by x402
app.get('/api/weather/forecast', x402.protect(), (req, res) => {
  res.json({
    location: req.query.location || 'San Francisco',
    forecast: [
      { day: 1, high: 72, low: 58, conditions: 'Sunny' },
      { day: 2, high: 75, low: 60, conditions: 'Clear' },
      { day: 3, high: 70, low: 55, conditions: 'Cloudy' },
      { day: 4, high: 68, low: 52, conditions: 'Rain' },
      { day: 5, high: 65, low: 50, conditions: 'Sunny' }
    ],
    tier: 'premium',
    payment: req.x402Payment  // Payment details attached by middleware
  });
});

app.get('/api/weather/historical', x402.protect(), (req, res) => {
  // Return 30 days of historical data
  const days = parseInt(req.query.days as string) || 30;
  const data = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    high: 60 + Math.random() * 20,
    low: 40 + Math.random() * 20,
    precipitation: Math.random() * 0.5
  }));

  res.json({ location: req.query.location, period: `${days} days`, data });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  await registerEndpoints();
  console.log(`🌤️ Weather API running on http://localhost:${PORT}`);
});
```

**Environment Variables:**
```bash
PAYOS_API_KEY=pk_live_xxxxxxxxxxxxx  # From PayOS dashboard
PORT=4000  # Optional, defaults to 4000
```

**Testing:**
```bash
# Free endpoint (should work)
curl http://localhost:4000/api/weather/current

# Paid endpoint (should return 402)
curl -v http://localhost:4000/api/weather/forecast

# Check 402 headers:
# X-Payment-Required: true
# X-Payment-Amount: 0.001
# X-Payment-Currency: USDC
```

---

## App 2: AI Agent Consumer

### Description

An autonomous AI agent that calls various paid APIs to accomplish tasks. The agent is registered in PayOS with its own wallet, enabling it to pay for API access without human intervention.

### User Journey

1. **Developer signs up for PayOS**
2. **Creates an agent** - receives API key and auto-funded wallet
3. **Integrates SDK** into their agent code
4. **Agent makes API calls** - payments happen automatically
5. **Monitor spending** in PayOS dashboard

### Why Agent Model?

Traditional API integrations require:
- Managing API keys for each service
- Pre-paying or setting up billing with each provider
- Manual intervention when credits run out

With x402 + PayOS:
- Single wallet for all x402-enabled APIs
- Automatic payment on 402 response
- Unified spending visibility
- Spending limits and controls

### Technical Specification

**Stack:**
- Runtime: Node.js 20+
- SDK: `@payos/x402-client-sdk`

**Agent Configuration:**
```typescript
// Agent is registered in PayOS with:
// - Unique agent ID
// - API key for authentication
// - Wallet (auto-created, auto-linked)
// - Spending limits (configurable)
```

**Complete Implementation:**

```typescript
// agent.ts
import { X402Client } from '@payos/x402-client-sdk';

// Initialize with just the agent API key
// Wallet is automatically determined from the authenticated agent
const x402 = new X402Client({
  apiKey: process.env.PAYOS_AGENT_KEY!,  // Agent's API key
  
  // Optional: Safety limits
  maxAutoPayAmount: 0.10,  // Don't auto-pay more than $0.10/request
  maxDailySpend: 10.0,     // Daily spending limit
  
  // Optional: Callbacks
  onPayment: (payment) => {
    console.log(`💰 Paid $${payment.amount} for ${payment.endpoint}`);
  },
  onLimitReached: (limit) => {
    console.warn(`⚠️ Spending limit reached: ${limit.type}`);
  }
});

// Simple usage: Just fetch, payment handled automatically
async function getWeatherForecast(location: string) {
  const response = await x402.fetch(
    `https://weather-api.example.com/api/weather/forecast?location=${location}`
  );
  
  if (response.ok) {
    return await response.json();
  }
  
  throw new Error(`Weather API failed: ${response.status}`);
}

// Usage with multiple APIs
async function researchTopic(topic: string) {
  // Call news API (x402-enabled)
  const news = await x402.fetch(
    `https://news-api.example.com/search?q=${topic}`
  );
  
  // Call analysis API (x402-enabled)
  const analysis = await x402.fetch(
    `https://analysis-api.example.com/analyze`,
    {
      method: 'POST',
      body: JSON.stringify({ topic, context: await news.json() })
    }
  );
  
  return await analysis.json();
}

// Check agent's spending status
async function checkBudget() {
  const status = await x402.getStatus();
  
  console.log(`
    Wallet Balance: $${status.balance}
    Today's Spend:  $${status.todaySpend}
    Daily Limit:    $${status.dailyLimit}
    Remaining:      $${status.remaining}
  `);
  
  return status;
}

// Main agent loop
async function main() {
  console.log('🤖 AI Agent starting...\n');
  
  // Check we have budget
  const budget = await checkBudget();
  if (budget.remaining < 1) {
    console.error('❌ Insufficient budget');
    return;
  }
  
  // Get weather forecast (will auto-pay if needed)
  const forecast = await getWeatherForecast('San Francisco');
  console.log('Weather:', forecast);
  
  // Research a topic (multiple paid API calls)
  const research = await researchTopic('renewable energy');
  console.log('Research:', research);
  
  // Final budget check
  await checkBudget();
}

main();
```

**Environment Variables:**
```bash
PAYOS_AGENT_KEY=ak_live_xxxxxxxxxxxxx  # Agent's API key (from agent creation)
```

**CLI Interface (Optional):**
```bash
# Interactive mode
pnpm dev

# Specific commands
pnpm dev --weather "New York"
pnpm dev --research "AI trends"
pnpm dev --budget
```

---

## App 3: Compliance Service (Both)

### Description

A compliance checking service that:
1. **Sells** compliance check endpoints (acts as Provider)
2. **Uses** upstream identity/AML APIs (acts as Consumer)

This demonstrates real-world usage where a service monetizes its own APIs while consuming other paid APIs.

### Business Model

```
Client Request ($0.25)
    │
    ▼
┌───────────────────────┐
│  Compliance Service   │
│  (Provider + Consumer)│
└───────────┬───────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
Identity API    AML API
  ($0.05)       ($0.03)

Margin: $0.25 - $0.08 = $0.17 (68%)
```

### Technical Specification

**Stack:**
- Runtime: Node.js 20+
- Framework: Hono (lighter than Express)
- SDKs: Both provider and client

**Complete Implementation:**

```typescript
// server.ts
import { Hono } from 'hono';
import { X402Provider } from '@payos/x402-provider-sdk';
import { X402Client } from '@payos/x402-client-sdk';

const app = new Hono();

// Provider: For selling our compliance checks
const provider = new X402Provider({
  apiKey: process.env.PAYOS_PROVIDER_KEY!
});

// Consumer: For calling upstream APIs
const consumer = new X402Client({
  apiKey: process.env.PAYOS_CONSUMER_KEY!,
  maxAutoPayAmount: 0.10  // Safety limit per request
});

// Register our endpoints
async function setup() {
  await provider.register('/api/compliance/full', {
    name: 'Full Compliance Check',
    description: 'Complete AML + KYC + PEP screening',
    price: 0.25,
    currency: 'USDC'
  });

  await provider.register('/api/compliance/kyc', {
    name: 'KYC Check',
    description: 'Know Your Customer verification',
    price: 0.10,
    currency: 'USDC'
  });
}

// Full compliance check (our premium endpoint)
app.post('/api/compliance/full', provider.honoMiddleware(), async (c) => {
  const { name, dob, ssn, address } = await c.req.json();

  // Call upstream Identity API (we pay for this)
  const identityResult = await consumer.fetch(
    'https://identity-api.example.com/verify',
    {
      method: 'POST',
      body: JSON.stringify({ name, dob, ssn })
    }
  ).then(r => r.json());

  // Call upstream AML API (we pay for this)
  const amlResult = await consumer.fetch(
    'https://aml-api.example.com/screen',
    {
      method: 'POST',
      body: JSON.stringify({ name, dob })
    }
  ).then(r => r.json());

  // Aggregate and return results
  return c.json({
    status: 'completed',
    identity: identityResult,
    aml: amlResult,
    riskScore: calculateRiskScore(identityResult, amlResult),
    payment: c.get('x402Payment')  // What client paid us
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Start server
const PORT = process.env.PORT || 4001;
Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

setup().then(() => {
  console.log(`✅ Compliance Service running on http://localhost:${PORT}`);
});

function calculateRiskScore(identity: any, aml: any): string {
  // Business logic here
  return 'low';
}
```

**Environment Variables:**
```bash
# Provider role (for our endpoints)
PAYOS_PROVIDER_KEY=pk_live_xxxxxxxxxxxxx

# Consumer role (for upstream APIs)
PAYOS_CONSUMER_KEY=ak_live_xxxxxxxxxxxxx

PORT=4001
```

---

## E2E Testing

### Test Scenario 1: Provider Only

```bash
# 1. Start Weather API
cd apps/sample-provider
PAYOS_API_KEY=pk_test_xxx pnpm dev

# 2. Test free endpoint
curl http://localhost:4000/api/weather/current
# ✅ Should return weather data

# 3. Test paid endpoint without payment
curl -v http://localhost:4000/api/weather/forecast
# ✅ Should return 402 with payment headers
```

### Test Scenario 2: Consumer Only

```bash
# 1. Ensure Weather API is running
# 2. Run AI Agent
cd apps/sample-consumer
PAYOS_AGENT_KEY=ak_test_xxx pnpm dev

# ✅ Should:
# - Detect 402 response
# - Process payment automatically
# - Retry and get data
# - Show payment confirmation
```

### Test Scenario 3: Full E2E

```bash
# Terminal 1: Weather API (Provider)
cd apps/sample-provider && PAYOS_API_KEY=pk_test_xxx pnpm dev

# Terminal 2: AI Agent (Consumer)
cd apps/sample-consumer && PAYOS_AGENT_KEY=ak_test_xxx pnpm dev --weather "NYC"

# Verify in Dashboard:
# - Provider sees revenue from API calls
# - Consumer (agent) sees spending
# - Transfer visible in both views
```

---

## Success Metrics

### Developer Experience

| Metric | Target |
|--------|--------|
| Time to first 402 response | < 5 minutes |
| Time to first successful paid request | < 10 minutes |
| Lines of code to integrate | < 20 |
| Environment variables needed | 1-2 |

### Technical

| Metric | Target |
|--------|--------|
| SDK bundle size | < 50KB |
| Payment latency | < 500ms |
| Error rate | < 0.1% |
| TypeScript coverage | 100% |

### Documentation

| Metric | Target |
|--------|--------|
| Example completeness | Copy-paste ready |
| Edge cases documented | Yes |
| Error messages helpful | Yes |

---

## Appendix: API Reference

### X402Provider

```typescript
new X402Provider(config: {
  apiKey: string;           // Required: PayOS API key
  apiUrl?: string;          // Optional: API URL (default: production)
  debug?: boolean;          // Optional: Enable debug logging
})

// Methods
provider.register(path, config)    // Register an endpoint
provider.protect()                 // Express middleware
provider.honoMiddleware()          // Hono middleware
provider.getEndpoint(path)         // Get endpoint details
provider.getAnalytics()            // Get revenue analytics
```

### X402Client

```typescript
new X402Client(config: {
  apiKey: string;              // Required: Agent API key
  walletId?: string;           // Optional: Override wallet (default: agent's wallet)
  apiUrl?: string;             // Optional: API URL (default: production)
  maxAutoPayAmount?: number;   // Optional: Max per-request payment
  maxDailySpend?: number;      // Optional: Daily spending limit
  onPayment?: (payment) => void;  // Optional: Payment callback
  onLimitReached?: (limit) => void;  // Optional: Limit callback
  debug?: boolean;             // Optional: Enable debug logging
})

// Methods
client.fetch(url, options)    // Fetch with auto-payment
client.getQuote(endpointId)   // Get price quote
client.getStatus()            // Get wallet/spending status
client.verifyPayment(id)      // Verify a payment
```

