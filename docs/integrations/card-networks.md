# Card Network Integration Guide

Accept payments from AI agents using Visa Intelligent Commerce (VIC) and Mastercard Agent Pay.

## Overview

PayOS integrates with card networks to enable merchants to accept payments from AI agents. This works through **Web Bot Auth**, a signature verification system that allows AI agents to prove their identity when making purchases.

### Key Concepts

- **Web Bot Auth**: HTTP signature protocol for AI agent authentication
- **Visa VIC**: Visa Intelligent Commerce for agent-controlled transactions
- **Mastercard Agent Pay**: Mastercard's agentic commerce solution
- **DTVC**: Dynamic Transaction Verification Code for Mastercard

## Prerequisites

1. PayOS account with card networks enabled
2. API key (`pk_test_...` for sandbox, `pk_live_...` for production)
3. (Optional) Sandbox credentials from Visa/Mastercard developer portals

## Quick Start

### 1. Install the SDK

```bash
npm install @payos/sdk
```

### 2. Configure Card Networks

Configure your card networks in the PayOS Dashboard or via API:

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: 'pk_live_...',
  environment: 'production',
});

// Configure Visa VIC
await payos.cards.configureVisa({
  api_key: 'your_visa_api_key',
  shared_secret: 'your_shared_secret',
  sandbox: false,
});

// Configure Mastercard Agent Pay
await payos.cards.configureMastercard({
  consumer_key: 'your_consumer_key',
  private_key_pem: '-----BEGIN PRIVATE KEY-----...',
  sandbox: false,
});
```

### 3. Verify Agent Signatures

When an AI agent makes a request to your endpoint, verify their signature:

```typescript
import { PayOS } from '@payos/sdk';
import express from 'express';

const app = express();
const payos = new PayOS({
  apiKey: 'pk_live_...',
  environment: 'production',
});

app.post('/checkout', async (req, res) => {
  // Verify the agent's Web Bot Auth signature
  const verification = await payos.cards.verifyAgentSignature({
    method: req.method,
    path: req.path,
    headers: req.headers as Record<string, string>,
    signatureInput: req.headers['signature-input'] as string,
    signature: req.headers['signature'] as string,
  });

  if (!verification.valid) {
    return res.status(401).json({ error: 'Invalid agent signature' });
  }

  console.log(`Verified ${verification.network} agent from ${verification.agentProvider}`);

  // Process the payment...
  res.json({ success: true });
});
```

## Use Cases

### Use Case 1: Merchant Accepting Agent Payments

Accept payments from AI agents like Claude or GPT that have been authorized by users.

```typescript
// In your payment endpoint
app.post('/api/pay', async (req, res) => {
  const { signatureInput, signature } = req.headers;

  // 1. Verify the agent
  const verification = await payos.cards.verifyAgentSignature({
    method: req.method,
    path: req.path,
    headers: req.headers,
    signatureInput,
    signature,
  });

  if (!verification.valid) {
    return res.status(401).json({ error: verification.error });
  }

  // 2. Log the agent details
  console.log({
    network: verification.network,     // 'visa' or 'mastercard'
    provider: verification.agentProvider, // 'anthropic', 'openai', etc.
    keyId: verification.keyId,
  });

  // 3. Process the order
  const order = await processOrder(req.body);

  res.json({ orderId: order.id, status: 'completed' });
});
```

### Use Case 2: Creating Visa Payment Instructions

Set up predefined payment parameters that agents must follow:

```typescript
// Create an instruction for a specific purchase
const instruction = await payos.cards.visa.createInstruction({
  amount: 99.99,
  currency: 'USD',
  merchant: {
    name: 'My Online Store',
    categoryCode: '5411', // Grocery stores
    country: 'US',
    url: 'https://mystore.com',
  },
  restrictions: {
    maxAmount: 100,
    allowedCountries: ['US', 'CA'],
  },
  expiresInSeconds: 900, // 15 minutes
  metadata: {
    orderId: 'order_123',
    customerId: 'cust_456',
  },
});

console.log(`Instruction created: ${instruction.instructionId}`);
```

### Use Case 3: Mastercard Agent Registration

Register your AI agents with Mastercard for recurring payments:

```typescript
// Register an agent
const registration = await payos.cards.mastercard.registerAgent({
  agentId: 'agent_123', // Your PayOS agent ID
  agentName: 'Shopping Assistant',
  publicKey: agentPublicKey,
  capabilities: ['payment', 'tokenization', 'recurring'],
  provider: 'anthropic',
  callbackUrl: 'https://myapp.com/mc-callback',
});

console.log(`MC Agent ID: ${registration.mcAgentId}`);

