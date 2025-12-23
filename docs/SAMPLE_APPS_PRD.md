# x402 Sample Applications PRD

> Product Requirements for three sample applications demonstrating x402 SDK usage.

---

## 📋 Overview

| App | Role | Purpose |
|-----|------|---------|
| **Weather API** | Provider | Monetizes weather data endpoints |
| **AI Chat Client** | Consumer | Calls paid AI APIs with auto-payment |
| **Compliance Service** | Both | Acts as both provider (sells checks) and consumer (uses upstream APIs) |

---

## 🌤️ App 1: Premium Weather API (Provider)

### Description
A simple REST API that offers free basic weather and premium detailed weather data. Premium endpoints are protected by x402 and charge per request.

### User Stories
- As an API provider, I want to register my endpoints with PayOS so that I can charge for usage
- As an API provider, I want to set different prices for different endpoints
- As an API provider, I want to offer volume discounts to encourage usage
- As an API provider, I want to see real-time revenue from my dashboard

### Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/weather/free` | Free | Basic weather (temp, conditions) |
| `GET /api/weather/premium` | $0.001 | Detailed weather (humidity, wind, UV, 3-day forecast) |
| `GET /api/weather/historical` | $0.01 | Historical data (last 30 days) |
| `POST /api/weather/batch` | $0.005 | Batch request (up to 10 locations) |

### Volume Discounts
```
0-99 calls:    Base price
100-999 calls: 10% off
1000+ calls:   25% off
```

### Technical Stack
- Runtime: Node.js + Express
- SDK: `@payos/x402-provider-sdk`
- Port: 4000

### Environment Variables
```env
PORT=4000
PAYOS_API_URL=http://localhost:3456
PAYOS_API_KEY=<api-key>
PAYOS_ACCOUNT_ID=<provider-account-id>
```

### Success Criteria
- [ ] Endpoints register automatically on startup
- [ ] Free endpoint works without payment
- [ ] Premium endpoints return 402 with correct headers
- [ ] Payment verification allows access
- [ ] Revenue appears in provider dashboard

---

## 🤖 App 2: AI Chat Client (Consumer)

### Description
A CLI tool that calls various paid AI APIs (like GPT, Claude, etc.) using the x402 consumer SDK. Demonstrates automatic payment handling.

### User Stories
- As a developer, I want to call paid APIs without manual payment handling
- As a developer, I want to see a price quote before making expensive calls
- As a developer, I want to set spending limits
- As a developer, I want to track my API spending

### Features

1. **Auto-Pay Mode**: Automatically pays and retries on 402
2. **Quote Mode**: Shows price before proceeding
3. **Budget Mode**: Sets max spend per session
4. **History Mode**: Shows recent payment history

### Commands
```bash
# Interactive chat with auto-pay
x402-chat --mode auto "What's the weather in SF?"

# Get quote first
x402-chat --mode quote "What's the weather in SF?"

# Set budget limit
x402-chat --budget 0.10 "What's the weather in SF?"

# Show spending history
x402-chat --history
```

### Technical Stack
- Runtime: Node.js CLI
- SDK: `@payos/x402-client-sdk`
- UI: Inquirer for prompts

### Environment Variables
```env
PAYOS_API_URL=http://localhost:3456
PAYOS_API_KEY=<api-key>
PAYOS_WALLET_ID=<consumer-wallet-id>
AI_API_URL=http://localhost:4000  # Weather API for testing
```

### Success Criteria
- [ ] Detects 402 and processes payment automatically
- [ ] Shows payment info in console
- [ ] Wallet balance decreases after payment
- [ ] Spending shows in consumer dashboard
- [ ] Budget limits work correctly

---

## ✅ App 3: Compliance Service (Provider + Consumer)

### Description
A compliance checking service that:
1. **Sells** compliance check endpoints (provider)
2. **Uses** upstream identity verification APIs (consumer)

This demonstrates a real-world scenario where a service is both monetizing its APIs and consuming other paid APIs.

### User Stories
- As a compliance provider, I want to charge for my AML/KYC checks
- As a compliance provider, I want to use upstream identity APIs
- As a compliance provider, I want to mark up upstream costs
- As a compliance provider, I want to track margin on each request

