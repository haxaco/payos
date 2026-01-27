# PayOS Protocol Documentation

This directory contains documentation for the payment protocols supported by PayOS. Each protocol has its own subdirectory with implementation guides, testing procedures, and status reports.

## Supported Protocols

PayOS implements three modern payment protocols for AI-native commerce:

### x402 Protocol - HTTP Payment Protocol

The x402 protocol enables machine-to-machine micropayments over HTTP. It's designed for AI agents and automated systems to pay for API access and services in real-time.

**Directory:** [x402/](x402/)

**Key Features:**
- HTTP 402 Payment Required status code
- Real-time micropayments for API access
- Wallet-based payment flow
- Provider settlement system
- Agent authentication and authorization

**Status:** Production-ready, fully tested

### AP2 Protocol - Agentic Payment Protocol v2

AP2 is the second-generation protocol for AI agent payments, supporting complex payment workflows, multi-party settlements, and advanced authorization patterns.

**Directory:** [ap2/](ap2/)

**Key Features:**
- Advanced agent payment capabilities
- Multi-party settlement support
- Complex authorization patterns
- Enhanced security and verification
- Protocol metadata and extensibility

**Status:** Foundation complete, UI integration complete

### ACP Protocol - Agent Commerce Protocol

ACP provides a high-level commerce layer for AI agents, supporting shopping carts, order management, and merchant integrations.

**Directory:** [acp/](acp/)

**Key Features:**
- Agent shopping cart management
- Order lifecycle management
- Merchant integration framework
- Commerce analytics
- Agent purchasing behavior tracking

**Status:** Foundation complete, UI integration complete

## Protocol Documentation by Type

### Implementation Guides

| Protocol | Implementation Guide |
|----------|---------------------|
| x402 | [x402/X402_SDK_GUIDE.md](x402/X402_SDK_GUIDE.md) |
| x402 | [x402/X402_MANUAL_TESTING_GUIDE.md](x402/X402_MANUAL_TESTING_GUIDE.md) |
| AP2 | [ap2/AP2_FOUNDATION_COMPLETE.md](ap2/AP2_FOUNDATION_COMPLETE.md) |
| ACP | [acp/ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md](acp/ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md) |

### Testing Documentation

| Protocol | Testing Guide |
|----------|--------------|
| x402 | [x402/X402_GEMINI_TESTING_GUIDE.md](x402/X402_GEMINI_TESTING_GUIDE.md) |
| x402 | [x402/X402_TESTING_SCENARIOS.md](x402/X402_TESTING_SCENARIOS.md) |
| x402 | [x402/X402_WALLET_TESTING_GUIDE.md](x402/X402_WALLET_TESTING_GUIDE.md) |

### Status Reports

| Protocol | Latest Status |
|----------|--------------|
| x402 | [x402/X402_MIGRATION_VERIFIED.md](x402/X402_MIGRATION_VERIFIED.md) |
| x402 | [x402/X402_DEPLOYMENT_STATUS.md](x402/X402_DEPLOYMENT_STATUS.md) |
| AP2 | [ap2/AP2_UI_INTEGRATION_STATUS.md](ap2/AP2_UI_INTEGRATION_STATUS.md) |
| ACP | [acp/ACP_UI_INTEGRATION_STATUS.md](acp/ACP_UI_INTEGRATION_STATUS.md) |

### Performance Documentation

| Protocol | Performance Guide |
|----------|------------------|
| x402 | [x402/X402_PERFORMANCE_ANALYSIS.md](x402/X402_PERFORMANCE_ANALYSIS.md) |
| x402 | [x402/X402_PERFORMANCE_OPTIMIZATION_PLAN.md](x402/X402_PERFORMANCE_OPTIMIZATION_PLAN.md) |
| x402 | [x402/X402_ASYNC_OPTIMIZATION_ANALYSIS.md](x402/X402_ASYNC_OPTIMIZATION_ANALYSIS.md) |

## Quick Start by Protocol

### Getting Started with x402

1. Read [x402/README.md](x402/README.md) for overview
2. Follow [x402/X402_SDK_GUIDE.md](x402/X402_SDK_GUIDE.md) for SDK integration
3. Test with [x402/X402_MANUAL_TESTING_GUIDE.md](x402/X402_MANUAL_TESTING_GUIDE.md)
4. Review [x402/X402_DEPLOYMENT_STATUS.md](x402/X402_DEPLOYMENT_STATUS.md) for production readiness

