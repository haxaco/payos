# x402 Protocol Documentation

The x402 protocol implements HTTP 402 Payment Required for machine-to-machine micropayments. This protocol enables AI agents and automated systems to pay for API access in real-time.

## Overview

x402 is a lightweight protocol that adds payment capabilities to any HTTP API. When a client makes a request to a protected endpoint, the server responds with 402 Payment Required if payment is needed. The client then completes payment and retries the request.

**Status:** Production-ready, fully tested and deployed

## Key Features

- HTTP 402 Payment Required status code
- Real-time micropayments for API access
- Wallet-based payment flow
- Provider settlement system
- Agent authentication and authorization
- Automatic retry with payment credentials
- Built-in analytics and tracking

## Documentation Index

### Getting Started

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_SDK_GUIDE.md](X402_SDK_GUIDE.md) | SDK integration guide | Learn how to integrate x402 into your app |
| [X402_MANUAL_TESTING_GUIDE.md](X402_MANUAL_TESTING_GUIDE.md) | Manual testing procedures | Test x402 functionality manually |
| [X402_TEST_CREDENTIALS.md](X402_TEST_CREDENTIALS.md) | Test credentials setup | Get credentials for testing |

**Start here:** [X402_SDK_GUIDE.md](X402_SDK_GUIDE.md)

### Testing Documentation

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_GEMINI_TESTING_GUIDE.md](X402_GEMINI_TESTING_GUIDE.md) | AI-assisted testing guide | Test x402 with AI assistants |
| [X402_TESTING_SCENARIOS.md](X402_TESTING_SCENARIOS.md) | Test scenarios and cases | Comprehensive test scenarios |
| [X402_WALLET_TESTING_GUIDE.md](X402_WALLET_TESTING_GUIDE.md) | Wallet testing procedures | Test wallet functionality |
| [X402_UI_TEST_REPORT.md](X402_UI_TEST_REPORT.md) | UI testing results | UI component test results |
| [X402_TEST_REPORT.md](X402_TEST_REPORT.md) | General test report | Overall test results |
| [X402_TEST_REPORT_2025_12_23.md](X402_TEST_REPORT_2025_12_23.md) | Latest test report | Most recent test results |

### Implementation & Migration

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_IMPLEMENTATION_STATUS.md](X402_IMPLEMENTATION_STATUS.md) | Implementation progress | Track implementation status |
| [X402_MIGRATION_COMPLETE.md](X402_MIGRATION_COMPLETE.md) | Migration completion | Migration to production complete |
| [X402_MIGRATION_TEST_REPORT.md](X402_MIGRATION_TEST_REPORT.md) | Migration testing results | Validate migration success |
| [X402_MIGRATION_VERIFIED.md](X402_MIGRATION_VERIFIED.md) | Migration verification | Final migration verification |

### Performance & Optimization

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_PERFORMANCE_ANALYSIS.md](X402_PERFORMANCE_ANALYSIS.md) | Performance analysis | Identify bottlenecks |
| [X402_PERFORMANCE_OPTIMIZATION_PLAN.md](X402_PERFORMANCE_OPTIMIZATION_PLAN.md) | Optimization roadmap | Performance improvement plan |
| [X402_ASYNC_OPTIMIZATION_ANALYSIS.md](X402_ASYNC_OPTIMIZATION_ANALYSIS.md) | Async optimization | Async operation improvements |

### Status & Tracking

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_DEPLOYMENT_STATUS.md](X402_DEPLOYMENT_STATUS.md) | Deployment status | Production deployment tracking |
| [X402_BUSINESS_SCENARIOS_STATUS.md](X402_BUSINESS_SCENARIOS_STATUS.md) | Business scenario validation | Validate business use cases |
| [X402_STATUS_AND_PERFORMANCE.md](X402_STATUS_AND_PERFORMANCE.md) | Combined status report | Overall status and metrics |
| [X402_AUDIT_TRAIL.md](X402_AUDIT_TRAIL.md) | Audit and compliance | Compliance tracking |
| [X402_NEXT_SESSION.md](X402_NEXT_SESSION.md) | Next development tasks | Planned improvements |

### Testing Results

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_P0_TESTING_COMPLETE.md](X402_P0_TESTING_COMPLETE.md) | P0 testing completion | Critical path testing done |
| [X402_TESTING_SESSION_COMPLETE.md](X402_TESTING_SESSION_COMPLETE.md) | Testing session summary | Testing session results |
| [X402_TESTING_COMPLETE.md](X402_TESTING_COMPLETE.md) | Overall testing completion | All testing completed |
| [X402_TEST_RESULTS.md](X402_TEST_RESULTS.md) | Detailed test results | Comprehensive test results |

### Bug Fixes & Issues

| Document | Description | Purpose |
|----------|-------------|---------|
| [X402_FIXES_APPLIED.md](X402_FIXES_APPLIED.md) | Applied bug fixes | Track resolved issues |
| [X402_SETUP_SNAGS_SUMMARY.md](X402_SETUP_SNAGS_SUMMARY.md) | Setup issue resolutions | Common setup problems |

## Quick Start

### For Consumers (Using x402-protected APIs)

```typescript
import { X402Client } from '@sly/x402-client-sdk';

// Initialize client
const client = new X402Client({
  apiKey: 'pk_test_your_key',
  walletId: 'wallet_123'
});

// Make paid request (payment handled automatically)
const data = await client.get('https://api.example.com/data');
```

