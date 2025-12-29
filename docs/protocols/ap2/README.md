# AP2 Protocol Documentation

The Agentic Payment Protocol version 2 (AP2) provides advanced payment capabilities for AI agents, supporting complex workflows, multi-party settlements, and enhanced security patterns.

## Overview

AP2 is the next-generation protocol for AI agent payments, building on the foundation of x402 with additional features for complex business scenarios. It supports advanced authorization patterns, multi-party settlements, and protocol extensibility.

**Status:** Foundation complete, UI integration complete

## Key Features

- Advanced agent payment capabilities
- Multi-party settlement support
- Complex authorization patterns
- Enhanced security and verification
- Protocol metadata and extensibility
- Agent payment policies
- Settlement automation
- Compliance tracking

## Documentation Index

### Implementation Documentation

| Document | Description | Status |
|----------|-------------|--------|
| [AP2_FOUNDATION_COMPLETE.md](AP2_FOUNDATION_COMPLETE.md) | Foundation implementation complete | Complete |
| [AP2_FOUNDATION_IMPLEMENTATION_COMPLETE.md](AP2_FOUNDATION_IMPLEMENTATION_COMPLETE.md) | Detailed implementation report | Complete |

### UI Integration

| Document | Description | Status |
|----------|-------------|--------|
| [AP2_UI_INTEGRATION_STATUS.md](AP2_UI_INTEGRATION_STATUS.md) | UI integration status | Complete |
| [AP2_UI_FIXES_COMPLETE.md](AP2_UI_FIXES_COMPLETE.md) | UI bug fixes complete | Complete |

### Issue Tracking

| Document | Description | Status |
|----------|-------------|--------|
| [AP2_MINOR_ISSUES_PLAN.md](AP2_MINOR_ISSUES_PLAN.md) | Minor issues and fixes | In Progress |

## Quick Start

### For Consumers (Agent Payments)

```typescript
import { AP2Client } from '@payos/api-client';

const client = new AP2Client({
  apiKey: 'pk_test_your_key',
  agentId: 'agent_123'
});

// Create complex payment with multiple parties
const payment = await client.createPayment({
  amount: 10.00,
  recipients: [
    { account: 'acct_merchant', amount: 8.00, role: 'merchant' },
    { account: 'acct_platform', amount: 2.00, role: 'platform_fee' }
  ],
  metadata: {
    orderId: 'order_456',
    purpose: 'service_purchase'
  },
  authorization: {
    type: 'delegated',
    scope: ['payment.create', 'settlement.automatic']
  }
});
```

### For Providers (Multi-Party Settlements)

```typescript
import { AP2Provider } from '@payos/api-client';

const provider = new AP2Provider({
  apiKey: 'pk_test_your_key',
  settlementAccount: 'acct_123'
});

// Create settlement with multiple parties
const settlement = await provider.createSettlement({
  payments: ['pay_123', 'pay_456', 'pay_789'],
  recipients: [
    { account: 'acct_provider', percentage: 80 },
    { account: 'acct_platform', percentage: 20 }
  ],
  metadata: {
    settlementPeriod: '2025-12-01/2025-12-31'
  }
});
```

## Protocol Flow

```
1. Agent → PayOS: POST /v1/ap2/payments
   Body: {
     amount: 10.00,
     recipients: [...],
     authorization: {...},
     metadata: {...}
   }

2. PayOS → Agent: {
     id: 'pay_123',
     status: 'authorized',
     authorization_token: 'auth_456'
   }

3. PayOS (background): Multi-party settlement
   - Debit agent wallet
   - Credit merchant (80%)
   - Credit platform (20%)
   - Create settlement record

4. Provider → PayOS: GET /v1/ap2/settlements
   Response: [{ id, payments, amounts, status }]
```

## API Endpoints

### Payment Endpoints

```
POST   /v1/ap2/payments           # Create AP2 payment
GET    /v1/ap2/payments/:id       # Get payment status
GET    /v1/ap2/payments           # List payments
PATCH  /v1/ap2/payments/:id       # Update payment (cancel, etc.)
```

### Settlement Endpoints

```
POST   /v1/ap2/settlements        # Create settlement
GET    /v1/ap2/settlements/:id    # Get settlement details
GET    /v1/ap2/settlements        # List settlements
POST   /v1/ap2/settlements/:id/execute  # Execute settlement
```

### Authorization Endpoints

```
POST   /v1/ap2/authorizations     # Create authorization
GET    /v1/ap2/authorizations/:id # Get authorization
DELETE /v1/ap2/authorizations/:id # Revoke authorization
```

## Database Schema

### Core Tables

- `ap2_payments` - AP2 payment records
- `ap2_payment_recipients` - Multi-party recipient splits
- `ap2_settlements` - Settlement records
- `ap2_settlement_items` - Settlement line items
- `ap2_authorizations` - Agent authorization grants
- `protocol_metadata` - Extensible metadata storage

See [../../architecture/wallet-schema.md](../../architecture/wallet-schema.md) for details.

## Features