### Architecture
```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Client    │  ──$──▶  │ Compliance  │  ──$──▶  │  Identity   │
│  (Any App)  │          │   Service   │          │    API      │
└─────────────┘          └─────────────┘          └─────────────┘
                         Provider + Consumer          Provider
```

### Endpoints

**Provided (charges clients):**
| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/compliance/check` | $0.25 | Full compliance check (AML + KYC + PEP) |
| `POST /api/compliance/aml` | $0.10 | AML screening only |
| `POST /api/compliance/kyc` | $0.15 | KYC verification only |

**Consumed (pays upstream):**
| Upstream API | Cost | Used In |
|--------------|------|---------|
| Identity Verify | $0.05 | KYC, Full check |
| AML Database | $0.03 | AML, Full check |
| PEP Screening | $0.02 | Full check |

### Margin Example
```
Full Compliance Check ($0.25):
├── Identity Verify cost: $0.05
├── AML Database cost:    $0.03
├── PEP Screening cost:   $0.02
├── Total upstream cost:  $0.10
└── Margin:               $0.15 (60%)
```

### Technical Stack
- Runtime: Node.js + Hono
- Provider SDK: `@payos/x402-provider-sdk`
- Consumer SDK: `@payos/x402-client-sdk`
- Port: 4001

### Environment Variables
```env
PORT=4001
PAYOS_API_URL=http://localhost:3456
PAYOS_API_KEY=<api-key>

# Provider role (our endpoints)
PAYOS_PROVIDER_ACCOUNT_ID=<provider-account-id>

# Consumer role (upstream APIs)
PAYOS_CONSUMER_WALLET_ID=<consumer-wallet-id>

# Upstream API URLs
IDENTITY_API_URL=http://localhost:4002
AML_API_URL=http://localhost:4003
```

### Success Criteria
- [ ] Endpoints register and charge clients
- [ ] Upstream APIs are called with payment
- [ ] Margin is tracked correctly
- [ ] Both provider and consumer views show data
- [ ] Full transaction flow is auditable

---

## 🚀 Implementation Plan

### Phase 1: Weather API Provider (30 min)
1. Create Express app
2. Initialize X402Provider
3. Register endpoints
4. Add middleware to premium routes
5. Test 402 response

### Phase 2: AI Chat Consumer (30 min)
1. Create CLI app
2. Initialize X402Client
3. Implement auto-pay flow
4. Add quote command
5. Test against Weather API

### Phase 3: Compliance Service (45 min)
1. Create Hono app
2. Initialize both SDKs
3. Register provider endpoints
4. Implement consumer flow for upstream
5. Test full chain

### Phase 4: E2E Testing (30 min)
1. Start all services
2. Run integration tests
3. Verify dashboard data
4. Document results

---

## 📁 File Structure

```
apps/
├── sample-provider/            # Weather API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   └── weather-data.ts    # Mock weather data
│   └── .env.example
│
├── sample-consumer/            # AI Chat Client
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # CLI entry
│   │   ├── client.ts          # X402 client wrapper
│   │   └── ui.ts              # Terminal UI
│   └── .env.example
│
└── sample-compliance/          # Provider + Consumer
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts           # Hono server
    │   ├── provider.ts        # X402 provider setup
    │   ├── consumer.ts        # X402 client for upstream
    │   └── services/
    │       ├── aml.ts
    │       ├── kyc.ts
    │       └── pep.ts
    └── .env.example
```

---

## 🧪 Test Scenarios

### Scenario A: Happy Path
1. Consumer calls Weather API premium endpoint
2. Receives 402 with payment details
3. Consumer SDK processes payment via PayOS
4. Payment verified, data returned
5. Both dashboards show transaction

### Scenario B: Insufficient Funds
1. Consumer calls endpoint
2. Receives 402
3. Payment fails (insufficient balance)
4. Error returned to user
5. No data returned

### Scenario C: Volume Discount
1. Consumer makes 100+ calls
2. Price drops to 90%
3. Dashboard shows discount applied
4. Revenue reflects discounted price

### Scenario D: Chain Payment
1. Client calls Compliance service
2. Compliance pays Identity API
3. Compliance pays AML API
4. Compliance returns result
5. Three transactions visible

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Provider endpoint registration | 100% success |
| Consumer auto-pay | < 2s total latency |
| Payment accuracy | 100% |
| Dashboard data consistency | 100% |
| Error rate | < 1% |


