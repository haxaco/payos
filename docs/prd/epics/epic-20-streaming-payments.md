# Epic 20: Streaming Payments & Agent Registry 🌊

**Status:** Pending
**Phase:** D (Weeks 13-16)
**Priority:** P2
**Total Points:** 28 (was 18, +10 for agent identity)
**Stories:** 0/7 Complete

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Build streaming payment infrastructure and agent discovery registry for the emerging agent economy. Enable continuous payment flows, agent-to-agent discovery, and emerging agent identity standards.

**Business Value:**
- Enable real-time per-second payment flows
- Support emerging agent-to-agent economy
- Differentiate from batch-only competitors
- Create network effects through agent registry
- Position for emerging agent identity standards (ERC-8004, DIDs)

---

## Stories

### Story 20.1: Streaming Payments API (5 pts, P1)

Build continuous payment stream infrastructure.

**Features:**
- Per-second payment flows
- Stream creation and management
- Flow rate adjustments
- Stream pause/resume
- Balance monitoring and auto-pause
- Stream termination

**Endpoints:**
```
POST /v1/streams - Create payment stream
GET /v1/streams - List active streams
GET /v1/streams/:id - Get stream details
PATCH /v1/streams/:id - Update flow rate
POST /v1/streams/:id/pause - Pause stream
POST /v1/streams/:id/resume - Resume stream
DELETE /v1/streams/:id - Terminate stream
```

**Database Schema:**
```sql
CREATE TABLE payment_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID NOT NULL REFERENCES accounts(id),
  flow_rate_per_second DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  total_streamed DECIMAL(20,8) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Story 20.2: Streaming Dashboard UI (3 pts, P1)

Dashboard interface for managing payment streams.

**Features:**
- Active streams list with real-time flow rates
- Stream creation wizard
- Visual flow rate adjuster
- Stream history and analytics
- Pause/resume controls
- Balance monitoring

**Pages:**
- `/dashboard/streams` - Active streams overview
- `/dashboard/streams/new` - Create stream wizard
- `/dashboard/streams/:id` - Stream detail page

---

### Story 20.3: Agent Registry API (5 pts, P2)

Public registry for agent discovery and capability advertising.

**Features:**
- Agent profile management
- Capability advertising
- Search and discovery
- Reputation system
- Integration directory
- Public API endpoints

**Endpoints:**
```
POST /v1/registry/agents - Register agent
GET /v1/registry/agents - Search agents
GET /v1/registry/agents/:id - Get agent profile
PATCH /v1/registry/agents/:id - Update profile
GET /v1/registry/capabilities - Browse by capability
```

**Database Schema:**
```sql
CREATE TABLE agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  public_name TEXT NOT NULL,
  description TEXT,
  capabilities JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  website_url TEXT,
  documentation_url TEXT,
  x402_endpoint_url TEXT,
  is_public BOOLEAN DEFAULT true,
  reputation_score DECIMAL(3,2),
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registry_capabilities ON agent_registry USING GIN(capabilities);
CREATE INDEX idx_registry_tags ON agent_registry USING GIN(tags);
```

---

### Story 20.4: Agent Discovery Dashboard (3 pts, P2)

Public-facing agent discovery interface.

**Features:**
- Search agents by capability
- Filter by tags and categories
- Agent profile pages
- Integration examples
- Reputation display
- Contact/integration buttons

**Pages:**
- `/discover` - Agent search interface
- `/discover/agents/:id` - Agent profile page
- `/discover/capabilities` - Browse by capability

---

### Story 20.5: Python SDK (2 pts, P2)

Python SDK for PayOS API integration.

**Features:**
- Full API coverage
- Streaming support
- Type hints
- Async/await support
- Comprehensive examples
- PyPI package

**Installation:**
```bash
pip install payos
```

**Usage:**
```python
from payos import PayOS

client = PayOS(api_key="pk_test_...")

# Create stream
stream = await client.streams.create(
    from_account_id="acc_123",
    to_account_id="acc_456",
    flow_rate_per_second="0.01",
    currency="USD"
)

# List active streams
streams = await client.streams.list(status="active")

