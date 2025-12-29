# x402 SDK Testing Guide

> Complete guide for testing the x402 Provider and Consumer SDKs locally.

## 🎯 Overview

This guide covers testing 3 scenarios:

| Scenario | SDK | Description |
|----------|-----|-------------|
| **Provider** | `@payos/x402-provider-sdk` | API monetization - register endpoints, verify payments |
| **Consumer** | `@payos/x402-client-sdk` | Call paid APIs - auto-pay and retry on 402 |
| **E2E Flow** | Both | Full payment flow from consumer to provider |

---

## 📋 Prerequisites

### 1. PayOS API Running
```bash
cd /Users/haxaco/Dev/PayOS
pnpm install
pnpm dev --filter=@payos/api
```
API should be running at `http://localhost:3456`

### 2. Test Data Generated
Ensure you have:
- A test account with ID (provider)
- A test wallet with balance (consumer)
- API key for authentication

Check existing data:
```bash
# List accounts
curl http://localhost:3456/v1/accounts \
  -H "Authorization: Bearer YOUR_API_KEY"

# List wallets  
curl http://localhost:3456/v1/wallets \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🔧 Scenario 1: Provider SDK Testing

### Sample App: Weather API Provider

Create a simple API that charges for premium weather data.

#### Step 1: Create Provider App
```bash
mkdir -p apps/sample-provider
cd apps/sample-provider
npm init -y
npm install express @payos/x402-provider-sdk
```

#### Step 2: Create `server.ts`
```typescript
import express from 'express';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = express();
app.use(express.json());

// Initialize x402 Provider
const x402 = new X402Provider({
  apiUrl: 'http://localhost:3456',
  auth: process.env.PAYOS_API_KEY || 'YOUR_API_KEY',
  accountId: process.env.PAYOS_ACCOUNT_ID || 'YOUR_ACCOUNT_ID',
  debug: true
});

// Register endpoint on startup
async function registerEndpoints() {
  try {
    const endpoint = await x402.registerEndpoint('/api/weather/premium', 'GET', {
      name: 'Premium Weather API',
      description: 'Real-time weather data with 5-minute resolution',
      basePrice: 0.001, // $0.001 per call
      currency: 'USDC',
      volumeDiscounts: [
        { threshold: 100, priceMultiplier: 0.9 },   // 10% off after 100 calls
        { threshold: 1000, priceMultiplier: 0.75 }  // 25% off after 1000 calls
      ]
    });
    console.log('✅ Endpoint registered:', endpoint.id);
  } catch (error) {
    console.error('❌ Failed to register endpoint:', error);
  }
}

// Free endpoint (no payment required)
app.get('/api/weather/free', (req, res) => {
  res.json({
    location: 'San Francisco',
    temperature: 68,
    conditions: 'Partly cloudy',
    source: 'free-tier'
  });
});

// Premium endpoint (x402 protected)
app.get('/api/weather/premium', 
  x402.middleware(), // Add x402 middleware
  (req, res) => {
    res.json({
      location: 'San Francisco',
      temperature: 68.4,
      conditions: 'Partly cloudy',
      humidity: 65,
      wind: { speed: 12, direction: 'NW' },
      pressure: 1013.25,
      visibility: 10,
      uvIndex: 5,
      forecast: [
        { day: 'Tomorrow', high: 72, low: 58 },
        { day: 'Day 2', high: 75, low: 60 },
        { day: 'Day 3', high: 70, low: 55 }
      ],
      source: 'premium-tier',
      x402Payment: req.x402Payment // Payment details attached by middleware
    });
  }
);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🌤️  Weather API running on http://localhost:${PORT}`);
  await registerEndpoints();
});
```

#### Step 3: Run Provider
```bash
PAYOS_API_KEY=your-key PAYOS_ACCOUNT_ID=your-account-id npx ts-node server.ts
```

#### Step 4: Test Provider
```bash
# Free endpoint (should work)
curl http://localhost:4000/api/weather/free

# Premium endpoint (should return 402)
curl -v http://localhost:4000/api/weather/premium

# Check 402 response headers:
# X-Payment-Required: true
# X-Payment-Amount: 0.001
# X-Payment-Currency: USDC
# X-Endpoint-ID: <uuid>
```

---

## 🔧 Scenario 2: Consumer SDK Testing

### Sample App: Weather Dashboard Consumer

Create a client app that calls paid weather APIs.

#### Step 1: Create Consumer App
```bash
mkdir -p apps/sample-consumer
cd apps/sample-consumer
npm init -y
npm install @payos/x402-client-sdk node-fetch
```

#### Step 2: Create `client.ts`
```typescript
import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({
  apiUrl: 'http://localhost:3456',
  walletId: process.env.PAYOS_WALLET_ID || 'YOUR_WALLET_ID',
  auth: process.env.PAYOS_API_KEY || 'YOUR_API_KEY',
  debug: true
});

