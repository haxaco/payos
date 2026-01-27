# x402 Micropayments Example

Real-time demonstration of HTTP 402 Payment Required protocol for API monetization.

**User Tenant**: haxaco@gmail.com  
**Environment**: Sandbox  
**Protocol**: x402 (HTTP 402)

---

## Overview

This example demonstrates both sides of x402 micropayments:

1. **Provider**: API server that monetizes endpoints
2. **Client**: Consumer that automatically handles payments

---

## Features

### Provider Features
- ✅ Monetized API endpoints with per-request pricing
- ✅ Automatic payment verification via x402
- ✅ Multiple pricing tiers ($0.05 - $0.15 per request)
- ✅ Free endpoints (health, pricing info)
- ✅ Usage tracking and analytics
- ✅ Sandbox mode (no real payments)

### Client Features
- ✅ Automatic 402 payment handling
- ✅ Spending limits (per-request + daily)
- ✅ Payment callbacks and notifications
- ✅ Usage tracking
- ✅ Limit warnings
- ✅ Sandbox mode (simulated payments)

---

## Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│                 │   1. API Request   │                 │
│  x402 Client    │───────────────────>│  x402 Provider  │
│                 │                    │                 │
│ (haxaco@gmail)  │<───────────────────│  (haxaco@gmail) │
│                 │   2. 402 Required  │                 │
│                 │                    │                 │
│                 │   3. Payment via   │                 │
│                 │      x402 token    │                 │
│                 │───────────────────>│                 │
│                 │                    │                 │
│                 │<───────────────────│                 │
│                 │   4. API Response  │                 │
└─────────────────┘                    └─────────────────┘
         │                                      │
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            v
                    ┌───────────────┐
                    │  PayOS API    │
                    │  (Sandbox)    │
                    └───────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd examples/x402-micropayments
pnpm install
```

### 2. Run Both (Recommended)

```bash
# Starts provider and client together
pnpm dev
```

### 3. Or Run Separately

**Terminal 1 - Start Provider**:
```bash
pnpm dev:provider
```

**Terminal 2 - Run Client**:
```bash
pnpm dev:client
```

---

## API Endpoints

### Provider Endpoints

| Method | Endpoint | Price | Description |
|--------|----------|-------|-------------|
| GET | `/api/health` | FREE | Health check |
| GET | `/api/pricing` | FREE | Pricing information |
| POST | `/api/ai/generate` | $0.10 | AI text generation |
| GET | `/api/analytics/insights` | $0.05 | Analytics insights |
| POST | `/api/images/enhance` | $0.15 | Image enhancement |

---

## Example Output

### Provider Output

```
🚀 x402 Provider - PayOS
=======================
Provider: haxaco@gmail.com
Account: acct_haxaco_provider
Server: http://localhost:3402
Environment: sandbox

💰 Monetized Endpoints:
  POST /api/ai/generate       → $0.10 per request
  GET  /api/analytics/insights → $0.05 per request
  POST /api/images/enhance    → $0.15 per request

🆓 Free Endpoints:
  GET  /api/health
  GET  /api/pricing

✅ AI Generation: $0.10 charged for haxaco@gmail.com
✅ Analytics: $0.05 charged for haxaco@gmail.com
✅ Image Enhancement: $0.15 charged for haxaco@gmail.com
```

### Client Output

```
🚀 x402 Client - PayOS
=====================
User: haxaco@gmail.com
Account: acct_haxaco_test
Provider: http://localhost:3402
Environment: sandbox

📋 Scenario 1: Get Pricing (Free)
----------------------------------
✅ Pricing retrieved (no charge)
   Endpoints: 3
   Provider revenue (30d): $245.50

🤖 Scenario 2: AI Text Generation ($0.10)
------------------------------------------
💳 Payment made: $0.10 for AI text generation
✅ AI generation completed
   Cost: $0.10
   Tokens: 150
   Response: This is a simulated AI response for: "Explain quantum computing"...

📊 Scenario 3: Get Analytics Insights ($0.05)
----------------------------------------------
💳 Payment made: $0.05 for Analytics insights
✅ Analytics retrieved
   Cost: $0.05
   Total users: 1234
   Active users: 567
   Growth rate: 23.5%

🖼️  Scenario 4: Image Enhancement ($0.15)
------------------------------------------
💳 Payment made: $0.15 for Image enhancement
✅ Image enhanced
   Cost: $0.15
   Resolution: 4K
   Enhanced URL: https://cdn.payos.ai/enhanced/1704298000000.jpg

🔄 Scenario 5: Multiple Requests
----------------------------------
💳 Payment made: $0.10 for AI text generation
   Request 1: $0.10 charged (total: $0.10)
💳 Payment made: $0.10 for AI text generation
   Request 2: $0.10 charged (total: $0.20)
💳 Payment made: $0.10 for AI text generation
   Request 3: $0.10 charged (total: $0.30)

📈 Usage Summary
----------------
   User: haxaco@gmail.com
   Total spent: $0.70
   Requests made: 7 (3 free, 4 paid)
   Average cost: $0.175 per paid request
   Daily limit remaining: $9.30

