# x402 SDK Integration Guide

Complete guide for integrating PayOS x402 protocol with your APIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Provider SDK](#provider-sdk)
3. [Consumer SDK](#consumer-sdk)
4. [Protocol Flow](#protocol-flow)
5. [Code Examples](#code-examples)
6. [Testing](#testing)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The x402 protocol enables HTTP APIs to require payment before serving content. PayOS provides two SDKs to make integration seamless:

- **Provider SDK**: Protect your APIs and receive automatic payments
- **Consumer SDK**: Call x402-protected APIs with automatic payment handling

### Key Features

✅ **Zero Configuration Payments** - Automatic wallet-to-wallet transfers  
✅ **Instant Settlement** - Funds available immediately (minus platform fee)  
✅ **Framework Agnostic** - Works with Express, Hono, Fastify, vanilla Node.js  
✅ **TypeScript Support** - Full type safety  
✅ **Idempotent Payments** - No duplicate charges  
✅ **Volume Discounts** - Automatic tiered pricing  

---

## Provider SDK

Monetize your APIs in minutes.

### Installation

```bash
npm install @payos/x402-provider-sdk
```

### Quick Start

```typescript
import { X402Provider } from '@payos/x402-provider-sdk';
import express from 'express';

const app = express();

// Initialize provider
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY,
  accountId: process.env.PAYOS_ACCOUNT_ID,
  debug: true
});

// Register your endpoint
await provider.registerEndpoint('/api/premium-data', 'GET', {
  name: 'Premium Data API',
  basePrice: 0.001, // 0.001 USDC per call
  currency: 'USDC',
  description: 'Access to premium datasets',
  volumeDiscounts: [
    { threshold: 100, priceMultiplier: 0.9 },   // 10% off after 100 calls
    { threshold: 1000, priceMultiplier: 0.8 },  // 20% off after 1000 calls
  ],
  webhookUrl: 'https://yourapi.com/webhooks/x402'
});

// Protect your endpoint with middleware
app.get('/api/premium-data', provider.middleware(), (req, res) => {
  // Payment verified! Serve your content
  res.json({
    data: 'Your premium data here',
    payment: req.x402Payment // Payment details attached
  });
});

app.listen(3000);
```

### Configuration Options

```typescript
interface X402ProviderConfig {
  apiUrl: string;        // PayOS API URL
  auth: string;          // Your API key or JWT
  accountId: string;     // Your PayOS account ID
  fetcher?: typeof fetch; // Custom fetch (optional)
  debug?: boolean;       // Enable debug logging
}

interface X402EndpointConfig {
  name: string;          // Endpoint name
  basePrice: number;     // Price per call
  currency?: 'USDC' | 'EURC';
  description?: string;
  volumeDiscounts?: Array<{
    threshold: number;
    priceMultiplier: number;
  }>;
  webhookUrl?: string;   // Webhook for payment notifications
  network?: string;      // Default: 'base-mainnet'
}
```

### Middleware Options

```typescript
provider.middleware({
  skipPaymentCheck: false,  // Skip payment (for testing)
  verifyPayment: async (req) => {
    // Custom payment verification
    return true;
  },
  on402: (endpoint) => {
    // Custom 402 response
    return customResponse;
  },
  onPaymentVerified: async (payment) => {
    // Callback after verification
    console.log('Payment verified:', payment);
  }
});
```

### Framework Examples

#### Express

```typescript
import express from 'express';

const app = express();
app.use('/api/protected', provider.middleware());
```

#### Hono

```typescript
import { Hono } from 'hono';

const app = new Hono();
app.use('/api/protected', provider.middleware());
```

#### Fastify

```typescript
import Fastify from 'fastify';

const fastify = Fastify();
fastify.addHook('preHandler', provider.middleware());
```

### Webhooks

Receive notifications when payments are made:

```typescript
app.post('/webhooks/x402', express.json(), (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'x402.payment.completed') {
    console.log('Payment received:', data);
    // data = { transferId, requestId, endpointId, amount, currency, from, to }
  }
  
  res.status(200).send('OK');
});
```

### Advanced: Volume Discounts

```typescript
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Data API',
  basePrice: 0.01,
  volumeDiscounts: [
    { threshold: 10, priceMultiplier: 0.95 },   // 5% off at 10 calls
    { threshold: 100, priceMultiplier: 0.85 },  // 15% off at 100 calls
    { threshold: 1000, priceMultiplier: 0.70 }, // 30% off at 1000 calls
  ]
});
```

The price automatically adjusts based on the consumer's total calls to your endpoint.

---

## Consumer SDK

Call x402-protected APIs with transparent payment handling.

### Installation

```bash
npm install @payos/x402-client-sdk
```

### Quick Start

```typescript
import { X402Client } from '@payos/x402-client-sdk';

// Initialize client
const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: process.env.PAYOS_WALLET_ID,
  auth: process.env.PAYOS_API_KEY,
  debug: true
});

// Call x402-protected API (payment handled automatically!)
const response = await client.fetch('https://api.example.com/premium-data', {
  autoRetry: true,
  onPayment: (payment) => {
    console.log('Paid:', payment.amount, payment.currency);
    console.log('New balance:', payment.newWalletBalance);
  }
});

const data = await response.json();
console.log('Premium data:', data);
```

### Configuration Options

```typescript
interface X402ClientConfig {
  apiUrl: string;        // PayOS API URL
  walletId: string;      // Your wallet ID
  auth: string;          // Your API key or JWT
  fetcher?: typeof fetch;
  debug?: boolean;
}

interface X402FetchOptions extends RequestInit {
  autoRetry?: boolean;   // Auto-retry after payment (default: true)
  maxRetries?: number;   // Max payment attempts (default: 1)
  onPayment?: (payment: X402Payment) => void | Promise<void>;
  onError?: (error: X402Error) => void | Promise<void>;
}
```

### Manual Payment Flow

For more control, you can handle payments manually:

```typescript
// 1. Make initial request
const response = await fetch('https://api.example.com/premium-data');

if (response.status === 402) {
  // 2. Extract payment details
  const paymentDetails = extract402Details(response);
  
  // 3. Get quote
  const quote = await client.getQuote(paymentDetails.endpointId);
  console.log('Price:', quote.currentPrice, quote.currency);
  
  // 4. Process payment manually
  const payment = await client.pay(paymentDetails, '/premium-data', 'GET');
  
  // 5. Retry with proof
  const retryResponse = await fetch('https://api.example.com/premium-data', {
    headers: {
      'X-Payment-ID': payment.transferId,
      'X-Payment-Proof': payment.proof.signature
    }
  });
}
```

### React Integration

```typescript
import { X402Client } from '@payos/x402-client-sdk';
import { useState, useEffect } from 'react';

function PremiumData() {
  const [data, setData] = useState(null);
  const [payment, setPayment] = useState(null);
  
  useEffect(() => {
    const client = new X402Client({ /* config */ });
    
    client.fetch('https://api.example.com/premium-data', {
      onPayment: setPayment
    })
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return (
    <div>
      {payment && (
        <div>Paid: {payment.amount} {payment.currency}</div>
      )}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### Node.js CLI Example

```typescript
#!/usr/bin/env node
import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: process.argv[2],
  auth: process.argv[3],
  debug: true
});

const url = process.argv[4];

console.log(`Calling: ${url}`);

const response = await client.fetch(url, {
  onPayment: (payment) => {
    console.log(`✓ Paid ${payment.amount} ${payment.currency}`);
  }
});

const data = await response.text();
console.log('Response:', data);
```

Usage:
```bash
node cli.js <wallet-id> <api-key> https://api.example.com/endpoint
```

---

## Protocol Flow

### 1. Initial Request (No Payment)

```
Consumer → Provider: GET /api/premium-data
Provider → Consumer: 402 Payment Required
  Headers:
    X-Payment-Required: true
    X-Payment-Amount: 0.001
    X-Payment-Currency: USDC
    X-Endpoint-ID: endpoint-uuid
    X-Payment-Address: 0x...
```

### 2. Payment Processing

```
Consumer → PayOS: POST /v1/x402/pay
  Body: {
    endpointId, requestId, amount, currency,
    walletId, method, path, timestamp
  }

PayOS:
  - Deducts from consumer wallet
  - Calculates platform fee (2.9%)
  - Credits provider account (minus fee)
  - Returns proof of payment

PayOS → Consumer: 200 OK
  Body: {
    success: true,
    data: {
      transferId, requestId, amount,
      proof: { paymentId, signature }
    }
  }
```

### 3. Retry with Proof

```
Consumer → Provider: GET /api/premium-data
  Headers:
    X-Payment-ID: transfer-uuid
    X-Payment-Proof: payos:transfer-uuid:request-uuid

Provider → PayOS: POST /v1/x402/verify
  Body: { requestId, transferId }

PayOS → Provider: 200 OK
  Body: { verified: true, data: {...} }

Provider → Consumer: 200 OK
  Body: { data: "Premium content" }
```

---

## Code Examples

### Provider: Hono API

```typescript
import { Hono } from 'hono';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = new Hono();

const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY,
  accountId: process.env.ACCOUNT_ID
});

// Register endpoint on startup
await provider.registerEndpoint('/api/weather', 'GET', {
  name: 'Weather API',
  basePrice: 0.0001,
  currency: 'USDC'
});

// Protect with middleware
app.get('/api/weather', provider.middleware(), (c) => {
  return c.json({
    city: 'San Francisco',
    temp: 72,
    condition: 'Sunny'
  });
});

export default app;
```

### Consumer: Fetch Wrapper

```typescript
import { X402Client } from '@payos/x402-client-sdk';

class APIClient {
  private x402: X402Client;
  
  constructor(walletId: string, auth: string) {
    this.x402 = new X402Client({
      apiUrl: 'https://api.payos.com',
      walletId,
      auth
    });
  }
  
  async get(url: string) {
    const response = await this.x402.fetch(url, {
      method: 'GET',
      onPayment: (payment) => {
        console.log(`💸 Paid ${payment.amount} ${payment.currency}`);
      }
    });
    return response.json();
  }
  
  async post(url: string, body: any) {
    const response = await this.x402.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }
}

// Usage
const client = new APIClient('wallet-id', 'api-key');
const weather = await client.get('https://api.example.com/weather');
```

---

## Testing

### Provider Testing

```typescript
import { X402Provider } from '@payos/x402-provider-sdk';
import { describe, it, expect } from 'vitest';

describe('Protected Endpoint', () => {
  it('should return 402 without payment', async () => {
    const provider = new X402Provider({ /* config */ });
    
    // Test middleware without payment proof
    const mockReq = { headers: {}, path: '/api/data', method: 'GET' };
    const mockRes = {
      status: (code) => ({ json: (data) => ({ code, data }) })
    };
    
    const result = await provider.middleware()(mockReq, mockRes, () => {});
    expect(result.code).toBe(402);
  });
});
```

### Consumer Testing

```typescript
import { X402Client } from '@payos/x402-client-sdk';
import { describe, it, expect } from 'vitest';

describe('X402 Client', () => {
  it('should handle 402 and retry', async () => {
    const client = new X402Client({ /* config */ });
    
    // Mock fetch to return 402, then 200
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ status: 402, headers: new Headers(/* ... */) })
      .mockResolvedValueOnce({ status: 200, json: () => ({ data: 'success' }) });
    
    const response = await client.fetch('https://api.test.com/data');
    expect(response.status).toBe(200);
  });
});
```

---

## Best Practices

### Provider Best Practices

1. **Set Appropriate Prices**
   - Start low ($0.0001-$0.01)
   - Monitor conversion rates
   - Use volume discounts for heavy users

2. **Use Webhooks**
   - Track revenue in real-time
   - Trigger business logic on payment
   - Monitor for fraud

3. **Cache Endpoint Data**
   - Provider SDK caches registered endpoints
   - Call `clearCache()` if you update endpoints

4. **Error Handling**
   - Fail open on provider errors (allow request through)
   - Log all payment verifications
   - Monitor webhook failures

### Consumer Best Practices

1. **Wallet Management**
   - Keep sufficient balance
   - Monitor spending
   - Set up alerts

2. **Idempotency**
   - SDKautomatically handles retries
   - Use same `requestId` for retries
   - Check `newWalletBalance` after payment

3. **Error Handling**
   ```typescript
   try {
     const response = await client.fetch(url, {
       onError: async (error) => {
         if (error.code === 'INSUFFICIENT_BALANCE') {
           await topUpWallet();
         }
       }
     });
   } catch (error) {
     console.error('Payment failed:', error);
   }
   ```

4. **Cost Tracking**
   ```typescript
   let totalSpent = 0;
   
   const response = await client.fetch(url, {
     onPayment: (payment) => {
       totalSpent += payment.amount;
       console.log(`Session total: $${totalSpent}`);
     }
   });
   ```

---

## Troubleshooting

### Common Issues

**402 Loop (Payment not verified)**
```
Problem: Client pays but still gets 402 on retry
Solution:
  - Check payment proof headers are set correctly
  - Verify transferId and requestId match
  - Ensure provider is verifying with PayOS