# Adjust flow rate
await client.streams.update(stream.id, flow_rate_per_second="0.02")
```

---

### Story 20.6: Agent Identity Standards Integration (5 pts, P2) ⭐ NEW

**Priority:** P2  
**Points:** 5  
**Dependencies:** Story 20.3 (Agent Registry API)

#### Background

Emerging standards for AI agent identity are developing:
- **ERC-8004** — Proposed Ethereum standard for AI agent identity/reputation
- **DIDs (Decentralized Identifiers)** — W3C standard for self-sovereign identity
- **Agent Protocol** — Agent-to-agent communication standards

These enable cross-platform agent verification and reputation portability.

#### Description

Integrate with emerging agent identity standards to enable:
1. Cross-platform agent verification
2. Portable reputation scores
3. Capability attestations
4. Interoperability with other agent registries

#### Features

**1. Agent DID Support:**
```typescript
interface AgentIdentity {
  payos_id: string;           // Internal PayOS ID
  did?: string;               // Decentralized Identifier (e.g., did:ethr:0x...)
  erc8004_id?: string;        // ERC-8004 on-chain identity (when standard finalizes)
  verification_status: 'unverified' | 'self_attested' | 'third_party_verified';
}
```

**2. Reputation Portability:**
- Import reputation from external sources
- Export PayOS reputation to other platforms
- Aggregate cross-platform scores

**3. Capability Attestations:**
```json
{
  "capabilities": [
    {
      "name": "payment_processing",
      "attested_by": "payos",
      "attestation_date": "2025-12-28",
      "evidence_url": "https://api.payos.ai/attestations/..."
    }
  ]
}
```

#### API Endpoints

```
POST /v1/registry/agents/:id/identity - Link external identity
GET /v1/registry/agents/:id/identity - Get identity details
POST /v1/registry/agents/:id/attestations - Create capability attestation
GET /v1/registry/agents/:id/attestations - List attestations
POST /v1/registry/agents/:id/reputation/import - Import external reputation
GET /v1/registry/agents/:id/reputation/export - Export reputation proof
```

#### Database Schema Extension

```sql
-- Extend agent_registry with identity fields
ALTER TABLE agent_registry ADD COLUMN did TEXT;
ALTER TABLE agent_registry ADD COLUMN erc8004_id TEXT;
ALTER TABLE agent_registry ADD COLUMN identity_verification_status TEXT DEFAULT 'unverified';
ALTER TABLE agent_registry ADD COLUMN external_reputation_sources JSONB DEFAULT '[]';

-- Capability attestations
CREATE TABLE agent_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_registry_id UUID NOT NULL REFERENCES agent_registry(id),
  capability TEXT NOT NULL,
  attested_by TEXT NOT NULL,  -- 'payos', 'self', or external attester
  attestation_proof TEXT,      -- Signature or reference
  evidence_url TEXT,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attestations_agent ON agent_attestations(agent_registry_id);
