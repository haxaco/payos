# @payos/sdk

Unified SDK for PayOS multi-protocol settlement infrastructure in LATAM.

## Overview

PayOS SDK provides a single, unified interface for settling payments across multiple protocols and local rails. Whether you're building with x402 micropayments, Google's AP2 mandates, or Stripe's ACP checkout, PayOS completes the last mile: **USDC → BRL/MXN via Pix/SPEI**.

## Features

- 🔌 **Multi-Protocol Support**: x402, AP2, ACP, and direct API
- 🧪 **Sandbox Mode**: Test without blockchain, gas fees, or real USDC
- 🌎 **LATAM Rails**: Native Pix (Brazil) and SPEI (Mexico) integration
- 🤖 **AI-Ready**: Built for AI agents with tool discovery
- 📦 **TypeScript**: Full type safety with comprehensive types
- 🌳 **Tree-Shakeable**: Import only what you need

## Installation

```bash
npm install @payos/sdk
# or
pnpm add @payos/sdk
# or
yarn add @payos/sdk
```

## Quick Start

### Sandbox Mode (No Blockchain)

Perfect for local development:

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox', // No EVM key needed!
});

// Get a settlement quote
const quote = await payos.getSettlementQuote({
  fromCurrency: 'USD',
  toCurrency: 'BRL',
  amount: '100.00',
  rail: 'pix',
});

// Create settlement
const settlement = await payos.createSettlement({
  quoteId: quote.id,
  destinationAccountId: 'acc_...',
});

// Create x402 client
const client = payos.x402.createClient();
const response = await client.fetch('https://api.example.com/premium');

// Create x402 provider
const provider = payos.x402.createProvider({
  'GET /api/premium': { price: '0.01', description: 'Premium content' },
});
```

### Production Mode

```typescript
const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'production',
  evmPrivateKey: '0x...', // Required for x402 on mainnet
});
```

## Protocol Modules

### x402 (Micropayments)

Coming in Story 36.3/36.4 - Client and Provider implementations

```typescript
import { PayOS } from '@payos/sdk';

// Client: Make x402 payments
const client = payos.x402.createClient({ maxPayment: '$0.01' });
const response = await client.fetch('https://api.example.com/premium');

// Provider: Accept x402 payments
const provider = payos.x402.createProvider({
  routes: {
    'GET /api/premium': { price: '$0.001' },
  },
});
app.use(provider.middleware());
```

### AP2 (Agent Mandates)

Coming in Story 36.5 - Google Agent-to-Agent Protocol

```typescript
// Verify and execute mandate
const mandate = await payos.ap2.verifyMandate(token);
const result = await payos.ap2.executePayment({
  mandateId: mandate.id,
  amount: '100.00',
});
```

### ACP (Checkout)

Coming in Story 36.6 - Stripe/OpenAI Agentic Commerce Protocol

```typescript
// Create checkout session
const checkout = await payos.acp.createCheckout({
  cartItems: [...],
});

// Complete with SharedPaymentToken
await payos.acp.completeCheckout({
  checkoutId: checkout.id,
  paymentToken: 'spt_...',
});
```

### Card Networks (Visa VIC & Mastercard Agent Pay)

Accept payments from AI agents using Web Bot Auth signature verification:

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: 'pk_live_...',
  environment: 'production',
});

// Verify incoming agent signature
const result = await payos.cards.verifyAgentSignature({
  method: request.method,
  path: request.path,
  headers: request.headers,
  signatureInput: request.headers['signature-input'],
  signature: request.headers['signature'],
});

if (result.valid) {
  console.log(`Verified ${result.network} agent from ${result.agentProvider}`);
  // Process payment...
}

// Check network configuration
const { networks, capabilities } = await payos.cards.getNetworks();
console.log(`Visa: ${networks.visa.status}, MC: ${networks.mastercard.status}`);

// Get analytics
const analytics = await payos.cards.getAnalytics(30);
console.log(`${analytics.verifications.total} verifications, ${analytics.verifications.successRate}% success`);
```

#### Visa VIC Operations

```typescript
// Create a payment instruction
const instruction = await payos.cards.visa.createInstruction({
  amount: 100.00,
  currency: 'USD',
  merchant: {
    name: 'My Store',
    categoryCode: '5411',
    country: 'US',
  },
  expiresInSeconds: 900,
});

// Provision a VTS token
const token = await payos.cards.visa.createToken({
  instructionId: instruction.instructionId,
  cardToken: 'tok_visa_...',
});

// List tokens
const { data: tokens } = await payos.cards.visa.listTokens();
```

