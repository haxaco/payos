# Epic 49: Protocol Discovery & Management

**Status:** COMPLETE ✅
**Phase:** 4.0 (Platform Architecture)
**Priority:** P0 — Protocol Registry Foundation
**Estimated Points:** 18
**Stories:** 4
**Dependencies:** Epic 48 (Connected Accounts)
**Created:** January 20, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Create a protocol discovery and management API that enables tenants to discover available protocols (x402, AP2, ACP, UCP) and enable/disable them per their requirements. Each protocol has prerequisites that must be met before enablement.

**Why This Matters:**
- Unified view of all protocol capabilities
- Clear prerequisite tracking for each protocol
- Foundation for unified onboarding experience
- Self-service protocol management

**Goal:** Tenants can discover, understand, and enable protocols through a unified API.

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/protocols` | ⚠️ Types | Types only | P0 | Protocol metadata |
| `GET /v1/protocols/:id` | ⚠️ Types | Types only | P0 | Protocol details |
| `GET /v1/organization/protocol-status` | ❌ No | - | P0 | Dashboard only |
| `POST /v1/organization/protocols/:id/enable` | ❌ No | - | P1 | Dashboard only |

**SDK Stories Required:**
- [ ] Add `Protocol` and `ProtocolStatus` types to @payos/types

---

## Protocol Registry

### Available Protocols

| Protocol | Description | Prerequisites |
|----------|-------------|---------------|
| **x402** | Micropayments for API access | USDC wallet |
| **AP2** | Mandate-based recurring payments | USDC wallet |
| **ACP** | Agent commerce (Stripe/OpenAI compatible) | Payment handler connected |
| **UCP** | Universal commerce protocol | Payment handler OR PayOS-native |

### Protocol Metadata Structure

```typescript
interface Protocol {
  id: string;              // 'x402', 'ap2', 'acp', 'ucp'
  name: string;            // Human-readable name
  description: string;     // What it does
  version: string;         // Current version
  status: 'stable' | 'beta' | 'experimental';

  // What's needed to enable this protocol
  prerequisites: {
    wallet?: boolean;            // Needs USDC wallet
    paymentHandler?: boolean;    // Needs connected handler
    kyaLevel?: number;           // Min KYA tier required
    features?: string[];         // Other feature flags
  };

  // What this protocol provides
  capabilities: string[];        // e.g., 'micropayments', 'mandates', 'checkout'

