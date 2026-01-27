# Story 40.28: Environment Configuration System - COMPLETE ✅

**Epic:** 40 - External Sandbox Integrations & E2E Validation  
**Story:** 40.28 - Environment Configuration System  
**Points:** 2  
**Status:** ✅ Complete  
**Completed:** January 4, 2026

---

## Overview

Implemented a comprehensive environment configuration system for PayOS API and SDK, enabling seamless switching between mock, sandbox, and production environments with per-service overrides and feature flags.

---

## Acceptance Criteria

- [x] Environment enum: `mock`, `sandbox`, `production`
- [x] Per-service environment override capability
- [x] Feature flags for gradual rollout
- [x] Validation: can't use production in dev
- [x] Logging indicates current environment
- [x] Test: Switch environments, verify behavior

---

## Implementation Details

### Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/config/environment.ts` | API environment configuration manager |
| `apps/api/src/config/environment.test.ts` | 23 unit tests for API config |
| `packages/sdk/src/config/environment.ts` | SDK environment configuration |
| `packages/sdk/src/config/environment.test.ts` | 30 unit tests for SDK config |
| `docs/guides/development/ENVIRONMENT_CONFIGURATION.md` | Developer guide |

### Files Modified

| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | Added environment logging on startup |

---

## Key Features

### 1. Three Environment Modes

```typescript
type PayOSEnvironment = 'mock' | 'sandbox' | 'production';
```

| Environment | Description | External Calls |
|-------------|-------------|----------------|
| `mock` | All services mocked | None |
| `sandbox` | External sandbox APIs | Circle sandbox, Base Sepolia, x402.org |
| `production` | Live production APIs | Circle, Base mainnet, Coinbase CDP |

### 2. Per-Service Environment Overrides

```bash
# Override individual services
PAYOS_ENVIRONMENT=mock
PAYOS_CIRCLE_ENV=sandbox
PAYOS_CIRCLE_API_KEY=your-key
```

Six configurable services:
- `circle` - Circle Programmable Wallets
- `blockchain` - Base/EVM blockchain
- `x402` - x402 facilitator
- `stripe` - Stripe for ACP
- `compliance` - Elliptic/ComplyAdvantage
- `fx` - FX rate providers

### 3. Feature Flags

12 feature flags for gradual rollout:

```bash
PAYOS_FEATURE_CIRCLE_PAYOUTS=true
PAYOS_FEATURE_X402_PAYMENTS=true
PAYOS_FEATURE_WALLET_SCREENING=false
```

| Flag | Description | Default (Mock) | Default (Sandbox) |
|------|-------------|----------------|-------------------|
| `circlePayouts` | Circle Pix/SPEI payouts | ✅ | ✅ |
| `circleWallets` | Circle Programmable Wallets | ✅ | ✅ |
| `x402Payments` | x402 blockchain payments | ✅ | ✅ |
| `walletScreening` | Elliptic wallet screening | ❌ | ✅ |
| `entityScreening` | ComplyAdvantage screening | ❌ | ❌ |
| ... | (7 more flags) | | |

### 4. Production Safety

```typescript
// Prevents accidental production use
if (payosEnv === 'production' && nodeEnv !== 'production' && !allowProductionInDev) {
  throw new Error('Cannot use production environment outside of NODE_ENV=production');
}
```

### 5. Startup Logging

On server start, displays:

```
╔══════════════════════════════════════════════════════════════╗
║                    ENVIRONMENT CONFIGURATION                  ║
╠══════════════════════════════════════════════════════════════╣
║  🌍 Environment: MOCK                                        ║
║  📊 Log Level: debug                                          ║
╠══════════════════════════════════════════════════════════════╣
║  External Services:                                          ║
║  ✅ circle      : MOCK                                         ║
║  ✅ blockchain  : MOCK                                         ║
║  ✅ x402        : MOCK                                         ║
║  ✅ stripe      : MOCK                                         ║
║  ✅ compliance  : MOCK                                         ║
║  ✅ fx          : MOCK                                         ║
╠══════════════════════════════════════════════════════════════╣
║  Feature Flags (9 enabled):                                    ║
║    • circlePayouts                                           ║
║    • circleWallets                                           ║
║    ... and more                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## API Usage

### API Server

```typescript
import { 
  environmentManager,
  getEnvironment,
  getServiceConfig,
  isFeatureEnabled,
  isMock,
  isSandbox
} from './config/environment.js';

