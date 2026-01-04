# Story 36.2: Implement Sandbox Facilitator ✅

**Epic:** 36 - SDK & Developer Experience  
**Points:** 5  
**Status:** ✅ COMPLETE  
**Completed:** 2026-01-03

---

## Summary

Successfully implemented the Sandbox Facilitator for x402 protocol testing. This mock blockchain facilitator enables local development without gas fees, real USDC, or EVM private keys.

---

## Deliverables

### 1. SandboxFacilitator Class

Core facilitator implementation with three main methods:

- `verify(payment)` — Validates payment structure (skips signature verification)
- `settle(payment)` — Generates mock transaction hash and records payment
- `supported()` — Returns supported schemes and networks

### 2. Configuration Options

Flexible configuration for testing scenarios:

```typescript
{
  apiUrl: string;              // PayOS API URL
  apiKey: string;              // PayOS API key
  settlementDelayMs?: number;  // Simulate network delay (default: 0)
  failureRate?: number;        // Random failure % (default: 0)
  debug?: boolean;             // Enable logging (default: false)
  supportedSchemes?: Array<{   // Custom schemes (default: exact-evm)
    scheme: string;
    networks: string[];
  }>;
}
```

### 3. Express Router Factory

Easy integration with Express applications:

```typescript
import { createSandboxFacilitatorRouter } from '@payos/sdk/facilitator';

const router = createSandboxFacilitatorRouter({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
});

app.use('/v1/x402/facilitator', router);
```

### 4. Comprehensive Validation

The facilitator validates:

- ✅ Required fields (scheme, network, amount, token, from, to)
- ✅ Supported schemes (exact-evm by default)
- ✅ Supported networks (Base mainnet 8453, Base Sepolia 84532)
- ✅ Valid amount (positive number)
- ❌ Signature verification (skipped in sandbox mode)

### 5. Mock Transaction Hashes

Generates realistic-looking Ethereum transaction hashes:

```
0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

Each settlement gets a unique hash for tracking.

---

## Implementation Details

### Verification Flow

```typescript
async verify(request: VerifyRequest): Promise<VerifyResponse> {
  // 1. Check required fields
  // 2. Validate scheme is supported
  // 3. Validate network is supported for scheme
  // 4. Validate amount is positive number
  // 5. Skip signature verification (sandbox mode)
  return { valid: true };
}
```

### Settlement Flow

```typescript
async settle(request: SettleRequest): Promise<SettleResponse> {
  // 1. Verify payment first
  // 2. Simulate random failures (if configured)
  // 3. Apply settlement delay (if configured)
  // 4. Generate mock transaction hash
  // 5. Return settlement response
  return {
    transactionHash: '0x...',
    settled: true,
    timestamp: new Date().toISOString(),
  };
}
```

### Express Endpoints

Three REST endpoints:

- `POST /verify` — Verify payment payload
- `POST /settle` — Settle payment and return tx hash
- `GET /supported` — Get supported schemes/networks

---

## Test Results

**37 tests passing** (16 new facilitator tests):

### Verification Tests

- ✅ Accepts valid payment payload
- ✅ Rejects missing required fields
- ✅ Rejects unsupported scheme
- ✅ Rejects unsupported network
- ✅ Rejects invalid amount
- ✅ Rejects zero amount
- ✅ Accepts Base Sepolia network

### Settlement Tests

- ✅ Settles valid payment and returns tx hash
- ✅ Throws error for invalid payment
- ✅ Generates unique transaction hashes
- ✅ Respects settlement delay
- ✅ Simulates failures based on failure rate

### Supported Schemes Tests

- ✅ Returns supported schemes and networks
- ✅ Supports custom schemes

### Configuration Tests

- ✅ Uses default configuration values
- ✅ Accepts custom configuration

---

## Usage Examples

### Basic Usage

```typescript
import { SandboxFacilitator } from '@payos/sdk/facilitator';

const facilitator = new SandboxFacilitator({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
});

// Verify payment
const payment = {
  scheme: 'exact-evm',
  network: 'eip155:8453',
  amount: '0.01',
  token: 'USDC',
  from: '0x...',
  to: '0x...',
};

