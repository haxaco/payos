# Story 36.1: Create @payos/sdk Package Structure ✅

**Epic:** 36 - SDK & Developer Experience  
**Points:** 3  
**Status:** ✅ COMPLETE  
**Completed:** 2026-01-03

---

## Summary

Successfully created the `@payos/sdk` package with complete monorepo structure, build configuration, and module exports. The package is now ready for protocol implementations in subsequent stories.

---

## Deliverables

### 1. Package Structure

Created complete package at `/packages/sdk/` with:

```
packages/sdk/
├── package.json          # Package configuration with multiple entry points
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration (dual CJS/ESM)
├── vitest.config.ts      # Test configuration
├── README.md             # Comprehensive documentation
├── .gitignore
└── src/
    ├── index.ts          # Main entry point
    ├── types.ts          # Core type definitions
    ├── config.ts         # Environment configuration
    ├── client.ts         # Base API client
    ├── protocols/
    │   ├── x402/index.ts # x402 protocol (placeholder)
    │   ├── ap2/index.ts  # AP2 protocol (placeholder)
    │   └── acp/index.ts  # ACP protocol (placeholder)
    ├── facilitator/index.ts   # Sandbox facilitator (placeholder)
    └── capabilities/index.ts  # Tool discovery (placeholder)
```

### 2. Multiple Entry Points

Configured package exports for tree-shaking:

- `@payos/sdk` — Main entry with PayOS class
- `@payos/sdk/x402` — x402 protocol (Story 36.3/36.4)
- `@payos/sdk/ap2` — AP2 protocol (Story 36.5)
- `@payos/sdk/acp` — ACP protocol (Story 36.6)

### 3. Environment Configuration

Implemented three environments:

| Environment | API URL | x402 Facilitator | Use Case |
|-------------|---------|------------------|----------|
| `sandbox` | `localhost:4000` | PayOS mock | Local dev, no blockchain |
| `testnet` | `api.sandbox.payos.ai` | x402.org (Base Sepolia) | Integration testing |
| `production` | `api.payos.ai` | Coinbase CDP (Base) | Live payments |

### 4. Core Types

Defined comprehensive TypeScript types:

- `PayOSConfig` — SDK configuration
- `PayOSEnvironment` — Environment types
- `SettlementQuote` / `Settlement` — Settlement types
- `Currency` / `SettlementRail` — Payment types
- `Capability` — Tool discovery types

### 5. Base API Client

Implemented `PayOSClient` with methods:

- `getSettlementQuote()` — Get FX quote
- `createSettlement()` — Execute settlement
- `getSettlement()` — Check status
- `checkCompliance()` — Verify recipient
- `getCapabilities()` — Tool discovery

### 6. Build Configuration

- **Dual output:** CJS + ESM for maximum compatibility
- **Type declarations:** Full `.d.ts` files
- **Source maps:** For debugging
- **Tree-shakeable:** Import only what you need

### 7. Test Suite

Created comprehensive tests (21 tests, all passing):

- `config.test.ts` — Environment configuration
- `index.test.ts` — PayOS class instantiation
- `exports.test.ts` — Package exports verification

---

## Build Results

```bash
✓ Build successful
  - CJS: dist/*.js (3.01 KB main)
  - ESM: dist/*.mjs (2.88 KB main)
  - DTS: dist/*.d.ts (5.95 KB types)

✓ Tests: 21 passed (3 files)
✓ TypeScript: No errors
✓ Linter: No errors
```

---

## Dependencies

### Production Dependencies

- `@payos/types` (workspace) — Shared types
- `@x402/core` ^2.1.0 — x402 protocol core
- `@x402/evm` ^2.1.0 — EVM blockchain support
- `@x402/fetch` ^2.1.0 — x402 HTTP client
- `@x402/express` ^2.1.0 — x402 Express middleware
- `zod` ^3.22.4 — Schema validation

### Dev Dependencies

- `tsup` ^8.0.0 — Build tool
- `vitest` ^2.0.0 — Test runner
- `typescript` ^5.3.3 — Type checking

---

## Usage Examples

### Sandbox Mode (No Blockchain)

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox', // No EVM key needed!
});

// Get settlement quote
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
```

### Production Mode

```typescript
const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'production',
  evmPrivateKey: '0x...', // Required for x402
});
```

---

## Validation

### Environment Validation

The SDK validates configuration at instantiation:

- ✅ Sandbox mode works without EVM key
- ✅ Testnet/production require EVM key
- ✅ Custom API URLs supported
- ✅ Clear error messages for missing config

### Type Safety

All methods are fully typed:

```typescript
const quote: SettlementQuote = await payos.getSettlementQuote({
  fromCurrency: 'USD',  // Type: Currency
  toCurrency: 'BRL',    // Type: Currency
  amount: '100.00',     // Type: string
  rail: 'pix',          // Type: SettlementRail
});
```

---

## Next Steps

With the package structure complete, the next stories will implement:

1. **Story 36.2** (5 pts) — Sandbox Facilitator
   - Mock x402 blockchain verification
   - Enable local testing without gas fees

2. **Story 36.3** (5 pts) — x402 Client
   - Automatic 402 payment handling
   - Environment-aware signing

3. **Story 36.4** (5 pts) — x402 Provider
   - Express middleware for accepting payments
   - Verify-serve-settle pattern

4. **Story 36.5** (5 pts) — AP2 Support
   - Google mandate verification
   - Payment execution

5. **Story 36.6** (5 pts) — ACP Support
   - Stripe checkout integration
   - SharedPaymentToken handling

---

## Acceptance Criteria

All criteria met:

- ✅ Package created with correct structure
- ✅ Dependencies include @x402/* packages (v2.1.0)
- ✅ Multiple entry points work
- ✅ TypeScript types are exported
- ✅ `pnpm build` succeeds
- ✅ Package can be imported from other packages
- ✅ All tests pass (21/21)
- ✅ No TypeScript errors
- ✅ No linter errors

---

## Files Created

### Package Files
- `/packages/sdk/package.json`
- `/packages/sdk/tsconfig.json`
- `/packages/sdk/tsup.config.ts`
- `/packages/sdk/vitest.config.ts`
- `/packages/sdk/.gitignore`
- `/packages/sdk/README.md`

### Source Files
- `/packages/sdk/src/index.ts`
- `/packages/sdk/src/types.ts`
- `/packages/sdk/src/config.ts`
- `/packages/sdk/src/client.ts`
- `/packages/sdk/src/protocols/x402/index.ts`
- `/packages/sdk/src/protocols/ap2/index.ts`
- `/packages/sdk/src/protocols/acp/index.ts`
- `/packages/sdk/src/facilitator/index.ts`
- `/packages/sdk/src/capabilities/index.ts`

### Test Files
- `/packages/sdk/src/index.test.ts`
- `/packages/sdk/src/config.test.ts`
- `/packages/sdk/src/exports.test.ts`

---

## Technical Notes

### Package Export Ordering

Fixed TypeScript export condition ordering:
- `types` must come **before** `import`/`require`
- Ensures TypeScript finds type definitions correctly

### Error Handling

Implemented proper error handling in API client:
- Catches failed responses
- Parses error JSON
- Falls back to status text
- Throws typed errors

### Build Output

Optimized build configuration:
- Tree-shakeable ESM modules
- Backward-compatible CJS
- Source maps for debugging
- Type declarations for IDE support

---

**Story 36.1 Complete!** 🎉

The SDK package structure is ready. Moving to Story 36.2: Sandbox Facilitator.

