# PayOS Environment Configuration Guide

**Story:** 40.28 - Environment Configuration System  
**Created:** January 4, 2026

This guide covers the environment configuration system for PayOS, enabling seamless switching between mock, sandbox, and production environments.

---

## Where to Set API Keys

API keys are stored in `.env` files (gitignored for security):

```
apps/api/.env          ← API server environment variables
```

**To create your `.env` file:**

```bash
# Copy the template
cp apps/api/.env.template apps/api/.env

# Or create manually with the variables below
```

---

## Quick Start

### Mock Mode (Default)

For local development without any external API calls:

```bash
PAYOS_ENVIRONMENT=mock
```

### Sandbox Mode

For testing with real external sandbox APIs (Circle, Base Sepolia, x402.org):

```bash
PAYOS_ENVIRONMENT=sandbox
CIRCLE_API_KEY=your-circle-sandbox-key
```

### Production Mode

For live production (requires explicit approval):

```bash
NODE_ENV=production
PAYOS_ENVIRONMENT=production
```

---

## Environment Types

| Environment | Description | External Calls | Use Case |
|-------------|-------------|----------------|----------|
| `mock` | All services mocked | None | Local development, CI/CD |
| `sandbox` | External sandbox APIs | Circle sandbox, Base Sepolia, x402.org | Integration testing, demos |
| `production` | Live production APIs | Circle, Base mainnet, Coinbase CDP | Live payments |

---

## Core Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `PAYOS_ENVIRONMENT` | Global environment | `mock`, `sandbox`, `production` |
| `SUPABASE_URL` | Database URL | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_KEY` | Database key | `eyJ...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PAYOS_LOG_LEVEL` | Logging level | `debug` (dev), `info` (prod) |
| `ALLOW_PRODUCTION_IN_DEV` | Allow prod in non-prod NODE_ENV | `false` |

---

## Per-Service Environment Overrides

Each service can have its own environment override:

```bash
# Override Circle to use sandbox while everything else is mock
PAYOS_ENVIRONMENT=mock
PAYOS_CIRCLE_ENV=sandbox
PAYOS_CIRCLE_API_KEY=your-key
```

### Available Services

| Service | Env Variable | URL Variable | Key Variable |
|---------|--------------|--------------|--------------|
| Circle | `PAYOS_CIRCLE_ENV` | `PAYOS_CIRCLE_URL` | `PAYOS_CIRCLE_API_KEY` |
| Coinbase | `PAYOS_COINBASE_ENV` | `PAYOS_COINBASE_URL` | `PAYOS_COINBASE_API_KEY` |
| Blockchain | `PAYOS_BLOCKCHAIN_ENV` | `PAYOS_BLOCKCHAIN_URL` | - |
| x402 | `PAYOS_X402_ENV` | `PAYOS_X402_URL` | - |
| Stripe | `PAYOS_STRIPE_ENV` | - | `PAYOS_STRIPE_API_KEY` |
| Compliance | `PAYOS_COMPLIANCE_ENV` | `PAYOS_COMPLIANCE_URL` | `PAYOS_COMPLIANCE_API_KEY` |
| FX | `PAYOS_FX_ENV` | - | - |

### Disabling Services

```bash
PAYOS_CIRCLE_ENABLED=false
PAYOS_COMPLIANCE_ENABLED=false
```

---

## Feature Flags

Feature flags control which capabilities are available:

```bash
# Enable/disable specific features
PAYOS_FEATURE_CIRCLE_PAYOUTS=true
PAYOS_FEATURE_X402_PAYMENTS=true
PAYOS_FEATURE_WALLET_SCREENING=false
```

### All Feature Flags

| Flag | Description | Default (Mock) | Default (Sandbox) |
|------|-------------|----------------|-------------------|
| `CIRCLE_PAYOUTS` | Circle Pix/SPEI payouts | ✅ | ✅ |
| `CIRCLE_WALLETS` | Circle Programmable Wallets | ✅ | ✅ |
| `CIRCLE_FX_QUOTES` | Circle FX quotes | ✅ | ✅ |
| `X402_PAYMENTS` | x402 blockchain payments | ✅ | ✅ |
| `X402_SETTLEMENT` | x402 → Circle bridge | ✅ | ✅ |
| `SUPERFLUID_STREAMING` | Superfluid streams | ❌ | ❌ |
| `ACP_SPT` | ACP SharedPaymentToken | ✅ | ✅ |
| `AP2_VDC` | AP2 mandate verification | ✅ | ✅ |
| `WALLET_SCREENING` | Elliptic wallet screening | ❌ | ✅ |
| `ENTITY_SCREENING` | ComplyAdvantage screening | ❌ | ❌ |
| `BATCH_SETTLEMENTS` | Batch settlements (100+) | ✅ | ✅ |
| `MULTI_CURRENCY` | Multi-currency (BRL↔MXN) | ✅ | ✅ |

---

## Service URLs by Environment

### Circle Payments API (Pix/SPEI)

| Environment | URL |
|-------------|-----|
| mock | `http://localhost:4000/mock/circle` |
| sandbox | `https://api-sandbox.circle.com` |
| production | `https://api.circle.com` |