✅ All x402 scenarios completed successfully!
```

---

## Spending Limits

The client enforces two types of limits:

### Per-Request Limit
- **Max**: $0.50 per request
- **Purpose**: Prevent accidental high charges
- **Behavior**: Rejects requests that exceed limit

### Daily Limit
- **Max**: $10.00 per day
- **Purpose**: Control daily spending
- **Behavior**: Tracks cumulative daily spending

---

## Use Cases

### 1. AI API Monetization
```bash
# Provider charges $0.10 per AI generation
curl -X POST http://localhost:3402/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a poem", "max_tokens": 100}'
```

**Business Model**: Pay-per-use AI services

### 2. Data Analytics as a Service
```bash
# Provider charges $0.05 for insights
curl http://localhost:3402/api/analytics/insights
```

**Business Model**: SaaS analytics platform

### 3. Media Processing
```bash
# Provider charges $0.15 for image enhancement
curl -X POST http://localhost:3402/api/images/enhance \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/photo.jpg"}'
```

**Business Model**: Media processing service

---

## Testing

### Run Tests

```bash
pnpm test
```

### Test Scenarios

1. ✅ Provider starts successfully
2. ✅ Free endpoints accessible
3. ✅ Paid endpoints require payment
4. ✅ Client handles 402 automatically
5. ✅ Spending limits enforced
6. ✅ Usage tracking accurate
7. ✅ Analytics calculated correctly

---

## Configuration

### Environment Variables

```bash
# Optional - defaults to sandbox
export PAYOS_API_KEY=payos_sandbox_test
export PAYOS_ENVIRONMENT=sandbox

# Optional - provider port
export PORT=3402
```

### Client Configuration

```typescript
const client = payos.x402.createClient({
  maxPaymentAmount: '0.50',  // Max per request
  dailyLimit: '10.00',       // Max per day
  onPayment: (payment) => {
    console.log(`Paid $${payment.amount}`);
  },
  onLimitReached: (limit) => {
    console.log(`Limit reached: ${limit.type}`);
  },
});
```

### Provider Configuration

```typescript
const provider = payos.x402.createProvider({
  'POST /api/endpoint': {
    price: '0.10',
    currency: 'USD',
    description: 'Endpoint description',
    metadata: {
      provider: 'haxaco@gmail.com',
    },
  },
});
```

---

## Error Handling

### Client Errors

```typescript
try {
  const response = await client.fetch(url);
} catch (error) {
  if (error.code === 'LIMIT_EXCEEDED') {
    // Daily or per-request limit exceeded
  } else if (error.code === 'PAYMENT_FAILED') {
    // Payment processing failed
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    // Not enough balance
  }
}
```

### Provider Errors

```typescript
app.use((err, req, res, next) => {
  if (err.code === 'INVALID_PAYMENT') {
    res.status(402).json({
      error: 'Payment required',
      price: '0.10',
      currency: 'USD',
    });
  }
});
```

---

## Real-time Validation

### UI Dashboard

When running, visit the PayOS dashboard to see:

1. **Provider Revenue**:
   - Total revenue from API calls
   - Request counts by endpoint
   - Revenue trends over time

2. **Client Spending**:
   - Total spent on API calls
   - Breakdown by endpoint
   - Spending vs. limits

3. **Transaction History**:
   - All x402 payments
   - Request/response details
   - Timestamps and amounts

---

## Best Practices

### For Providers

1. **Pricing Strategy**:
   - Start with low prices ($0.01-$0.25)
   - Tier pricing by complexity
   - Offer free tiers for onboarding

2. **Documentation**:
   - Clear pricing information
   - API documentation
   - Usage examples

3. **Monitoring**:
   - Track revenue per endpoint
   - Monitor request patterns
   - Analyze profitability

### For Clients

1. **Budget Management**:
   - Set appropriate daily limits
   - Monitor spending regularly
   - Use callbacks for tracking

2. **Error Handling**:
   - Graceful 402 handling
   - Retry logic for failures
   - User notifications

3. **Optimization**:
   - Cache responses when possible
   - Batch requests
   - Use free endpoints when available

---

## Troubleshooting

### Provider Not Starting

```bash
# Check if port 3402 is in use
lsof -i :3402

# Use different port
PORT=3403 pnpm dev:provider
```

### Client Can't Connect

```bash
# Verify provider is running
curl http://localhost:3402/api/health

# Check network
ping localhost
```

### Payment Fails

```bash
# Verify sandbox mode
echo $PAYOS_ENVIRONMENT  # Should be 'sandbox'

# Check API key
echo $PAYOS_API_KEY
```

---

## Integration

### With AP2 and ACP

This example works alongside:
- **AP2**: Subscription-based payments
- **ACP**: E-commerce checkouts

All three protocols can be used by the same user (haxaco@gmail.com) and will show in the unified dashboard.

---

## Production Deployment

### Provider Deployment

```bash
# Build
pnpm build

# Deploy to cloud (e.g., Vercel, Railway)
# Set environment to production
PAYOS_ENVIRONMENT=production
PAYOS_API_KEY=your_production_key
```

### Client Integration

```typescript
// In your app
import { PayOS } from '@sly/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY,
  environment: 'production',
});

const client = payos.x402.createClient({
  dailyLimit: '100.00',
});

// Use in your API calls
const response = await client.fetch('https://api.example.com/endpoint');
```

---

## Next Steps

1. **Customize Pricing**: Adjust endpoint prices
2. **Add Endpoints**: Create more monetized APIs
3. **Monitor Usage**: Track in PayOS dashboard
4. **Scale Up**: Move to production
5. **Integrate**: Add to your applications

---

**User Tenant**: haxaco@gmail.com  
**Protocol**: x402  
**Status**: Production-ready  
**Last Updated**: January 3, 2026