CREATE INDEX idx_attestations_capability ON agent_attestations(capability);
```

#### Acceptance Criteria

- [ ] Agents can link DID to PayOS profile
- [ ] Agents can import reputation from external sources
- [ ] PayOS can export reputation proofs
- [ ] Capability attestations can be created and verified
- [ ] API validates DID format
- [ ] Backward compatible with existing agent registry

#### Implementation Notes

**Phase 1 (Now):**
- Add DID field to agent registry
- Basic attestation storage
- Export reputation as signed JSON

**Phase 2 (When ERC-8004 finalizes):**
- On-chain identity linking
- Cross-chain reputation queries
- Decentralized attestation verification

#### References

- [ERC-8004 Draft](https://eips.ethereum.org/EIPS/eip-8004) (if/when published)
- [W3C DIDs](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)

---

### Story 20.7: Cross-Platform Reputation System (5 pts, P2) ⭐ NEW

**Priority:** P2  
**Points:** 5  
**Dependencies:** Story 20.3 (Agent Registry API), Story 20.6 (Identity Standards)

#### Description

Build a reputation system that:
1. Tracks agent behavior within PayOS
2. Aggregates reputation from external sources
3. Provides reputation scores to other platforms
4. Enables trust-based agent-to-agent interactions

#### Reputation Components

**1. Internal Reputation (PayOS-native):**
```typescript
interface InternalReputation {
  transaction_count: number;
  transaction_volume: number;
  success_rate: number;           // % of successful transactions
  dispute_rate: number;           // % of disputed transactions
  average_settlement_time: number; // seconds
  account_age_days: number;
  kya_tier: number;               // KYA verification level
}
```

**2. External Reputation (Imported):**
```typescript
interface ExternalReputation {
  source: string;                 // e.g., 'x402_scan', 'agent_protocol'
  score: number;
  last_updated: string;
  verification_method: 'api' | 'attestation' | 'self_reported';
}
```

**3. Composite Score:**
- Weighted average of internal and external scores
- Configurable weights per use case
- Transparency on score components

#### API Endpoints

```
GET /v1/registry/agents/:id/reputation - Get composite reputation
GET /v1/registry/agents/:id/reputation/breakdown - Detailed breakdown
POST /v1/registry/agents/:id/reputation/refresh - Refresh external sources
GET /v1/registry/agents/:id/reputation/history - Historical scores
```

#### Use Cases

**1. Trust-Based Spending Limits:**
```typescript
// Higher reputation = higher auto-approve limits
const spendingLimit = calculateLimit(agent.reputation_score);
```

**2. Facilitator Selection:**
```typescript
// Resources can filter by agent reputation
if (payer.reputation_score < 0.7) {
  return { error: 'REPUTATION_TOO_LOW' };
}
```

**3. Agent Discovery Ranking:**
```typescript
// Registry search ranks by reputation
const agents = await registry.search({
  capability: 'payment_processing',
  min_reputation: 0.8,
  sort: 'reputation_desc'
});
```

#### Acceptance Criteria

- [ ] Internal reputation calculated from PayOS transaction history
- [ ] External reputation importable from configured sources
- [ ] Composite score algorithm documented and configurable
- [ ] Reputation history tracked over time
- [ ] API returns score breakdown
- [ ] Reputation refreshable on demand

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 20.1 Streaming Payments API | 5 | P1 | Pending |
| 20.2 Streaming Dashboard UI | 3 | P1 | Pending |
| 20.3 Agent Registry API | 5 | P2 | Pending |
| 20.4 Agent Discovery Dashboard | 3 | P2 | Pending |
| 20.5 Python SDK | 2 | P2 | Pending |
| 20.6 Agent Identity Standards | 5 | P2 | ⭐ NEW |
| 20.7 Cross-Platform Reputation | 5 | P2 | ⭐ NEW |
| **Total** | **28** | | **0/7 Complete** |

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/streams.ts`
- `apps/api/src/routes/agent-registry.ts`
- `apps/api/src/routes/agent-identity.ts` ⭐ NEW
- `apps/api/src/routes/agent-reputation.ts` ⭐ NEW

### Background Workers
- `apps/api/src/workers/stream-processor.ts` - Process active streams every second
- `apps/api/src/workers/reputation-aggregator.ts` ⭐ NEW - Refresh external reputations
- Settlement and balance updates

### Database Migrations
- `20XX_create_payment_streams.sql`
- `20XX_create_agent_registry.sql`
- `20XX_add_agent_identity_fields.sql` ⭐ NEW
- `20XX_create_agent_attestations.sql` ⭐ NEW

### SDKs
- `packages/python-sdk/` - Python SDK package

### UI Components
- `apps/web/src/app/dashboard/streams/`
- `apps/web/src/app/discover/`

---

## Success Criteria

**Streaming Payments:**
- ✅ Support 100+ concurrent active streams
- ✅ Sub-second settlement latency
- ✅ Automatic pause on insufficient balance
- ✅ 99.9%+ uptime for stream processor

**Agent Registry:**
- ✅ 50+ registered agents within 6 months
- ✅ Public discovery interface live
- ✅ Integration examples for top 10 capabilities
- ✅ Reputation system working

**Agent Identity (NEW):**
- ✅ DID linking functional
- ✅ Attestation creation and verification working
- ✅ Reputation export produces verifiable proofs
- ✅ Ready to integrate ERC-8004 when standard finalizes

**Python SDK:**
- ✅ Published to PyPI
- ✅ Comprehensive documentation
- ✅ 5+ code examples
- ✅ Type hints for all methods

---

## Related Documentation

- **Streaming Payments Spec:** To be created
- **Agent Registry Spec:** To be created
- **Agent Identity Standards:** [W3C DIDs](https://www.w3.org/TR/did-core/)
- **Python SDK Guide:** To be created
- **Epic 2:** Account System (prerequisite)
- **Epic 3:** Transfers (prerequisite)
- **Research:** [Obsidian - Agentic Workflow Protocol](../investigations/ground-station-narrative.md)