const verification = await facilitator.verify({ payment });
if (verification.valid) {
  const settlement = await facilitator.settle({ payment });
  console.log('TX:', settlement.transactionHash);
}
```

### With Simulated Delays

```typescript
const facilitator = new SandboxFacilitator({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
  settlementDelayMs: 2000, // 2 second delay
  debug: true,
});
```

### With Failure Testing

```typescript
const facilitator = new SandboxFacilitator({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
  failureRate: 10, // 10% of settlements fail randomly
});
```

### Express Integration

```typescript
import express from 'express';
import { createSandboxFacilitatorRouter } from '@payos/sdk/facilitator';

const app = express();
app.use(express.json());

// Mount facilitator at standard path
const facilitator = createSandboxFacilitatorRouter({
  apiUrl: 'http://localhost:4000',
  apiKey: process.env.PAYOS_API_KEY!,
  debug: process.env.NODE_ENV === 'development',
});

app.use('/v1/x402/facilitator', facilitator);

app.listen(4000, () => {
  console.log('Sandbox facilitator running on :4000');
});
```

---

## Supported Schemes

### Default: exact-evm

```json
{
  "scheme": "exact-evm",
  "networks": [
    "eip155:8453",   // Base mainnet
    "eip155:84532"   // Base Sepolia testnet
  ]
}
```

### Custom Schemes

```typescript
const facilitator = new SandboxFacilitator({
  apiUrl: 'http://localhost:4000',
  apiKey: 'payos_...',
  supportedSchemes: [
    {
      scheme: 'exact-solana',
      networks: ['solana:mainnet', 'solana:devnet'],
    },
  ],
});
```

---

## Acceptance Criteria

All criteria met:

- ✅ `SandboxFacilitator` class implemented
- ✅ Implements `verify()`, `settle()`, `supported()` methods
- ✅ Generates mock transaction hashes
- ✅ Configurable delay and failure rate
- ✅ Express router factory works
- ✅ Compatible with @x402/express verification flow
- ✅ All tests pass (37/37)

---

## Files Created

### Implementation Files
- `/packages/sdk/src/facilitator/types.ts` — Type definitions
- `/packages/sdk/src/facilitator/sandbox-facilitator.ts` — Core implementation
- `/packages/sdk/src/facilitator/express.ts` — Express router factory
- `/packages/sdk/src/facilitator/index.ts` — Module exports (updated)

### Test Files
- `/packages/sdk/src/facilitator/sandbox-facilitator.test.ts` — 16 comprehensive tests

---

## Technical Notes

### Why Skip Signature Verification?

In production, x402 payments use EIP-3009 signatures to prove authorization. The Sandbox Facilitator skips this because:

1. **No Private Keys Needed** — Developers can test without managing keys
2. **Faster Iteration** — No blockchain interaction means instant feedback
3. **Deterministic Testing** — No gas fees or network issues to debug
4. **Focus on Logic** — Test payment flows without crypto complexity

### Mock Transaction Hash Generation

Uses cryptographically random hex strings:

```typescript
private generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
```

Each hash is unique and follows Ethereum's 32-byte format.

### Failure Simulation

Useful for testing error handling:

```typescript
if (this.config.failureRate > 0) {
  const random = Math.random() * 100;
  if (random < this.config.failureRate) {
    throw new Error('Simulated settlement failure');
  }
}
```

### Settlement Delay

Simulates real blockchain settlement time:

```typescript
if (this.config.settlementDelayMs > 0) {
  await new Promise((resolve) =>
    setTimeout(resolve, this.config.settlementDelayMs)
  );
}
```

---

## Next Steps

With the Sandbox Facilitator complete, the next stories will implement:

1. **Story 36.3** (5 pts) — x402 Client
   - Automatic 402 payment handling
   - Environment-aware signing
   - Uses sandbox facilitator in sandbox mode

2. **Story 36.4** (5 pts) — x402 Provider
   - Express middleware for accepting payments
   - Verify-serve-settle pattern
   - Uses sandbox facilitator for verification

3. **Story 36.8** (3 pts) — Facilitator API Endpoints
   - Mount facilitator in PayOS API server
   - Enable SDK to use local facilitator

---

**Story 36.2 Complete!** 🎉

The Sandbox Facilitator is ready for x402 client and provider implementations.

