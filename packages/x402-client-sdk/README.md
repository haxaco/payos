# @sly/x402-client-sdk

Client SDK for consuming x402-enabled APIs with automatic payment handling.

## What is x402?

x402 is an open standard for HTTP 402 "Payment Required" responses, enabling micropayments for API calls using stablecoins. Learn more at [x402.org](https://www.x402.org).

## Installation

```bash
npm install @sly/x402-client-sdk
```

## Quick Start

```typescript
import { X402Client } from '@sly/x402-client-sdk';

// Initialize client
const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: 'your-wallet-id',
  auth: 'your-api-key'
});

// Fetch with automatic payment handling
const response = await client.fetch('https://api.example.com/protected-endpoint', {
  method: 'GET',
  autoRetry: true, // Automatically handle 402 and retry with payment
  onPayment: (payment) => {
    console.log(`Paid ${payment.amount} ${payment.currency}`);
  }
});

const data = await response.json();
```

## Features

- ✅ **Automatic 402 Detection** - Detects HTTP 402 responses and handles payment flow
- ✅ **Idempotent Payments** - Prevents double-charging with unique request IDs
- ✅ **Auto-Retry** - Automatically retries original request after payment
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Customizable** - Callbacks for payments, errors, and custom fetchers
- ✅ **Lightweight** - Minimal dependencies
- ✅ **Framework Agnostic** - Works in Node.js, browsers, and edge runtimes

## API Reference

### X402Client

#### Constructor

```typescript
const client = new X402Client({
  apiUrl: string;        // PayOS API URL
  walletId: string;      // Your wallet ID
  auth: string;          // JWT or API key
  fetcher?: typeof fetch; // Optional: custom fetch implementation
  debug?: boolean;       // Optional: enable debug logging
});
```

#### fetch()

Fetch a URL with automatic x402 payment handling.

```typescript
const response = await client.fetch(url: string, options?: X402FetchOptions);
```

**Options:**

```typescript
interface X402FetchOptions extends RequestInit {
  autoRetry?: boolean;           // Auto-retry after payment (default: true)
  maxRetries?: number;           // Max payment retries (default: 1)
  onPayment?: (payment) => void; // Callback for successful payments
  onError?: (error) => void;     // Callback for errors
}
```

#### getQuote()

Get pricing quote for an endpoint before making a request.

```typescript
const quote = await client.getQuote(endpointId: string);
// Returns: { endpointId, name, basePrice, currentPrice, currency, ... }
```

#### verifyPayment()

Verify a payment has been completed.

```typescript
const verified = await client.verifyPayment(requestId: string, transferId: string);
// Returns: boolean
```

#### updateConfig()

Update client configuration.

```typescript
client.updateConfig({
  walletId: 'new-wallet-id',
  debug: true
});
```

## Examples

### Basic Usage

```typescript
import { X402Client } from '@sly/x402-client-sdk';

const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: 'wallet-123',
  auth: 'api-key-123'
});

try {
  const response = await client.fetch('https://api.example.com/protected-endpoint');
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error('Error:', error);
}
```

### With Payment Callback

```typescript
const response = await client.fetch('https://api.example.com/protected-endpoint', {
  onPayment: async (payment) => {
    console.log(`✅ Paid ${payment.amount} ${payment.currency}`);
    console.log(`New balance: ${payment.newWalletBalance}`);
    
    // Log to your analytics
    await logPayment(payment);
  },
  onError: async (error) => {
    console.error(`❌ Payment failed: ${error.message}`);
    
    // Handle error
    if (error.code === 'INSUFFICIENT_BALANCE') {
      await notifyLowBalance();
    }
  }
});
```

### Get Quote Before Payment

```typescript
// Get pricing info first
const quote = await client.getQuote(endpointId);
console.log(`This will cost ${quote.currentPrice} ${quote.currency}`);

// Decide whether to proceed
if (quote.currentPrice <= maxBudget) {
  const response = await client.fetch(url);
}
```

### Manual Payment Handling

```typescript
const response = await client.fetch(url, {
  autoRetry: false // Don't auto-pay
});

if (response.status === 402) {
  // Show payment UI to user
  const confirmed = await showPaymentConfirmation();
  
  if (confirmed) {
    // Retry with autoRetry enabled
    const retryResponse = await client.fetch(url, {
      autoRetry: true
    });
  }
}
```

### For Autonomous Agents

```typescript
const client = new X402Client({
  apiUrl: process.env.PAYOS_API_URL!,
  walletId: process.env.AGENT_WALLET_ID!,
  auth: process.env.AGENT_API_KEY!,
  debug: true
});

// Agent makes requests with automatic payment
const complianceData = await client.fetch('https://api.example.com/v1/compliance/check', {
  method: 'POST',
  body: JSON.stringify({ entityId: '123' }),
  headers: {
    'Content-Type': 'application/json'
  },
  onPayment: (payment) => {
    logAgentAction('payment', payment);
  }
});

const result = await complianceData.json();
```

### Custom Fetch Implementation

```typescript
import { X402Client } from '@sly/x402-client-sdk';
import { createFetch } from '@vercel/fetch';

const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: 'wallet-123',
  auth: 'api-key-123',
  fetcher: createFetch() // Use Vercel's fetch with built-in retries
});
```

## Error Handling

The SDK throws errors for failed payments with detailed error codes:

```typescript
try {
  await client.fetch(url);
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    console.error('Wallet has insufficient balance');
  } else if (error.code === 'ENDPOINT_NOT_FOUND') {
    console.error('Endpoint not registered for x402');
  } else if (error.code === 'POLICY_VIOLATION') {
    console.error('Payment blocked by spending policy');
  }
}
```

**Common Error Codes:**

- `INSUFFICIENT_BALANCE` - Wallet has insufficient funds
- `ENDPOINT_NOT_FOUND` - Endpoint not registered
- `ENDPOINT_INACTIVE` - Endpoint is paused/disabled
- `WALLET_NOT_FOUND` - Wallet doesn't exist
- `WALLET_INACTIVE` - Wallet is frozen
- `AMOUNT_MISMATCH` - Payment amount doesn't match
- `CURRENCY_MISMATCH` - Currency doesn't match
- `POLICY_VIOLATION` - Spending policy blocked payment
- `INVALID_SIGNATURE` - Payment signature invalid
- `PAYMENT_ERROR` - Generic payment error

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
  X402Client,
  X402ClientConfig,
  X402FetchOptions,
  X402Payment,
  X402PaymentDetails,
  X402Error,
  is402Response,
  extract402Details
} from '@sly/x402-client-sdk';
```

## Utility Functions

```typescript
import { is402Response, extract402Details } from '@sly/x402-client-sdk';

// Check if response is 402
if (is402Response(response)) {
  console.log('Payment required');
}

// Extract payment details from 402 response
const details = extract402Details(response);
if (details) {
  console.log(`Amount: ${details.amount} ${details.currency}`);
}
```

## License

MIT © PayOS

## Links

- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [PayOS Documentation](https://docs.payos.com)
- [GitHub Repository](https://github.com/payos/x402-client-sdk)

## Support

For issues or questions:

- GitHub Issues: [payos/x402-client-sdk/issues](https://github.com/payos/x402-client-sdk/issues)
- Discord: [payos.com/discord](https://payos.com/discord)
- Email: support@payos.com