### Getting Started with AP2

1. Read [ap2/README.md](ap2/README.md) for overview
2. Review [ap2/AP2_FOUNDATION_COMPLETE.md](ap2/AP2_FOUNDATION_COMPLETE.md) for implementation
3. Check [ap2/AP2_UI_INTEGRATION_STATUS.md](ap2/AP2_UI_INTEGRATION_STATUS.md) for UI features

### Getting Started with ACP

1. Read [acp/README.md](acp/README.md) for overview
2. Review [acp/ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md](acp/ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md)
3. Check [acp/ACP_UI_INTEGRATION_STATUS.md](acp/ACP_UI_INTEGRATION_STATUS.md) for UI features

## Protocol Comparison

| Feature | x402 | AP2 | ACP |
|---------|------|-----|-----|
| **Purpose** | HTTP micropayments | Advanced agent payments | Agent commerce |
| **Complexity** | Low | Medium | High |
| **Use Case** | API access fees | Multi-party settlements | Shopping & orders |
| **Agent Support** | Basic | Advanced | Full commerce |
| **Status** | Production | Foundation complete | Foundation complete |

## Architecture Integration

All protocols integrate with PayOS core features:

- **Authentication**: API keys, JWT sessions, agent tokens
- **Multi-tenancy**: Row-Level Security (RLS) isolation
- **Wallets**: Shared wallet infrastructure
- **Compliance**: KYC/KYB/KYA verification tiers
- **Analytics**: Unified reporting and dashboards

See [../architecture/](../architecture/) for system architecture details.

## API Endpoints by Protocol

### x402 Endpoints

```
POST   /v1/x402/payments          # Create payment
GET    /v1/x402/payments/:id      # Get payment status
POST   /v1/x402/endpoints         # Register endpoint
GET    /v1/x402/endpoints         # List endpoints
GET    /v1/x402/analytics         # Analytics data
```

### AP2 Endpoints

```
POST   /v1/ap2/payments           # Create AP2 payment
GET    /v1/ap2/payments/:id       # Get payment status
POST   /v1/ap2/settlements        # Create settlement
GET    /v1/ap2/settlements        # List settlements
```

### ACP Endpoints

```
POST   /v1/acp/carts              # Create cart
PUT    /v1/acp/carts/:id          # Update cart
POST   /v1/acp/orders             # Create order
GET    /v1/acp/orders/:id         # Get order
GET    /v1/acp/merchants          # List merchants
```

## SDK Support

### Client SDKs

- **x402 Client SDK**: `@sly/x402-client-sdk` - For service consumers
- **x402 Provider SDK**: `@sly/x402-provider-sdk` - For service providers
- **PayOS API Client**: `@sly/api-client` - General API access

### Example Code

```typescript
// x402 Consumer
import { X402Client } from '@sly/x402-client-sdk';

const client = new X402Client({
  apiKey: 'pk_test_...',
  walletId: 'wallet_...'
});

const response = await client.get('https://api.example.com/data');

// x402 Provider
import { X402Provider } from '@sly/x402-provider-sdk';

const provider = new X402Provider({
  apiKey: 'pk_test_...',
  settlementAccount: 'acct_...'
});

app.use('/api', provider.middleware());
```

See individual protocol READMEs for detailed SDK documentation.

## Testing

Each protocol has comprehensive testing documentation:

- **Unit tests**: Test individual components
- **Integration tests**: Test full payment flows
- **Manual testing**: UI and end-to-end scenarios
- **Performance testing**: Load and stress testing

See [../guides/testing/](../guides/testing/) for testing guides.

## Related Documentation

- [Architecture Documentation](../architecture/) - System design
- [Security Documentation](../security/) - RLS and security testing
- [Deployment Documentation](../deployment/) - Production deployment
- [Developer Guides](../guides/) - Development workflows
- [PRD](../prd/) - Product requirements (Epics 17-20 for protocols)

## Contributing

When adding protocol documentation:

1. Create subdirectory: `protocols/protocol-name/`
2. Add README.md to subdirectory
3. Include implementation, testing, and status docs
4. Update this file with protocol overview
5. Add cross-references to related documentation

---

**Last Updated:** December 29, 2025
**Maintained By:** PayOS Team

For the main documentation index, see [/docs/README.md](../README.md)