// Get current environment
const env = getEnvironment(); // 'mock' | 'sandbox' | 'production'

// Get service-specific config
const circleConfig = getServiceConfig('circle');
console.log(circleConfig.apiUrl);  // https://api-sandbox.circle.com
console.log(circleConfig.enabled); // true

// Check feature flags
if (isFeatureEnabled('circlePayouts')) {
  // Pix/SPEI payouts are available
}

// Validate for operation
environmentManager.validateForOperation('createPixPayout', ['circlePayouts']);
```

### SDK

```typescript
import { 
  createExtendedConfig,
  getEnvironmentHint 
} from '@sly/sdk/config/environment';

const config = createExtendedConfig({
  apiKey: 'pk_test_xxx',
  environment: 'sandbox',
  features: {
    sandboxFacilitator: false,
  },
});
```

---

## Test Results

### API Config Tests (23 passing)

```
✓ Environment Detection (3 tests)
✓ Production Safety (3 tests)
✓ Service Configuration (5 tests)
✓ Feature Flags (4 tests)
✓ Environment Helpers (3 tests)
✓ Operation Validation (2 tests)
✓ Service URLs (2 tests)
✓ Startup Logging (1 test)
```

### SDK Config Tests (30 passing)

```
✓ normalizeEnvironment (4 tests)
✓ requiresEvmKey (4 tests)
✓ getExtendedServiceUrl (3 tests)
✓ getSDKFeatures (3 tests)
✓ validateExtendedConfig (5 tests)
✓ createExtendedConfig (3 tests)
✓ getEnvironmentHint (4 tests)
✓ SDK_SERVICE_URLS (2 tests)
✓ DEFAULT_SDK_FEATURES (2 tests)
```

---

## Service URLs by Environment

| Service | Mock | Sandbox | Production |
|---------|------|---------|------------|
| Circle | `localhost:4000/mock/circle` | `api-sandbox.circle.com` | `api.circle.com` |
| Blockchain | `localhost:8545` | `sepolia.base.org` | `mainnet.base.org` |
| x402 | `localhost:4000/v1/x402/facilitator` | `x402.org/facilitator` | `facilitator.coinbase.com` |
| Stripe | `localhost:4000/mock/stripe` | `api.stripe.com` (test) | `api.stripe.com` (live) |
| Compliance | `localhost:4000/mock/compliance` | `api-sandbox.elliptic.co` | `api.elliptic.co` |

---

## Next Steps

This story unblocks all other Epic 40 stories:

1. **Story 40.1**: Circle Sandbox Account Setup - Can now set `PAYOS_CIRCLE_ENV=sandbox`
2. **Story 40.7**: Base Sepolia Setup - Can now set `PAYOS_BLOCKCHAIN_ENV=sandbox`
3. **Story 40.8**: x402.org Integration - Can now set `PAYOS_X402_ENV=sandbox`
4. **Story 40.12**: Stripe Test Mode - Can now set `PAYOS_STRIPE_ENV=sandbox`

---

## Documentation

- [Environment Configuration Guide](../../guides/development/ENVIRONMENT_CONFIGURATION.md)
- [Epic 40 PRD](../../prd/epics/epic-40-sandbox-integrations.md)
- [Implementation Sequence](../../prd/IMPLEMENTATION_SEQUENCE.md)

---

*Story 40.28 Complete - January 4, 2026*



