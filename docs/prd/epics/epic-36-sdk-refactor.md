# Epic 36: SDK Refactor — Wrap Official x402 Packages with Sandbox Mode

**Status:** 📋 Pending  
**Priority:** P0  
**Total Points:** 34  
**Stories:** 0/8 Complete  

---

## Executive Summary

**Problem:** Our current `@sly/x402-client-sdk` and `@sly/x402-provider-sdk` are custom implementations that don't use the official Coinbase x402 SDKs. This means:
- We're not compatible with the x402 ecosystem
- We can't accept payments from agents using `@x402/fetch` or `@x402/axios`
- We can't be listed as a facilitator in Coinbase's network
- Our payment verification is PayOS-internal, not on-chain

**Solution:** Refactor our SDKs to:
1. Wrap the official `@x402/*` packages under the hood
2. Provide a **sandbox facilitator** that mocks on-chain verification for testing
3. Allow environment switching: `sandbox` → `testnet` → `production`
4. Maintain our PayOS value-add: LATAM settlement (Pix/SPEI)

**Outcome:** Developers can test the full x402 flow locally without blockchain, then flip to testnet/production when ready.

---

## Current State Analysis

### What Exists Today

```
packages/
├── x402-client-sdk/          # @sly/x402-client-sdk
│   └── src/index.ts          # Custom X402Client class
├── x402-provider-sdk/        # @sly/x402-provider-sdk
│   └── src/index.ts          # Custom X402Provider class
apps/
├── sample-consumer/          # CLI agent using client SDK
└── sample-provider/          # Weather API using provider SDK
```