async function fetchWeather() {
  console.log('📡 Fetching premium weather data...\n');
  
  try {
    // This will:
    // 1. Make request to provider
    // 2. Receive 402 Payment Required
    // 3. Automatically process payment via PayOS
    // 4. Retry request with payment proof
    // 5. Return successful response
    
    const response = await client.fetch('http://localhost:4000/api/weather/premium', {
      method: 'GET',
      autoRetry: true,
      onPayment: (payment) => {
        console.log('💰 Payment processed!');
        console.log(`   Amount: ${payment.amount} ${payment.currency}`);
        console.log(`   Transfer ID: ${payment.transferId}`);
        console.log(`   New Balance: ${payment.newWalletBalance}`);
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Weather data received:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Request failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get quote first
async function getQuote(endpointId: string) {
  console.log('💵 Getting price quote...\n');
  
  const quote = await client.getQuote(endpointId);
  console.log('Quote:', quote);
  return quote;
}

// Main
async function main() {
  // Option 1: Just fetch (auto-pay)
  await fetchWeather();
  
  // Option 2: Get quote first, then decide
  // const quote = await getQuote('ENDPOINT_ID');
  // if (quote.currentPrice < 0.01) {
  //   await fetchWeather();
  // }
}

main();
```

#### Step 3: Run Consumer
```bash
PAYOS_API_KEY=your-key PAYOS_WALLET_ID=your-wallet-id npx ts-node client.ts
```

Expected output:
```
📡 Fetching premium weather data...

[X402Client] Fetching: http://localhost:4000/api/weather/premium (attempt 1/2)
[X402Client] Response: 402
[X402Client] 402 Payment Required detected
[X402Client] Processing payment...
💰 Payment processed!
   Amount: 0.001 USDC
   Transfer ID: abc123...
   New Balance: 99.999

[X402Client] Payment successful, retrying request...
[X402Client] Fetching: http://localhost:4000/api/weather/premium (attempt 2/2)
[X402Client] Response: 200

✅ Weather data received:
{
  "location": "San Francisco",
  "temperature": 68.4,
  ...
}
```

---

## 🔧 Scenario 3: Full E2E Flow

### Test the complete payment cycle

#### Architecture
```
┌──────────────┐    1. Request     ┌──────────────┐
│   Consumer   │ ───────────────▶  │   Provider   │
│    (SDK)     │                   │    (SDK)     │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       │ 2. 402 + Payment Details         │
       │ ◀─────────────────────────────── │
       │                                  │
       │ 3. Process Payment               │
       ▼                                  │
┌──────────────┐                          │
│   PayOS API  │ ◀── 5. Verify Payment ───┤
│ (localhost)  │                          │
└──────┬───────┘                          │
       │                                  │
       │ 4. Payment Proof                 │
       ▼                                  │
┌──────────────┐                          │
│   Consumer   │ ── 6. Retry + Proof ───▶ │
│    (SDK)     │                          │
└──────────────┘    7. 200 OK             │
                    ◀───────────────────  │
```

#### Step 1: Start Both Apps
Terminal 1:
```bash
cd apps/sample-provider
PAYOS_API_KEY=key PAYOS_ACCOUNT_ID=acc npx ts-node server.ts
```

Terminal 2:
```bash
cd apps/sample-consumer  
PAYOS_API_KEY=key PAYOS_WALLET_ID=wallet npx ts-node client.ts
```

#### Step 2: Verify in Dashboard
1. Open `http://localhost:3000/dashboard/x402`
2. Switch to **Provider View**
   - Verify endpoint appears in list
   - Check revenue counter increases
3. Switch to **Consumer View**
   - Verify payment appears in history
   - Check spending total

#### Step 3: Check Database
```sql
-- Check x402 transfers
SELECT * FROM transfers 
WHERE type = 'x402' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check endpoint stats
SELECT * FROM x402_endpoints 
ORDER BY total_calls DESC;
```

---

## 🧪 Test Checklist

### Provider SDK Tests
- [ ] Register new endpoint
- [ ] Get endpoint details
- [ ] 402 response includes correct headers
- [ ] Payment verification succeeds
- [ ] onPaymentVerified callback fires
- [ ] Revenue counter increments

### Consumer SDK Tests
- [ ] Detect 402 response
- [ ] Parse payment details from headers
- [ ] Process payment via PayOS API
- [ ] onPayment callback fires
- [ ] Retry with payment proof
- [ ] Final request succeeds
- [ ] Wallet balance decreases

### E2E Tests
- [ ] Full flow completes successfully
- [ ] Transfer appears in both views
- [ ] Dashboard shows correct totals
- [ ] Compliance flags trigger (if enabled)

---

## 🔍 Debugging

### Common Issues

**1. 402 Not Returned**
- Check endpoint is registered: `GET /v1/x402/endpoints`
- Verify middleware is applied
- Enable debug logging: `debug: true`

**2. Payment Fails**
- Check wallet has sufficient balance
- Verify API key is valid
- Check endpoint ID matches

**3. Retry Still Gets 402**
- Verify payment proof headers are set
- Check payment verification endpoint
- Look at PayOS API logs

### Enable Debug Mode
```typescript
// Provider
const x402 = new X402Provider({ debug: true, ... });

// Consumer
const client = new X402Client({ debug: true, ... });
```

### Check Logs
```bash
# API logs
tail -f apps/api/logs/combined.log

# Look for x402 entries
grep "x402" apps/api/logs/combined.log
```

---

## 📚 Next Steps

After validating locally:
1. Deploy provider to Vercel/Railway
2. Test with real network (Base Mainnet)
3. Add webhook handlers for async notifications
4. Implement volume discount logic
5. Add rate limiting and abuse prevention