**Key Format:** `SAND_API_KEY:...` (sandbox) or `API_KEY:...` (production)

### Circle Web3 Services (Testnet Wallets)

| Environment | URL |
|-------------|-----|
| sandbox/testnet | `https://api.circle.com/v1/w3s` |
| production | `https://api.circle.com/v1/w3s` |

**Key Format:** `TEST_API_KEY:...` (testnet) or `API_KEY:...` (production)

**Additional Variables Required:**
```bash
CIRCLE_CONSOLE_KEY=TEST_API_KEY:...     # Web3 Services API key
CIRCLE_ENTITY_SECRET=<32-byte-hex>       # Entity secret for wallet operations
CIRCLE_WALLET_SET_ID=<uuid>              # Wallet set ID (created via API)
CIRCLE_WALLET_ID=<uuid>                  # Wallet ID (created via API)
CIRCLE_WALLET_ADDRESS=0x...              # Wallet address on Base Sepolia
```

**Setup Script:**
```bash
cd apps/api && npx tsx scripts/demo-circle-w3s.ts
```

**Documentation:**
- Entity Secret: https://developers.circle.com/wallets/dev-controlled/entity-secret-management
- Faucet API: https://developers.circle.com/w3s/developer-console-faucet

### Coinbase CDP (Developer Platform)

| Environment | URL |
|-------------|-----|
| mock | `http://localhost:4000/mock/coinbase` |
| sandbox | `https://api.developer.coinbase.com` |
| production | `https://api.developer.coinbase.com` |

### Blockchain (Base)

| Environment | URL |
|-------------|-----|
| mock | `http://localhost:8545` |
| sandbox | `https://sepolia.base.org` |
| production | `https://mainnet.base.org` |

### x402 Facilitator

| Environment | URL |
|-------------|-----|
| mock | `http://localhost:4000/v1/x402/facilitator` |
| sandbox | `https://x402.org/facilitator` |
| production | `https://facilitator.coinbase.com` |

---

## Programmatic Access

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

// Environment checks
if (isMock()) {
  // Use mock implementations
}

// Validate for operation
environmentManager.validateForOperation('createPixPayout', ['circlePayouts']);
```

### SDK

```typescript
import { PayOS } from '@sly/sdk';
import { 
  createExtendedConfig,
  getEnvironmentHint 
} from '@sly/sdk/config/environment';

// Create SDK with extended config
const config = createExtendedConfig({
  apiKey: 'pk_test_xxx',
  environment: 'sandbox',
  features: {
    sandboxFacilitator: false, // Use real x402.org
  },
});

const payos = new PayOS(config);

// Get environment hint
console.log(getEnvironmentHint('sandbox'));
// 🔬 Sandbox/Testnet mode: Using Base Sepolia + x402.org + Circle sandbox.
```

---

## Safety Checks

### Production Safety

PayOS prevents accidental production usage:

```typescript
// This will throw an error
PAYOS_ENVIRONMENT=production
NODE_ENV=development

// Error: Cannot use production environment outside of NODE_ENV=production.
```

To override (NOT RECOMMENDED):

```bash
ALLOW_PRODUCTION_IN_DEV=true
```

### EVM Key Requirements

| Environment | EVM Key Required |
|-------------|------------------|
| mock | ❌ No |
| sandbox | ❌ No (uses mock signing) |
| testnet | ✅ Yes |
| production | ✅ Yes |

---

## Startup Logging

On server start, the environment configuration is logged:

```
╔══════════════════════════════════════════════════════════════╗
║                    ENVIRONMENT CONFIGURATION                  ║
╠══════════════════════════════════════════════════════════════╣
║  🌍 Environment: SANDBOX                                      ║
║  📊 Log Level: debug                                          ║
╠══════════════════════════════════════════════════════════════╣
║  External Services:                                          ║
║  ✅ circle      : SANDBOX                                     ║
║  ✅ blockchain  : SANDBOX                                     ║
║  ✅ x402        : SANDBOX                                     ║
║  ✅ stripe      : SANDBOX                                     ║
║  ❌ compliance  : DISABLED                                    ║
║  ✅ fx          : SANDBOX                                     ║
╠══════════════════════════════════════════════════════════════╣
║  Feature Flags (10 enabled):                                  ║
║    • circlePayouts                                            ║
║    • circleWallets                                            ║
║    • x402Payments                                             ║
║    • x402Settlement                                           ║
║    • acpSharedPaymentToken                                    ║
║    ... and 5 more                                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Complete .env Template

Copy this to `apps/api/.env` and fill in your values:

```bash
# ===========================================
# CORE SETTINGS
# ===========================================
NODE_ENV=development
PORT=4000
API_HOST=localhost

# ===========================================
# PAYOS ENVIRONMENT
# ===========================================
# Options: mock, sandbox, production
PAYOS_ENVIRONMENT=mock
PAYOS_LOG_LEVEL=debug

# ===========================================
# DATABASE (SUPABASE) - REQUIRED
# ===========================================
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# ===========================================
# CIRCLE API (for sandbox/production)
# Get keys at: https://console.circle.com/
# ===========================================
# CIRCLE_API_KEY=
# CIRCLE_ENTITY_SECRET=

# ===========================================
# COINBASE CDP (for x402 facilitator)
# Get keys at: https://portal.cdp.coinbase.com/
# ===========================================
# New format (UUID):
# CDP_API_KEY_ID=7ccc78ac-512d-4bbd-bf20-14bf27badf11
# CDP_PRIVATE_KEY=PF155c6tfXD8F/rTeEPFFxO6nGPvvTx1eM80FEUAF/Qk89PFTASVBbbI64ADxRjMNiorFwK68FwdwINO1f+R0A==
#
# Legacy format:
# CDP_API_KEY_NAME=organizations/.../apiKeys/...
# CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----...

# ===========================================
# BLOCKCHAIN / EVM (for testnet/production)
# ===========================================
# EVM_PRIVATE_KEY=0x...
# BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# ===========================================
# STRIPE (for ACP)
# Get keys at: https://dashboard.stripe.com/apikeys
# ===========================================
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# ===========================================
# COMPLIANCE
# ===========================================
# ELLIPTIC_API_KEY=
# ELLIPTIC_API_SECRET=
# COMPLY_ADVANTAGE_API_KEY=

# ===========================================
# PER-SERVICE OVERRIDES (optional)
# ===========================================
# PAYOS_CIRCLE_ENV=sandbox
# PAYOS_CIRCLE_API_KEY=your-key
# PAYOS_COINBASE_ENV=sandbox
# PAYOS_COINBASE_API_KEY=your-cdp-key
# PAYOS_BLOCKCHAIN_ENV=sandbox
# PAYOS_X402_ENV=sandbox
# PAYOS_STRIPE_ENV=sandbox
# PAYOS_COMPLIANCE_ENABLED=false

# ===========================================
# FEATURE FLAGS (optional)
# ===========================================
# PAYOS_FEATURE_CIRCLE_PAYOUTS=true
# PAYOS_FEATURE_X402_PAYMENTS=true
# PAYOS_FEATURE_WALLET_SCREENING=false

# ===========================================
# WORKERS
# ===========================================
ENABLE_SCHEDULED_TRANSFERS=false
ENABLE_WEBHOOK_CLEANUP=true
ENABLE_SETTLEMENT_WINDOWS=true
ENABLE_TREASURY_WORKER=true
```

---

## Example Configurations

### Local Development (Mock Everything)

```bash
# .env
PAYOS_ENVIRONMENT=mock
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=your-local-key
```

### Integration Testing (Circle Sandbox)

```bash
# .env.test
PAYOS_ENVIRONMENT=mock
PAYOS_CIRCLE_ENV=sandbox
PAYOS_CIRCLE_API_KEY=your-circle-sandbox-key
PAYOS_FEATURE_WALLET_SCREENING=false
```

### Full Sandbox Testing

```bash
# .env.sandbox
PAYOS_ENVIRONMENT=sandbox
CIRCLE_API_KEY=your-circle-sandbox-key
EVM_PRIVATE_KEY=your-testnet-key
PAYOS_FEATURE_WALLET_SCREENING=true
ELLIPTIC_API_KEY=your-elliptic-key
```

### Production

```bash
# .env.production
NODE_ENV=production
PAYOS_ENVIRONMENT=production
CIRCLE_API_KEY=your-circle-production-key
EVM_PRIVATE_KEY=your-mainnet-key
PAYOS_FEATURE_WALLET_SCREENING=true
PAYOS_FEATURE_ENTITY_SCREENING=true
```

---

## Troubleshooting

### "Cannot use production environment outside of NODE_ENV=production"

You're trying to use `PAYOS_ENVIRONMENT=production` but `NODE_ENV` is not `production`. Either:
1. Set `NODE_ENV=production` (recommended)
2. Set `ALLOW_PRODUCTION_IN_DEV=true` (not recommended)

### "EVM private key is required"

For testnet/production environments, you need an EVM private key for signing blockchain transactions. Use `mock` or `sandbox` mode for development without keys.

### "Feature X is disabled"

A feature flag is preventing the operation. Enable it with:
```bash
PAYOS_FEATURE_X=true
```

---

## Related Documentation

- [Epic 40: Sandbox Integrations](../../prd/epics/epic-40-sandbox-integrations.md)
- [Implementation Sequence](../../prd/IMPLEMENTATION_SEQUENCE.md)
- [SDK Developer Experience](../../prd/epics/epic-36-sdk-developer-experience.md)