// Create an agentic token for the agent
const token = await payos.cards.mastercard.createToken({
  agentId: 'agent_123',
  cardToken: 'tok_mc_...', // Card token from your payment processor
  expiresInSeconds: 3600,
});

console.log(`DTVC: ${token.dtvc}`);
```

### Use Case 4: Token Management

Manage tokens for recurring agent payments:

```typescript
// Visa: Provision a VTS token
const visaToken = await payos.cards.visa.createToken({
  instructionId: 'vic_instruction_123',
  cardToken: 'tok_visa_...',
  metadata: { purpose: 'recurring_subscription' },
});

// Visa: List active tokens
const { data: visaTokens } = await payos.cards.visa.listTokens({
  status: 'active',
});

// Visa: Suspend a token
await payos.cards.visa.suspendToken(visaToken.tokenId);

// Mastercard: Get token with fresh DTVC
const mcToken = await payos.cards.mastercard.getToken('tok_ref_123', {
  refresh: true, // Get a new DTVC
});

// Mastercard: Revoke token
await payos.cards.mastercard.revokeToken('tok_ref_123');
```

## Analytics & Monitoring

Track your card network activity:

```typescript
// Get comprehensive analytics
const analytics = await payos.cards.getAnalytics(30); // Last 30 days

console.log({
  // Verification metrics
  totalVerifications: analytics.verifications.total,
  successRate: analytics.verifications.successRate,
  byNetwork: analytics.verifications.byNetwork,
  byProvider: analytics.verifications.byProvider,

  // Transaction metrics
  totalTransactions: analytics.transactions.total,
  volume: analytics.transactions.volume,
  byStatus: analytics.transactions.byStatus,
});

// Get recent transactions
const { data: transactions } = await payos.cards.listTransactions({
  network: 'visa',
  limit: 20,
});
```

## Network Configuration

### Check Network Status

```typescript
const { networks, capabilities } = await payos.cards.getNetworks();

console.log({
  visa: {
    configured: networks.visa.configured,
    status: networks.visa.status,
    sandbox: networks.visa.sandbox,
  },
  mastercard: {
    configured: networks.mastercard.configured,
    status: networks.mastercard.status,
    sandbox: networks.mastercard.sandbox,
  },
  capabilities: {
    webBotAuth: capabilities.webBotAuth,
    paymentInstructions: capabilities.paymentInstructions,
    agentRegistration: capabilities.agentRegistration,
    tokenization: capabilities.tokenization,
  },
});
```

### Test Network Connection

```typescript
// Test Visa connection
const visaTest = await payos.cards.testNetwork('visa');
console.log(`Visa: ${visaTest.success ? 'Connected' : visaTest.error}`);

// Test Mastercard connection
const mcTest = await payos.cards.testNetwork('mastercard');
console.log(`Mastercard: ${mcTest.success ? 'Connected' : mcTest.error}`);
```

### Disconnect Network

```typescript
// Remove network credentials
await payos.cards.disconnectNetwork('visa');
```

## Direct API Usage

If you prefer using the API directly without the SDK:

```typescript
// Verify agent signature
const response = await fetch('https://api.payos.ai/v1/cards/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    method: 'POST',
    path: '/checkout',
    headers: req.headers,
    signatureInput: req.headers['signature-input'],
    signature: req.headers['signature'],
  }),
});

const { valid, network, agentProvider } = await response.json();
```

## Security Best Practices

1. **Always verify signatures**: Never process payments without verifying the agent signature
2. **Check expiration**: Payment instructions and tokens have expiration times
3. **Use restrictions**: Limit payment amounts, merchant categories, and countries
4. **Monitor analytics**: Watch for unusual patterns in verification failures
5. **Rotate credentials**: Periodically rotate your API credentials
6. **Use sandbox first**: Test thoroughly in sandbox before going live

## Troubleshooting

### Verification Fails

```typescript
const result = await payos.cards.verifyAgentSignature({...});

if (!result.valid) {
  console.error({
    error: result.error,
    // Common errors:
    // - 'Signature expired' - Request is too old
    // - 'Invalid signature' - Signature doesn't match
    // - 'Unknown key ID' - Agent not registered
  });
}
```

### Network Not Configured

```typescript
const { networks } = await payos.cards.getNetworks();

if (!networks.visa.configured) {
  // Configure via Dashboard or API
  await payos.cards.configureVisa({...});
}
```

### Token Expired

```typescript
// Mastercard: Refresh DTVC
const token = await payos.cards.mastercard.getToken(tokenRef, {
  refresh: true,
});

// Visa: Create new token if expired
if (isExpired(visaToken)) {
  await payos.cards.visa.createToken({...});
}
```

## API Reference

See the full [Card Networks API Reference](../api/cards.md) for all endpoints and parameters.