  // Documentation links
  docs: {
    overview: string;
    quickstart: string;
    api: string;
  };
}
```

---

## Stories

### Story 49.1: Protocol Registry Service

**Points:** 5
**Priority:** P0
**Dependencies:** None

**Description:**
Create the protocol registry service that defines all available protocols with their metadata, prerequisites, and capabilities.

**Acceptance Criteria:**
- [ ] All 4 protocols defined (x402, AP2, ACP, UCP)
- [ ] Protocol metadata includes version, status, prerequisites
- [ ] Capability list for each protocol
- [ ] Documentation links configured
- [ ] Protocol dependencies tracked (e.g., UCP can use x402 for micropayments)
- [ ] Unit tests for registry

**Protocol Definitions:**
```typescript
const protocols = {
  x402: {
    id: 'x402',
    name: 'x402 Micropayments',
    description: 'HTTP 402 Payment Required protocol for API monetization',
    version: '2024-12-01',
    status: 'stable',
    prerequisites: { wallet: true },
    capabilities: ['micropayments', 'pay-per-call', 'metering'],
    docs: { /* ... */ }
  },
  ap2: {
    id: 'ap2',
    name: 'AP2 Agent Payments',
    description: 'Mandate-based payments for autonomous agents',
    version: '2024-11-01',
    status: 'stable',
    prerequisites: { wallet: true },
    capabilities: ['mandates', 'recurring', 'agent-payments'],
    docs: { /* ... */ }
  },
  acp: {
    id: 'acp',
    name: 'Agent Commerce Protocol',
    description: 'E-commerce checkout for AI agents (Stripe/OpenAI compatible)',
    version: '2024-10-01',
    status: 'stable',
    prerequisites: { paymentHandler: true },
    capabilities: ['checkout', 'cart', 'orders'],
    docs: { /* ... */ }
  },
  ucp: {
    id: 'ucp',
    name: 'Universal Commerce Protocol',
    description: 'Google+Shopify standard for agentic commerce',
    version: '2026-01-11',
    status: 'stable',
    prerequisites: { paymentHandler: true },
    capabilities: ['checkout', 'orders', 'identity', 'discovery'],
    docs: { /* ... */ }
  }
};
```

**Files to Create:**
- `apps/api/src/services/protocol-registry/index.ts`
- `apps/api/src/services/protocol-registry/protocols.ts`
- `apps/api/src/services/protocol-registry/types.ts`

---

### Story 49.2: Protocol Discovery API

**Points:** 5
**Priority:** P0
**Dependencies:** 49.1

**Description:**
Implement public API endpoints for discovering available protocols and their requirements.

**Acceptance Criteria:**
- [ ] `GET /v1/protocols` - List all available protocols
- [ ] `GET /v1/protocols/:id` - Get single protocol details
- [ ] Include prerequisites in response
- [ ] Include documentation links
- [ ] Publicly accessible (no auth required for discovery)
- [ ] Caching headers for performance

**API Response (GET /v1/protocols):**
```json
{
  "data": [
    {
      "id": "x402",
      "name": "x402 Micropayments",
      "description": "HTTP 402 Payment Required protocol...",
      "version": "2024-12-01",
      "status": "stable",
      "prerequisites": {
        "wallet": true
      },
      "capabilities": ["micropayments", "pay-per-call", "metering"],
      "docs": {
        "overview": "https://docs.payos.com/protocols/x402",
        "quickstart": "https://docs.payos.com/protocols/x402/quickstart"
      }
    }
  ]
}
```

**Files to Create:**
- `apps/api/src/routes/protocols.ts`

---

### Story 49.3: Protocol Enablement API

**Points:** 5
**Priority:** P1
**Dependencies:** 49.2, Epic 48 (Connected Accounts)

**Description:**
Implement API for enabling/disabling protocols per tenant with prerequisite validation.

**Acceptance Criteria:**
- [ ] `GET /v1/organization/protocol-status` - Get current enablement status
- [ ] `POST /v1/organization/protocols/:id/enable` - Enable a protocol
- [ ] `POST /v1/organization/protocols/:id/disable` - Disable a protocol
- [ ] Prerequisite validation before enabling
- [ ] Clear error messages for unmet prerequisites
- [ ] Audit logging for enable/disable actions
- [ ] `enabled_protocols` stored in tenant settings

**Protocol Status Response:**
```json
{
  "protocols": {
    "x402": {
      "enabled": true,
      "enabled_at": "2026-01-15T10:00:00Z",
      "prerequisites_met": true
    },
    "ap2": {
      "enabled": false,
      "prerequisites_met": true,
      "missing_prerequisites": []
    },
    "acp": {
      "enabled": false,
      "prerequisites_met": false,
      "missing_prerequisites": ["payment_handler"]
    },
    "ucp": {
      "enabled": true,
      "enabled_at": "2026-01-19T14:00:00Z",
      "prerequisites_met": true
    }
  }
}
```

**Enable Error Response:**
```json
{
  "error": "prerequisites_not_met",
  "details": {
    "protocol": "acp",
    "missing": ["payment_handler"],
    "message": "Connect a payment handler (Stripe or PayPal) to enable ACP"
  }
}
```

**Files to Create:**
- `apps/api/src/routes/organization/protocols.ts`
- `apps/api/src/services/protocol-enablement/index.ts`

---

### Story 49.4: Protocol Status Dashboard Widget

**Points:** 3
**Priority:** P1
**Dependencies:** 49.3

**Description:**
Add a dashboard widget showing enabled protocol status with quick enable/disable toggles.

**Acceptance Criteria:**
- [ ] Show all 4 protocols with status
- [ ] Green/gray indicators for enabled/disabled
- [ ] Quick toggle to enable/disable
- [ ] Prerequisite warnings shown inline
- [ ] Link to protocol documentation
- [ ] Refresh on status change

**Widget Location:** Dashboard Overview or Settings page

**Files to Create:**
- `apps/web/src/components/dashboard/protocol-status-widget.tsx`

**Files to Modify:**
- `apps/web/src/app/dashboard/page.tsx` (add widget)

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| 49.1 | 5 | P0 | Protocol registry service | None |
| 49.2 | 5 | P0 | Discovery API | 49.1 |
| 49.3 | 5 | P1 | Enablement API | 49.2, Epic 48 |
| 49.4 | 3 | P1 | Dashboard widget | 49.3 |
| **TOTAL** | **18** | | **4 stories** | |

---

## Verification Plan

| Checkpoint | Verification |
|------------|--------------|
| Registry | All 4 protocols defined with metadata |
| Discovery | `GET /v1/protocols` returns all protocols |
| Enablement | Can enable protocol when prerequisites met |
| Validation | Cannot enable without prerequisites |
| UI | Widget shows protocol status correctly |

---

## Dependencies

**Requires:**
- Epic 48: Connected Accounts (for `paymentHandler` prerequisite check)

**Enables:**
- Epic 51: Unified Onboarding (uses protocol status for onboarding flows)
- Epic 52: Dashboard Redesign (protocol-based metrics)

---

## Related Documentation

- [Three-Layer Architecture](../../architecture/three-layer-architecture.md)
- [Epic 48: Connected Accounts](./epic-48-connected-accounts.md)
- [Epic 51: Unified Onboarding](./epic-51-unified-onboarding.md)

---

*Created: January 20, 2026*
*Status: Planning*