### For Providers (Protecting your API)

```typescript
import { X402Provider } from '@sly/x402-provider-sdk';

// Initialize provider
const provider = new X402Provider({
  apiKey: 'pk_test_your_key',
  settlementAccount: 'acct_123'
});

// Add middleware to protect routes
app.use('/api', provider.middleware({
  pricePerRequest: 0.001 // $0.001 per request
}));
```

See [X402_SDK_GUIDE.md](X402_SDK_GUIDE.md) for complete integration guide.

## Protocol Flow

```
1. Client → Server: GET /api/data
2. Server → Client: 402 Payment Required
   Headers:
   - X402-Price: 0.001
   - X402-Wallet: wallet_provider_123
   - X402-Payment-Id: pay_456

3. Client → PayOS: POST /v1/x402/payments
   Body: { payment_id, wallet_id, amount }

4. PayOS → Client: { status: "completed" }

5. Client → Server: GET /api/data
   Headers:
   - X402-Payment: pay_456

6. Server → Client: 200 OK
   Body: { data: [...] }
```

## API Endpoints

### Consumer Endpoints

```
POST   /v1/x402/payments          # Create payment
GET    /v1/x402/payments/:id      # Get payment status
GET    /v1/x402/wallets/:id       # Get wallet balance
```

### Provider Endpoints

```
POST   /v1/x402/endpoints         # Register endpoint
GET    /v1/x402/endpoints         # List endpoints
GET    /v1/x402/endpoints/:id     # Get endpoint details
PUT    /v1/x402/endpoints/:id     # Update endpoint
DELETE /v1/x402/endpoints/:id     # Delete endpoint
GET    /v1/x402/analytics         # Get analytics
```

## Database Schema

### Core Tables

- `x402_endpoints` - Registered provider endpoints
- `x402_payments` - Payment records
- `x402_settlements` - Provider settlements
- `wallets` - User and provider wallets
- `wallet_transactions` - Transaction history

See [../../architecture/wallet-schema.md](../../architecture/wallet-schema.md) for details.

## Testing

### Manual Testing

1. Read [X402_MANUAL_TESTING_GUIDE.md](X402_MANUAL_TESTING_GUIDE.md)
2. Set up test credentials: [X402_TEST_CREDENTIALS.md](X402_TEST_CREDENTIALS.md)
3. Test scenarios: [X402_TESTING_SCENARIOS.md](X402_TESTING_SCENARIOS.md)
4. Wallet testing: [X402_WALLET_TESTING_GUIDE.md](X402_WALLET_TESTING_GUIDE.md)

### Automated Testing

```bash
# Run x402 unit tests
pnpm --filter @sly/api test tests/unit/x402

# Run x402 integration tests
INTEGRATION=true pnpm --filter @sly/api test tests/integration/x402
```

### AI-Assisted Testing

Follow [X402_GEMINI_TESTING_GUIDE.md](X402_GEMINI_TESTING_GUIDE.md) for AI-assisted testing procedures.

## Performance

### Current Metrics

- Payment creation: ~50ms avg
- Payment verification: ~20ms avg
- Endpoint registration: ~100ms avg
- Analytics query: ~150ms avg

See [X402_PERFORMANCE_ANALYSIS.md](X402_PERFORMANCE_ANALYSIS.md) for detailed metrics.

### Optimization

Review [X402_PERFORMANCE_OPTIMIZATION_PLAN.md](X402_PERFORMANCE_OPTIMIZATION_PLAN.md) for planned improvements.

## Production Status

**Deployment:** Complete and verified

- API endpoints deployed to Railway
- Database migrations applied
- RLS policies active
- Monitoring configured
- Analytics enabled

See [X402_DEPLOYMENT_STATUS.md](X402_DEPLOYMENT_STATUS.md) for details.

## Business Scenarios

Validated scenarios:

- AI agent API consumption
- Micropayment-per-request billing
- Provider settlement flows
- Multi-tenant isolation
- High-volume transaction processing

See [X402_BUSINESS_SCENARIOS_STATUS.md](X402_BUSINESS_SCENARIOS_STATUS.md) for validation results.

## Common Issues

### Setup Issues

See [X402_SETUP_SNAGS_SUMMARY.md](X402_SETUP_SNAGS_SUMMARY.md) for common setup problems and solutions.

### Known Bugs

See [X402_FIXES_APPLIED.md](X402_FIXES_APPLIED.md) for resolved issues.

## Related Documentation

- [Protocol Overview](../README.md) - All protocol documentation
- [AP2 Protocol](../ap2/README.md) - Advanced agent payments
- [ACP Protocol](../acp/README.md) - Agent commerce
- [Architecture](../../architecture/) - System architecture
- [Security](../../security/) - Security and RLS
- [PRD](../../prd/PayOS_PRD_Development.md) - Epic 17 (x402 Gateway)

## Next Steps

See [X402_NEXT_SESSION.md](X402_NEXT_SESSION.md) for planned improvements and features.

---

**Protocol Version:** 1.0
**Status:** Production
**Last Updated:** December 29, 2025
**Maintained By:** PayOS Team

For questions or issues, see the main [PayOS Documentation](../../README.md).