### Current SDK Architecture (Custom)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT: PayOS-Only Implementation                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  @sly/x402-client-sdk                @sly/x402-provider-sdk             │
│  ─────────────────────────             ───────────────────────────          │
│  • Parses 402 headers                  • Returns 402 with custom headers    │
│  • Calls PayOS /v1/x402/pay            • Verifies via PayOS /v1/x402/verify │
│  • Gets X-Payment-ID back              • Uses custom X-Payment-ID header    │
│  • Retries with proof header           • JWT-based local verification opt.  │
│                                                                             │
│  Dependencies: uuid only               Dependencies: none                   │
│  No @x402/* packages                   No @x402/* packages                  │
│  No viem/wallet signing                No EIP-3009 signature verification   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Official x402 Does Differently

| Aspect | Our Current SDKs | Official @x402/* |
|--------|------------------|------------------|
| **Payment Header** | Custom `X-Payment-ID`, `X-Payment-Proof` | Standard `X-PAYMENT` (base64 payload) |
| **Payment Signing** | PayOS API call returns proof | Client signs EIP-3009 with private key via `viem` |
| **Verification** | PayOS API or JWT | Facilitator verifies on-chain signature |
| **Settlement** | Internal PayOS wallet transfer | On-chain USDC transfer via EIP-3009 |
| **Wallet** | PayOS-managed wallet | User's own EVM wallet (MetaMask, etc.) |
| **Ecosystem** | PayOS only | Any x402 facilitator (x402.org, Coinbase CDP, etc.) |

---

## Target Architecture

### New SDK Structure

```
packages/
├── sdk/                              # NEW: @sly/sdk (unified)
│   ├── src/
│   │   ├── index.ts                  # Main PayOS class
│   │   ├── types.ts                  # TypeScript types
│   │   ├── client/
│   │   │   ├── index.ts              # Client module exports
│   │   │   ├── x402-client.ts        # Wraps @x402/fetch + @x402/evm
│   │   │   └── sandbox-signer.ts     # Mock signer for sandbox mode
│   │   ├── provider/
│   │   │   ├── index.ts              # Provider module exports
│   │   │   └── x402-provider.ts      # Wraps @x402/express middleware
│   │   ├── facilitator/
│   │   │   ├── index.ts              # Facilitator exports
│   │   │   ├── sandbox.ts            # PayOS Sandbox Facilitator
│   │   │   └── types.ts              # Facilitator interface types
│   │   └── settlements/
│   │       └── index.ts              # PayOS settlements API
│   └── package.json
├── x402-client-sdk/                  # DEPRECATED: Keep for backward compat
└── x402-provider-sdk/                # DEPRECATED: Keep for backward compat
```

### Environment-Based Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         @sly/sdk Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PayOS SDK (Unified Interface)                     │   │
│  │                                                                      │   │
│  │  const payos = new PayOS({                                          │   │
│  │    apiKey: 'pk_...',                                                │   │
│  │    environment: 'sandbox' | 'testnet' | 'production',               │   │
│  │    evmPrivateKey: '0x...',  // For client (making payments)         │   │
│  │    evmAddress: '0x...',     // For provider (receiving payments)    │   │
│  │  });                                                                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│  ┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐      │
│  │      SANDBOX        │ │     TESTNET     │ │    PRODUCTION       │      │
│  │                     │ │                 │ │                     │      │
│  │ • Mock EIP-3009     │ │ • Real signing  │ │ • Real signing      │      │
│  │ • PayOS facilitator │ │ • x402.org      │ │ • Coinbase CDP      │      │
│  │ • No blockchain     │ │ • Base Sepolia  │ │ • Base Mainnet      │      │
│  │ • Instant settle    │ │ • Test USDC     │ │ • Real USDC         │      │
│  │                     │ │                 │ │                     │      │
│  │ Real PayOS flows:   │ │                 │ │                     │      │
│  │ • Wallet balances   │ │                 │ │                     │      │
│  │ • Transfers         │ │                 │ │                     │      │
│  │ • Pix/SPEI settle   │ │                 │ │                     │      │
│  └─────────────────────┘ └─────────────────┘ └─────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stories

### Story 36.1: Create Unified @sly/sdk Package Structure

**Points:** 3  
**Priority:** P0  
**Dependencies:** None

**Description:**
Create the new `packages/sdk` directory with proper package.json, tsconfig, and module structure. This is the foundation for all other stories.

**Acceptance Criteria:**
- [ ] `packages/sdk/package.json` created with:
  - Name: `@sly/sdk`
  - Dependencies: `@x402/core`, `@x402/evm`, `@x402/fetch`, `@x402/express`, `viem`, `uuid`
  - Peer dependencies for `express` (optional)
  - Exports for `./client`, `./provider`, `./facilitator`
- [ ] `packages/sdk/tsconfig.json` configured
- [ ] `packages/sdk/tsup.config.ts` for building multiple entry points
- [ ] Directory structure created:
  ```
  src/
  ├── index.ts
  ├── types.ts
  ├── client/
  ├── provider/
  ├── facilitator/
  └── settlements/
  ```
- [ ] Package builds successfully with `pnpm build`
- [ ] Package exports work: `import { PayOS } from '@sly/sdk'`

**Implementation Notes:**
```json
// package.json dependencies
{
  "dependencies": {
    "@x402/core": "^0.2.0",
    "@x402/evm": "^0.2.0", 
    "@x402/fetch": "^0.2.0",
    "@x402/express": "^0.2.0",
    "viem": "^2.21.0",
    "uuid": "^9.0.0"
  }
}
```

**Files to Create:**
- `packages/sdk/package.json`
- `packages/sdk/tsconfig.json`
- `packages/sdk/tsup.config.ts`
- `packages/sdk/src/index.ts` (stub)
- `packages/sdk/src/types.ts`

---

### Story 36.2: Implement Sandbox Facilitator

**Points:** 5  
**Priority:** P0  
**Dependencies:** Story 36.1

**Description:**
Create a mock x402 facilitator that implements the standard facilitator interface (`/verify`, `/settle`, `/supported`) but skips real blockchain verification. This enables testing without gas fees or real USDC.

**Acceptance Criteria:**
- [ ] `SandboxFacilitator` class implements:
  - `verify(paymentHeader, requirements)` → accepts valid format, no signature check
  - `settle(paymentHeader, requirements)` → returns fake txHash instantly
  - `supported()` → returns supported scheme/network pairs
- [ ] Generates realistic-looking transaction hashes
- [ ] Stores payments in-memory for idempotency
- [ ] Triggers real PayOS internal transfers via API call
- [ ] Configurable settlement delay for testing
- [ ] Configurable failure rate for error testing
- [ ] Express router factory for mounting as endpoint
- [ ] Debug logging option

**Implementation Notes:**

The sandbox facilitator should:
1. Accept any payment payload that has valid JSON structure
2. Validate scheme/network match between payload and requirements
3. NOT verify the EIP-3009 signature (that's the "mock" part)
4. Generate a fake `0x...` transaction hash
5. Call PayOS API to record the payment internally
6. Return success to the caller

```typescript
// Facilitator interface (matches x402 spec)
interface Facilitator {
  verify(request: {
    x402Version: number;
    paymentHeader: string;  // Base64 encoded PaymentPayload
    paymentRequirements: PaymentRequirements;
  }): Promise<{ isValid: boolean; invalidReason?: string }>;
  
  settle(request: {
    x402Version: number;
    paymentHeader: string;
    paymentRequirements: PaymentRequirements;
  }): Promise<{ success: boolean; txHash?: string; error?: string }>;
  
  supported(): Promise<{ kinds: Array<{ scheme: string; network: string }> }>;
}
```

**Files to Create:**
- `packages/sdk/src/facilitator/sandbox.ts`
- `packages/sdk/src/facilitator/types.ts`
- `packages/sdk/src/facilitator/index.ts`

---

### Story 36.3: Implement Client Wrapper with Environment Switching

**Points:** 5  
**Priority:** P0  
**Dependencies:** Stories 36.1, 36.2

**Description:**
Create a client class that wraps `@x402/fetch` and `@x402/evm` but can switch between sandbox (mock signing) and real (actual EIP-3009 signing) based on environment.

**Acceptance Criteria:**
- [ ] `PayOSX402Client` class with environment-aware behavior:
  - `sandbox`: Uses `SandboxSigner` (mock EIP-3009 payloads)
  - `testnet`: Uses `@x402/evm` with real signing, x402.org facilitator
  - `production`: Uses `@x402/evm` with real signing, CDP facilitator
- [ ] `fetch(url, options)` method that:
  - Makes request, detects 402
  - Creates payment payload (mock or real based on env)
  - Verifies with appropriate facilitator
  - Retries with `X-PAYMENT` header
  - Settles after success
- [ ] Spending limits: `maxAutoPayAmount`, `maxDailySpend`
- [ ] Callbacks: `onPayment`, `onSettlement`
- [ ] Status method: `getStatus()` returns balance, daily spend, signer address
- [ ] Works with official x402 402 response format

**Implementation Notes:**

```typescript
// Sandbox mode - mock signer
class SandboxSigner {
  createExactPayload(requirements: PaymentRequirements): ExactPayload {
    return {
      authorization: {
        from: this.address,
        to: requirements.payTo,
        value: requirements.maxAmountRequired,
        validAfter: now - 60,
        validBefore: now + requirements.maxTimeoutSeconds,
        nonce: randomBytes32(),
      },
      signature: '0x' + 'ab'.repeat(65), // Fake signature
    };
  }
}

// Real mode - use @x402/evm
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const signer = privateKeyToAccount(privateKey);
const evmScheme = new ExactEvmScheme(signer);
```

**Files to Create:**
- `packages/sdk/src/client/x402-client.ts`
- `packages/sdk/src/client/sandbox-signer.ts`
- `packages/sdk/src/client/index.ts`

---

### Story 36.4: Implement Provider Wrapper with Environment Switching

**Points:** 5  
**Priority:** P0  
**Dependencies:** Stories 36.1, 36.2

**Description:**
Create Express middleware that wraps `@x402/express` patterns but uses PayOS facilitator in sandbox mode.

**Acceptance Criteria:**
- [ ] `PayOSX402Provider` class with:
  - Route configuration: `{ 'GET /api/premium': { price: '$0.001' } }`
  - Environment-aware facilitator selection
  - Standard x402 402 response format
- [ ] `middleware()` method returns Express middleware that:
  - Checks if route is protected
  - Returns 402 with `accepts` array (x402 format)
  - Verifies `X-PAYMENT` header with facilitator
  - Attaches payment info to `req.x402`
  - Settles after response sent (verify-then-serve-then-settle pattern)
- [ ] Compatible with official `@x402/fetch` clients
- [ ] Optional auto-settlement to Pix/SPEI after payment

**Implementation Notes:**

The provider must return 402 responses in official x402 format:
```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "maxAmountRequired": "1000000",
      "resource": "/api/premium",
      "description": "Premium API access",
      "mimeType": "application/json",
      "payTo": "0x...",
      "maxTimeoutSeconds": 60,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    }
  ]
}
```

**Files to Create:**
- `packages/sdk/src/provider/x402-provider.ts`
- `packages/sdk/src/provider/index.ts`

---

### Story 36.5: Implement Main PayOS Class

**Points:** 3  
**Priority:** P0  
**Dependencies:** Stories 36.3, 36.4

**Description:**
Create the main `PayOS` class that provides unified access to all SDK functionality.

**Acceptance Criteria:**
- [ ] `PayOS` class constructor accepts:
  - `apiKey`: PayOS API key
  - `environment`: 'sandbox' | 'testnet' | 'production'
  - `evmPrivateKey`: For client operations (optional)
  - `evmAddress`: For provider operations (optional)
  - `apiUrl`: Override PayOS API URL (optional)
  - `facilitatorUrl`: Override facilitator URL (optional)
  - `debug`: Enable debug logging
- [ ] Exposes:
  - `payos.x402` → `PayOSX402Client` instance
  - `payos.settlements` → Settlements API
  - `payos.compliance` → Compliance API
  - `payos.createProvider(options)` → Express middleware factory
  - `payos.getStatus()` → SDK status and config
- [ ] Environment defaults:
  - sandbox: `http://localhost:3456`, PayOS facilitator
  - testnet: `https://api.sandbox.payos.ai`, x402.org facilitator
  - production: `https://api.payos.ai`, Coinbase CDP facilitator

**Implementation Notes:**

```typescript
import { PayOS } from '@sly/sdk';

// Client usage
const payos = new PayOS({
  apiKey: 'pk_...',
  environment: 'sandbox',
  evmPrivateKey: '0x...',
});

const response = await payos.x402.fetch('https://api.example.com/paid');

// Provider usage
const payos = new PayOS({
  apiKey: 'pk_...',
  environment: 'sandbox',
  evmAddress: '0x...',
});

app.use(payos.createProvider({
  routes: { 'GET /api/premium': { price: '$0.001' } },
}));
```

**Files to Create:**
- `packages/sdk/src/index.ts` (main PayOS class)

---

### Story 36.6: Add Sandbox Facilitator API Endpoint

**Points:** 3  
**Priority:** P0  
**Dependencies:** Story 36.2

**Description:**
Add the sandbox facilitator as an endpoint in the PayOS API so the SDK can use it.

**Acceptance Criteria:**
- [ ] `POST /v1/x402/facilitator/verify` endpoint
- [ ] `POST /v1/x402/facilitator/settle` endpoint
- [ ] `GET /v1/x402/facilitator/supported` endpoint
- [ ] Endpoints call `SandboxFacilitator` internally
- [ ] Record payments in database for tracking
- [ ] Trigger internal wallet transfers on settle
- [ ] Only enabled in sandbox/development mode
- [ ] Returns standard x402 facilitator response format

**Implementation Notes:**

```typescript
// apps/api/src/routes/x402-facilitator.ts
import { Router } from 'express';
import { SandboxFacilitator } from '@sly/sdk/facilitator';

const router = Router();
const facilitator = new SandboxFacilitator({
  payosApiUrl: process.env.PAYOS_API_URL,
  payosApiKey: process.env.PAYOS_INTERNAL_KEY,
});

router.post('/verify', async (req, res) => {
  const result = await facilitator.verify(req.body);
  res.json(result);
});

router.post('/settle', async (req, res) => {
  const result = await facilitator.settle(req.body);
  res.json(result);
});

router.get('/supported', async (req, res) => {
  const result = await facilitator.supported();
  res.json(result);
});

export default router;
```

**Files to Create:**
- `apps/api/src/routes/x402-facilitator.ts`

**Files to Modify:**
- `apps/api/src/index.ts` (mount router)

---

### Story 36.7: Update Sample Apps to Use New SDK

**Points:** 5  
**Priority:** P1  
**Dependencies:** Stories 36.5, 36.6

**Description:**
Migrate `sample-provider` and `sample-consumer` to use the new `@sly/sdk` instead of the old custom SDKs.

**Acceptance Criteria:**
- [ ] `sample-provider` updated:
  - Uses `PayOS.createProvider()` instead of `X402Provider`
  - Returns standard x402 402 response format
  - Works with official `@x402/fetch` clients
  - Maintains same Weather API functionality
- [ ] `sample-consumer` updated:
  - Uses `payos.x402.fetch()` instead of `X402Client.fetch()`
  - Can call providers using official x402 format
  - Maintains same CLI functionality
- [ ] E2E test passes: consumer calls provider, payment flows through
- [ ] Both work in sandbox mode (no blockchain required)
- [ ] Documentation updated in sample app READMEs

**Implementation Notes:**

```typescript
// sample-provider - BEFORE
import { X402Provider } from '@sly/x402-provider-sdk';
const x402 = new X402Provider({ apiKey: '...' });
app.get('/api/forecast', x402.protect(), handler);

// sample-provider - AFTER
import { PayOS } from '@sly/sdk';
const payos = new PayOS({ 
  apiKey: '...', 
  environment: 'sandbox',
  evmAddress: '0x...',
});
app.use(payos.createProvider({
  routes: { 'GET /api/weather/forecast': { price: '$0.001' } },
}));
app.get('/api/weather/forecast', handler);
```

```typescript
// sample-consumer - BEFORE
import { X402Client } from '@sly/x402-client-sdk';
const x402 = new X402Client({ apiKey: '...', agentId: '...' });
const response = await x402.fetch(url);

// sample-consumer - AFTER
import { PayOS } from '@sly/sdk';
const payos = new PayOS({
  apiKey: '...',
  environment: 'sandbox',
  evmPrivateKey: '0x...',
});
const response = await payos.x402.fetch(url);
```

**Files to Modify:**
- `apps/sample-provider/src/index.ts`
- `apps/sample-provider/package.json`
- `apps/sample-consumer/src/index.ts`
- `apps/sample-consumer/package.json`

---

### Story 36.8: Deprecation Notices and Migration Guide

**Points:** 2  
**Priority:** P1  
**Dependencies:** Story 36.7

**Description:**
Add deprecation notices to old SDKs and create migration documentation.

**Acceptance Criteria:**
- [ ] `@sly/x402-client-sdk` shows deprecation warning on import
- [ ] `@sly/x402-provider-sdk` shows deprecation warning on import
- [ ] Old SDKs continue to work (no breaking changes)
- [ ] Migration guide created: `docs/guides/SDK_MIGRATION.md`
- [ ] CHANGELOG updated with migration instructions
- [ ] README in old packages points to new SDK

**Implementation Notes:**

```typescript
// packages/x402-client-sdk/src/index.ts
console.warn(
  '[@sly/x402-client-sdk] This package is deprecated. ' +
  'Please migrate to @sly/sdk. See https://docs.payos.ai/migration'
);

export * from './legacy'; // Keep old exports working
```

**Files to Modify:**
- `packages/x402-client-sdk/src/index.ts`
- `packages/x402-provider-sdk/src/index.ts`

**Files to Create:**
- `docs/guides/SDK_MIGRATION.md`

---

## Story Summary

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 36.1 | 3 | P0 | Create unified @sly/sdk package structure |
| 36.2 | 5 | P0 | Implement Sandbox Facilitator |
| 36.3 | 5 | P0 | Implement Client Wrapper with environment switching |
| 36.4 | 5 | P0 | Implement Provider Wrapper with environment switching |
| 36.5 | 3 | P0 | Implement main PayOS class |
| 36.6 | 3 | P0 | Add Sandbox Facilitator API endpoint |
| 36.7 | 5 | P1 | Update sample apps to use new SDK |
| 36.8 | 2 | P1 | Deprecation notices and migration guide |
| **Total** | **34** | | |

---

## Technical Specifications

### Official x402 Package Versions

```json
{
  "@x402/core": "^0.2.0",
  "@x402/evm": "^0.2.0",
  "@x402/fetch": "^0.2.0",
  "@x402/express": "^0.2.0"
}
```

### x402 Protocol Format Reference

**402 Response Body:**
```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "maxAmountRequired": "1000000",
      "resource": "/api/endpoint",
      "description": "API access",
      "mimeType": "application/json",
      "payTo": "0x...",
      "maxTimeoutSeconds": 60,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    }
  ]
}
```

**X-PAYMENT Header (Base64 JSON):**
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "eip155:84532",
  "payload": {
    "authorization": {
      "from": "0x...",
      "to": "0x...",
      "value": "1000000",
      "validAfter": 1234567890,
      "validBefore": 1234567950,
      "nonce": "0x..."
    },
    "signature": "0x..."
  }
}
```

### USDC Contract Addresses

| Network | Chain ID | USDC Address |
|---------|----------|--------------|
| Base Mainnet | eip155:8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | eip155:84532 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Ethereum Mainnet | eip155:1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Ethereum Sepolia | eip155:11155111 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

### Environment Configuration Defaults

```typescript
const ENVIRONMENTS = {
  sandbox: {
    apiUrl: 'http://localhost:3456',
    facilitatorUrl: 'http://localhost:3456/v1/x402/facilitator',
  },
  testnet: {
    apiUrl: 'https://api.sandbox.payos.ai',
    facilitatorUrl: 'https://x402.org/facilitator',
  },
  production: {
    apiUrl: 'https://api.payos.ai',
    facilitatorUrl: 'https://api.cdp.coinbase.com/platform/v2/x402',
  },
};
```

---

## Testing Strategy

### Unit Tests
- Sandbox facilitator verify/settle logic
- Payment payload encoding/decoding
- Environment switching
- Spending limit enforcement

### Integration Tests
- Sample provider returns correct 402 format
- Sample consumer parses 402 and creates payment
- End-to-end sandbox flow (no blockchain)
- PayOS internal transfer triggered on settle

### Compatibility Tests
- Official `@x402/fetch` client can pay our provider
- Our client can pay official `@x402/express` provider
- Payment header format matches spec

---

## Dependencies

**Requires:**
- PayOS API running with x402 endpoints
- Node.js 18+

**Enables:**
- AP2/ACP sample apps (use same pattern)
- MCP server integration
- Production x402 facilitator registration

---

## Success Criteria

1. **Sandbox works without blockchain**: Developer can run sample apps locally, make payments, see balances change, without any blockchain interaction

2. **Compatible with x402 ecosystem**: A client using official `@x402/fetch` can pay a PayOS provider, and vice versa

3. **Environment switching works**: Same code can switch from sandbox → testnet → production by changing one config value

4. **PayOS value-add preserved**: After x402 payment, can trigger Pix/SPEI settlement

---

## Related Documentation

- [x402 Protocol Spec](https://github.com/coinbase/x402/tree/main/specs)
- [x402 Quickstart for Sellers](https://docs.cdp.coinbase.com/x402/quickstart-for-sellers)
- [x402 Quickstart for Buyers](https://docs.cdp.coinbase.com/x402/quickstart-for-buyers)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [Current PayOS Sample Apps PRD](../guides/deployment/SAMPLE_APPS_PRD.md)