```

**Insufficient Balance**
```
Problem: "INSUFFICIENT_BALANCE" error
Solution:
  - Check wallet balance: GET /v1/wallets/:id
  - Top up wallet: POST /v1/wallets/:id/topup
  - Enable balance alerts in dashboard
```

**Endpoint Not Found**
```
Problem: "ENDPOINT_NOT_FOUND" error
Solution:
  - Verify endpoint is registered
  - Check path and method match exactly
  - Call provider.clearCache() if recently updated
```

**High Fees**
```
Problem: Platform fees too high
Solution:
  - Default is 2.9% (configurable)
  - Contact PayOS for volume discounts
  - Check settlement config: GET /v1/settlement/config
```

### Debug Mode

Enable detailed logging:

```typescript
// Provider
const provider = new X402Provider({
  debug: true,
  // ...
});

// Consumer
const client = new X402Client({
  debug: true,
  // ...
});
```

Output:
```
[X402Provider] Middleware: GET /api/data
[X402Provider] No payment proof found, returning 402
[X402Client] Fetching: https://api.example.com/data
[X402Client] 402 Payment Required detected
[X402Client] Processing payment...
[X402Client] Payment successful, retrying request...
```

---

## Support

- **Documentation:** https://docs.payos.com/x402
- **GitHub:** https://github.com/payos/x402-sdks
- **Discord:** https://discord.gg/payos
- **Email:** support@payos.com

---

## License

MIT © PayOS

