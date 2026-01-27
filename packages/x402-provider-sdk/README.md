# @sly/x402-provider-sdk

Provider SDK for monetizing APIs with x402 - HTTP 402 Payment Required middleware.

## What is x402?

x402 is an open standard for HTTP 402 "Payment Required" responses, enabling micropayments for API calls using stablecoins. Learn more at [x402.org](https://www.x402.org).

## Installation

```bash
npm install @sly/x402-provider-sdk
```

## Quick Start

```typescript
import { X402Provider } from '@sly/x402-provider-sdk';
import express from 'express';

const app = express();

// Initialize provider
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: 'your-api-key',
  accountId: 'your-account-id'
});

// Register endpoint
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Premium Data API',
  basePrice: 0.01,
  currency: 'USDC',
  description: 'Access to premium data'
});

// Use as middleware
app.use('/api/data', provider.middleware());

app.get('/api/data', (req, res) => {
  res.json({ data: 'Premium data here!' });
});

app.listen(3000);
```

## Features

- ✅ **Framework Agnostic** - Works with Express, Hono, Fastify, and more
- ✅ **Automatic 402 Responses** - Returns proper x402 headers
- ✅ **Payment Verification** - Validates payments before serving content
- ✅ **Endpoint Registration** - Register endpoints with PayOS
- ✅ **Volume Discounts** - Support for tiered pricing
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Customizable** - Hooks for custom logic
- ✅ **Lightweight** - Zero runtime dependencies

## API Reference

### X402Provider

#### Constructor

```typescript
const provider = new X402Provider({
  apiUrl: string;       // PayOS API URL
  auth: string;         // JWT or API key
  accountId: string;    // Your account ID
  fetcher?: typeof fetch; // Optional: custom fetch implementation
  debug?: boolean;      // Optional: enable debug logging
});
```

#### registerEndpoint()

Register an endpoint with PayOS for monetization.

```typescript
const endpoint = await provider.registerEndpoint(
  path: string,
  method: string,
  config: X402EndpointConfig
);
```

**Config:**

```typescript
interface X402EndpointConfig {
  name: string;                    // Endpoint name
  basePrice: number;               // Price per call
  currency?: 'USDC' | 'EURC';     // Currency (default: USDC)
  description?: string;            // Optional description
  volumeDiscounts?: Array<{        // Optional volume discounts
    threshold: number;
    priceMultiplier: number;
  }>;
  webhookUrl?: string;             // Optional webhook for payments
  network?: string;                // Optional network (default: base-mainnet)
}
```

#### middleware()

Create middleware for your framework.

```typescript
const middleware = provider.middleware(options?: X402MiddlewareOptions);
```

**Options:**

```typescript
interface X402MiddlewareOptions {
  skipPaymentCheck?: boolean;                      // Skip payment (testing)
  verifyPayment?: (request) => Promise<boolean>;   // Custom verifier
  on402?: (endpoint) => any;                       // Custom 402 handler
  onPaymentVerified?: (payment) => void;           // Payment callback
}
```

#### getEndpoint()

Get a registered endpoint.

```typescript
const endpoint = await provider.getEndpoint(path: string, method: string);
```

#### verifyPayment()

Manually verify a payment.

```typescript
const payment = await provider.verifyPayment(requestId: string, transferId: string);
```

## Framework Examples

### Express

```typescript
import express from 'express';
import { X402Provider } from '@sly/x402-provider-sdk';

const app = express();
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY!,
  accountId: process.env.PAYOS_ACCOUNT_ID!
});

// Register endpoint
await provider.registerEndpoint('/api/premium', 'GET', {
  name: 'Premium API',
  basePrice: 0.01,
  currency: 'USDC'
});

// Apply middleware
app.get('/api/premium',
  provider.middleware(),
  (req, res) => {
    res.json({ data: 'Premium content' });
  }
);
```

### Hono

```typescript
import { Hono } from 'hono';
import { X402Provider } from '@sly/x402-provider-sdk';

const app = new Hono();
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY!,
  accountId: process.env.PAYOS_ACCOUNT_ID!
});

// Register endpoint
await provider.registerEndpoint('/api/premium', 'GET', {
  name: 'Premium API',
  basePrice: 0.01,
  currency: 'USDC'
});

// Apply middleware (Hono-compatible)
app.get('/api/premium', async (c, next) => {
  const middleware = provider.middleware();
  await middleware(c.req.raw, c.res, next);
}, (c) => {
  return c.json({ data: 'Premium content' });
});
```

### Fastify

```typescript
import Fastify from 'fastify';
import { X402Provider } from '@sly/x402-provider-sdk';

const fastify = Fastify();
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: process.env.PAYOS_API_KEY!,
  accountId: process.env.PAYOS_ACCOUNT_ID!
});

// Register endpoint
await provider.registerEndpoint('/api/premium', 'GET', {
  name: 'Premium API',
  basePrice: 0.01,
  currency: 'USDC'
});

// Apply middleware
fastify.addHook('preHandler', async (request, reply) => {
  const middleware = provider.middleware();
  await middleware(request, reply, () => {});
});

fastify.get('/api/premium', async (request, reply) => {
  return { data: 'Premium content' };
});
```

## Advanced Usage

### Volume Discounts

```typescript
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Data API',
  basePrice: 0.01,
  currency: 'USDC',
  volumeDiscounts: [
    { threshold: 1000, priceMultiplier: 0.9 },   // 10% off after 1k calls
    { threshold: 10000, priceMultiplier: 0.8 },  // 20% off after 10k calls
    { threshold: 100000, priceMultiplier: 0.7 }  // 30% off after 100k calls
  ]
});
```

### Payment Webhooks

```typescript
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Data API',
  basePrice: 0.01,
  currency: 'USDC',
  webhookUrl: 'https://your-api.com/webhooks/payment'
});

// Your webhook endpoint receives:
// POST /webhooks/payment
// {
//   event: 'x402.payment.completed',
//   timestamp: '2025-12-22T10:00:00Z',
//   data: {
//     transferId: 'uuid',
//     requestId: 'uuid',
//     endpointId: 'uuid',
//     amount: 0.01,
//     currency: 'USDC',
//     from: 'account-id',
//     to: 'your-account-id'
//   }
// }
```

### Custom Payment Verification

```typescript
app.use('/api/premium', provider.middleware({
  verifyPayment: async (request) => {
    // Custom verification logic
    const paymentId = request.headers['x-payment-id'];
    
    // Check your database, cache, etc.
    const isValid = await yourDatabase.verifyPayment(paymentId);
    
    return isValid;
  },
  onPaymentVerified: async (payment) => {
    // Log to analytics
    await analytics.track('payment_verified', {
      transferId: payment.transferId,
      amount: payment.amount,
      currency: payment.currency
    });
  }
}));
```

### Custom 402 Response

```typescript
app.use('/api/premium', provider.middleware({
  on402: (endpoint) => {
    // Custom 402 response
    return {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Amount': endpoint.basePrice.toString(),
        'X-Payment-Currency': endpoint.currency,
        'X-Endpoint-ID': endpoint.id
      },
      body: {
        error: 'Payment Required',
        message: `Pay ${endpoint.basePrice} ${endpoint.currency} to access this endpoint`,
        learnMore: 'https://your-docs.com/pricing'
      }
    };
  }
}));
```

### Manual Payment Verification

```typescript
app.get('/api/data', async (req, res) => {
  const paymentId = req.headers['x-payment-id'];
  const paymentProof = req.headers['x-payment-proof'];
  
  if (!paymentId || !paymentProof) {
    return res.status(402).json({ error: 'Payment required' });
  }
  
  // Extract request ID from proof
  const requestId = paymentProof.split(':')[2];
  
  // Verify payment
  const payment = await provider.verifyPayment(requestId, paymentId);
  
  if (!payment) {
    return res.status(402).json({ error: 'Invalid payment' });
  }
  
  // Serve content
  res.json({ data: 'Premium content' });
});
```

### Testing Mode

```typescript
// Skip payment checks in development
const middleware = provider.middleware({
  skipPaymentCheck: process.env.NODE_ENV === 'development'
});

app.use('/api/premium', middleware);
```

## Utility Functions

```typescript
import { createX402Middleware, create402Response } from '@sly/x402-provider-sdk';

// Create middleware without instantiating provider
const middleware = createX402Middleware({
  apiUrl: 'https://api.payos.com',
  auth: 'your-api-key',
  accountId: 'your-account-id'
});

// Create 402 response manually
const response = create402Response(endpoint);
// Returns: { status: 402, headers: {...}, body: {...} }
```

## Payment Flow

1. **Consumer** makes request to protected endpoint
2. **Middleware** checks for payment proof in headers
3. **If no payment:**
   - Return 402 with payment details in headers
   - Consumer SDK processes payment via PayOS
   - Consumer retries with payment proof
4. **If payment provided:**
   - Verify payment with PayOS
   - If valid: Allow request, attach payment info to `req.x402Payment`
   - If invalid: Return 402 again

## x402 Response Headers

When returning 402, these headers are set:

```
X-Payment-Required: true
X-Payment-Amount: 0.01
X-Payment-Currency: USDC
X-Payment-Address: internal://payos/...
X-Endpoint-ID: uuid
X-Payment-Network: base-mainnet
X-Asset-Address: 0x... (optional)
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
  X402Provider,
  X402ProviderConfig,
  X402EndpointConfig,
  X402MiddlewareOptions,
  X402Endpoint,
  X402Payment,
  createX402Middleware,
  create402Response
} from '@sly/x402-provider-sdk';
```

## Best Practices

### 1. Cache Endpoints

```typescript
// Endpoints are cached automatically
// Clear cache when you update endpoint config
provider.clearCache();
```

### 2. Use Webhooks

```typescript
// Get real-time notifications for payments
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Data API',
  basePrice: 0.01,
  webhookUrl: 'https://your-api.com/webhooks/payment'
});
```

### 3. Monitor Revenue

```typescript
const endpoint = await provider.getEndpoint('/api/data', 'GET');
console.log(`Total revenue: ${endpoint.totalRevenue} ${endpoint.currency}`);
console.log(`Total calls: ${endpoint.totalCalls}`);
```

### 4. Handle Errors Gracefully

```typescript
app.use('/api/premium', provider.middleware({
  onPaymentVerified: async (payment) => {
    try {
      await logPayment(payment);
    } catch (error) {
      console.error('Failed to log payment:', error);
      // Don't block request
    }
  }
}));
```

## License

MIT © PayOS

## Links

- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [PayOS Documentation](https://docs.payos.com)
- [GitHub Repository](https://github.com/payos/x402-provider-sdk)
- [Consumer SDK](@sly/x402-client-sdk)

## Support

For issues or questions:

- GitHub Issues: [payos/x402-provider-sdk/issues](https://github.com/payos/x402-provider-sdk/issues)
- Discord: [payos.com/discord](https://payos.com/discord)
- Email: support@payos.com