#### Mastercard Agent Pay Operations

```typescript
// Register an agent with Mastercard
const registration = await payos.cards.mastercard.registerAgent({
  agentId: 'agent_123',
  publicKey: '-----BEGIN PUBLIC KEY-----...',
  capabilities: ['payment', 'tokenization'],
  provider: 'anthropic',
});

// Create an agentic token with DTVC
const token = await payos.cards.mastercard.createToken({
  agentId: 'agent_123',
  cardToken: 'tok_mc_...',
  expiresInSeconds: 3600,
});

// Get token with fresh DTVC
const refreshed = await payos.cards.mastercard.getToken(token.tokenReference, {
  refresh: true,
});
```

## Environment Configuration

| Environment | API URL | x402 Facilitator | Use Case |
|-------------|---------|------------------|----------|
| `sandbox` | `localhost:4000` | PayOS mock | Local dev, no blockchain |
| `testnet` | `api.sandbox.payos.ai` | x402.org (Base Sepolia) | Integration testing |
| `production` | `api.payos.ai` | Coinbase CDP (Base) | Live payments |

## API Methods

### Settlements

```typescript
// Get quote
const quote = await payos.getSettlementQuote({
  fromCurrency: 'USD',
  toCurrency: 'BRL',
  amount: '100.00',
});

// Create settlement
const settlement = await payos.createSettlement({
  quoteId: quote.id,
  destinationAccountId: 'acc_...',
});

// Check status
const status = await payos.getSettlement(settlement.id);
```

### Compliance

```typescript
const check = await payos.checkCompliance({
  recipientAccountId: 'acc_...',
  amount: '100.00',
  currency: 'USD',
});

if (!check.approved) {
  console.log('Compliance flags:', check.flags);
}
```

### Capabilities (Tool Discovery)

```typescript
const capabilities = await payos.getCapabilities();
console.log('Supported operations:', capabilities.capabilities);
```

## TypeScript Support

Full type definitions included:

```typescript
import type { 
  PayOSConfig,
  Settlement,
  SettlementQuote,
  Currency,
  SettlementRail,
} from '@payos/sdk';
```

## Sandbox Facilitator

The Sandbox Facilitator enables local x402 testing without blockchain:

```typescript
import { SandboxFacilitator } from '@payos/sdk/facilitator';

const facilitator = new SandboxFacilitator({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
  settlementDelayMs: 100,  // Optional: simulate delay
  failureRate: 5,          // Optional: 5% random failures
  debug: true,             // Optional: enable logging
});

// Verify payment
const verification = await facilitator.verify({ payment });

// Settle payment
const settlement = await facilitator.settle({ payment });
console.log('Transaction hash:', settlement.transactionHash);
```

### Express Integration

Mount as API endpoints:

```typescript
import express from 'express';
import { createSandboxFacilitatorRouter } from '@payos/sdk/facilitator';

const app = express();
app.use(express.json());

const facilitator = createSandboxFacilitatorRouter({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
});

app.use('/v1/x402/facilitator', facilitator);
app.listen(4000);
```

Now x402 clients can use `http://localhost:4000/v1/x402/facilitator` as the facilitator URL.

## Development Status

This SDK is under active development as part of Epic 36:

- ✅ Story 36.1: Package structure (Complete)
- ✅ Story 36.2: Sandbox facilitator (Complete)
- ✅ Story 36.3: x402 Client (Complete)
- ✅ Story 36.4: x402 Provider (Complete)
- ✅ Story 36.7: Main PayOS class (Complete)
- ✅ Story 36.8: Facilitator API endpoints (Complete)
- 🚧 Story 36.9: Capabilities API (Next)
- 🚧 Story 36.10: Function-calling format (Pending)
- 🚧 Story 36.11: MCP Server (Pending)
- 🚧 Story 36.12: LangChain tools (Pending)
- 🚧 Story 36.5: AP2 Support (Pending)
- 🚧 Story 36.6: ACP Support (Pending)

## Contributing

See the main [PayOS repository](https://github.com/payos/payos) for contribution guidelines.

## License

MIT

