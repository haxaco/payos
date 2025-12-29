# Epic 20: Streaming Payments & Agent Registry 🌊

**Status:** Pending
**Phase:** D (Weeks 13-16)
**Priority:** P2
**Total Points:** 18
**Stories:** 0/5 Complete

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Build streaming payment infrastructure and agent discovery registry for the emerging agent economy. Enable continuous payment flows and agent-to-agent discovery.

**Business Value:**
- Enable real-time per-second payment flows
- Support emerging agent-to-agent economy
- Differentiate from batch-only competitors
- Create network effects through agent registry

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

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 20.1 Streaming Payments API | 5 | P1 | Pending |
| 20.2 Streaming Dashboard UI | 3 | P1 | Pending |
| 20.3 Agent Registry API | 5 | P2 | Pending |
| 20.4 Agent Discovery Dashboard | 3 | P2 | Pending |
| 20.5 Python SDK | 2 | P2 | Pending |
| **Total** | **18** | | **0/5 Complete** |

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/streams.ts`
- `apps/api/src/routes/agent-registry.ts`

### Background Workers
- `apps/api/src/workers/stream-processor.ts` - Process active streams every second
- Settlement and balance updates

### Database Migrations
- `20XX_create_payment_streams.sql`
- `20XX_create_agent_registry.sql`

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

**Python SDK:**
- ✅ Published to PyPI
- ✅ Comprehensive documentation
- ✅ 5+ code examples
- ✅ Type hints for all methods

---

## Related Documentation

- **Streaming Payments Spec:** To be created
- **Agent Registry Spec:** To be created
- **Python SDK Guide:** To be created
- **Epic 2:** Account System (prerequisite)
- **Epic 3:** Transfers (prerequisite)