### Multi-Party Settlements

AP2 supports payments split across multiple recipients:

```typescript
{
  amount: 100.00,
  recipients: [
    { account: 'merchant', amount: 80.00, role: 'merchant' },
    { account: 'platform', amount: 15.00, role: 'platform_fee' },
    { account: 'charity', amount: 5.00, role: 'donation' }
  ]
}
```

### Advanced Authorization

Granular authorization patterns for agent payments:

- **Delegated**: Agent acts on behalf of user
- **Autonomous**: Agent authorized for specific scopes
- **Supervised**: Requires human approval
- **Time-bounded**: Authorization expires after period
- **Amount-limited**: Maximum per-transaction or daily limits

### Protocol Metadata

Extensible metadata system for custom fields:

```typescript
{
  metadata: {
    orderId: 'order_123',
    customerId: 'cust_456',
    productSku: 'PROD-789',
    shippingMethod: 'express',
    tags: ['priority', 'international']
  }
}
```

## Implementation Status

### Completed Features

- [x] Core AP2 payment API
- [x] Multi-party settlements
- [x] Authorization framework
- [x] Protocol metadata system
- [x] Database schema and migrations
- [x] RLS policies
- [x] API endpoints
- [x] UI integration
- [x] Dashboard pages
- [x] Component library

See [AP2_FOUNDATION_IMPLEMENTATION_COMPLETE.md](AP2_FOUNDATION_IMPLEMENTATION_COMPLETE.md) for details.

### UI Integration

- [x] AP2 payments dashboard
- [x] Settlement management UI
- [x] Authorization management
- [x] Multi-party recipient editor
- [x] Metadata editor
- [x] Analytics and reporting

See [AP2_UI_INTEGRATION_STATUS.md](AP2_UI_INTEGRATION_STATUS.md) for UI details.

### In Progress

See [AP2_MINOR_ISSUES_PLAN.md](AP2_MINOR_ISSUES_PLAN.md) for current work items.

## Testing

### Unit Tests

```bash
# Run AP2 unit tests
pnpm --filter @payos/api test tests/unit/ap2
```

### Integration Tests

```bash
# Run AP2 integration tests
INTEGRATION=true pnpm --filter @payos/api test tests/integration/ap2
```

### Manual Testing

1. Navigate to `/dashboard/agentic-payments` in UI
2. Create test payment with multiple recipients
3. Verify settlement creation
4. Test authorization workflows

## Performance

AP2 is optimized for:

- High-volume payment processing
- Complex multi-party calculations
- Real-time authorization checks
- Efficient settlement batching

Current metrics:
- Payment creation: ~100ms avg
- Settlement creation: ~200ms avg
- Authorization check: ~30ms avg

## Security

AP2 implements enhanced security:

- **Agent verification**: KYA tier validation
- **Authorization tokens**: Time-limited, scope-restricted
- **Settlement validation**: Multi-party balance checks
- **Audit logging**: Complete payment trail
- **RLS policies**: Multi-tenant isolation

See [../../security/RLS_STRATEGY.md](../../security/RLS_STRATEGY.md) for security details.

## Common Use Cases

### Marketplace Payments

Agent purchases from marketplace with platform fee:

```typescript
{
  amount: 100.00,
  recipients: [
    { account: 'seller', amount: 85.00, role: 'seller' },
    { account: 'platform', amount: 15.00, role: 'platform_fee' }
  ]
}
```

### Subscription Payments

Agent pays subscription with multiple services:

```typescript
{
  amount: 50.00,
  recipients: [
    { account: 'service_a', amount: 30.00, role: 'subscription' },
    { account: 'service_b', amount: 20.00, role: 'subscription' }
  ],
  metadata: {
    subscriptionId: 'sub_123',
    billingPeriod: '2025-01'
  }
}
```

### Charitable Giving

Agent makes purchase with automatic donation:

```typescript
{
  amount: 100.00,
  recipients: [
    { account: 'merchant', amount: 95.00, role: 'merchant' },
    { account: 'charity', amount: 5.00, role: 'donation' }
  ],
  metadata: {
    charityId: 'charity_123',
    taxDeductible: true
  }
}
```

## Related Documentation

- [Protocol Overview](../README.md) - All protocol documentation
- [x402 Protocol](../x402/README.md) - HTTP payment protocol
- [ACP Protocol](../acp/README.md) - Agent commerce
- [Architecture](../../architecture/) - System architecture
- [Security](../../security/) - Security and RLS
- [PRD](../../prd/PayOS_PRD_Development.md) - Epic 18 (AP2 Foundation)

## Roadmap

Planned improvements:

- [ ] Scheduled settlements
- [ ] Settlement reconciliation tools
- [ ] Advanced authorization patterns
- [ ] Payment splitting rules engine
- [ ] Enhanced analytics

---

**Protocol Version:** 2.0
**Status:** Foundation Complete
**Last Updated:** December 29, 2025
**Maintained By:** PayOS Team

For questions or issues, see the main [PayOS Documentation](../../README.md).
