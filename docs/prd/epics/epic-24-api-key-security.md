# Epic 24: Enhanced API Key Security & Agent Authentication 🔐

**Status:** 📋 Planned  
**Phase:** Security Enhancement  
**Priority:** P2  
**Total Points:** 31 (was 28 + 3 from Story 27.8)  
**Stories:** 0/8 Complete  
**Duration:** 2-3 weeks  
**Absorbs:** Story 27.8 from Epic 27 (moved to unblock Epic 27 closure)

[← Back to Epic List](./README.md)

---

## Overview

Currently, API keys are user-scoped (can access all organization resources). For better security with AI agents and x402 SDK usage, we need agent-specific API keys with scoped permissions, key rotation, and improved audit trails.

This epic also includes **Partner Self-Serve Onboarding** (moved from Epic 27) since it depends on agent-specific API keys.

---

## Business Value

- **Better Security:** Agent-specific keys limit blast radius of compromised keys
- **Compliance:** Granular audit trails for agent actions
- **Developer Experience:** Clearer separation between user and agent authentication
- **Scalability:** Support high-volume agent deployments
- **Partner Onboarding:** Self-serve flow reduces manual setup from days to hours

---

## Current State vs Desired State

**Current:**
```
User signs up → Gets API key → Key can access ALL organization resources
                                     ↓
                         Used for both manual & agent access
                         No scoping, no rotation, hard to audit
```

**Desired:**
```
User signs up → Gets user API key (manual access, full permissions)
                      ↓
              Creates Agent → Agent gets own API key (auto-generated)
                                     ↓
                          Agent key scoped to:
                          - Assigned wallet only
                          - x402 payment operations
                          - Read-only for most resources
                          - Revocable independently
```

---

## Stories

### Story 24.1: Agent-Specific API Keys (5 points)

**Priority:** P1

**Goal:** Each agent gets its own API key upon creation.

**Database Changes:**
```sql
-- Add api_key to agents table
ALTER TABLE agents ADD COLUMN api_key TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN api_key_created_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN api_key_last_used_at TIMESTAMPTZ;

-- Create index for lookups
CREATE INDEX idx_agents_api_key ON agents(api_key) WHERE api_key IS NOT NULL;
```

**API Changes:**
- `POST /v1/agents` - Auto-generate `api_key` on creation
- `GET /v1/agents/:id` - Return masked API key (`ak_***...last4`)
- `POST /v1/agents/:id/rotate-key` - Generate new key, invalidate old one
- `DELETE /v1/agents/:id/revoke-key` - Revoke API key

**Acceptance Criteria:**
- [ ] Agent creation auto-generates unique API key (`ak_` prefix)
- [ ] Agent API keys stored securely (hashed)
- [ ] Rotate endpoint generates new key, returns plaintext once
- [ ] Old keys invalidated immediately on rotation
- [ ] API key last used timestamp updated on each request

---

### Story 24.2: Scoped Permissions for Agent Keys (8 points)

**Priority:** P1

**Goal:** Agent keys have limited permissions compared to user keys.

**Permission Matrix:**

| Resource | User Key | Agent Key |
|----------|----------|-----------|
| Accounts | Full CRUD | Read own only |
| Agents | Full CRUD | Read own only |
| Wallets | Full CRUD | Own wallet only |
| Transfers | Full CRUD | Create from own wallet |
| x402 Endpoints | Full CRUD | Read only |
| x402 Payments | Full CRUD | Create only |
| Settings | Full CRUD | None |

**Acceptance Criteria:**
- [ ] Permission middleware checks key type
- [ ] Agent keys rejected for unauthorized resources
- [ ] Clear error messages for permission denied
- [ ] Tests for all permission combinations

---

### Story 24.3: Authentication Endpoint for SDKs (3 points)

**Priority:** P1

**Goal:** Add `/v1/auth/me` endpoint for SDK initialization.

**Response:**
```json
{
  "type": "agent",
  "agentId": "agent_123",
  "accountId": "acc_456",
  "walletId": "wallet_789",
  "permissions": ["x402:pay", "transfers:create"],
  "limits": {
    "dailyRemaining": 950.00,
    "monthlyRemaining": 4500.00
  }
}
```

**Acceptance Criteria:**
- [ ] Endpoint returns key type and associated resources
- [ ] Includes spending limits for agents
- [ ] Response cached by SDK to avoid repeated calls

---

### Story 24.4: API Key Rotation Flow (5 points)

**Priority:** P1

**Goal:** Safe key rotation with grace period.

**Acceptance Criteria:**
- [ ] New key generated, old key has 24h grace period
- [ ] Both keys work during grace period
- [ ] Old key auto-expires after grace period
- [ ] Webhook notification for key rotation
- [ ] Dashboard shows rotation history

---

### Story 24.5: Key Usage Audit Trail (3 points)

**Priority:** P2

**Goal:** Track all API key usage for compliance.

**Acceptance Criteria:**
- [ ] Log all requests with key ID
- [ ] Track IP address, user agent, endpoint
- [ ] Dashboard shows usage by key
- [ ] Export audit logs

---

### Story 24.6: Update SDKs for Agent Keys (3 points)

**Priority:** P2

**Goal:** Update Provider and Consumer SDKs to use new authentication.

**Acceptance Criteria:**
- [ ] SDKs detect key type automatically
- [ ] Agent keys auto-resolve wallet ID
- [ ] Both SDKs call `/v1/auth/me` on initialization

---

### Story 24.7: Security Best Practices Documentation (1 point)

**Priority:** P2

**Goal:** Document key security best practices.

**Acceptance Criteria:**
- [ ] Key rotation guide
- [ ] Scope recommendations
- [ ] Incident response playbook

---

### Story 24.8: Partner Self-Serve Onboarding Flow (3 points)

**Priority:** P1  
**Origin:** Moved from Epic 27, Story 27.8

**Goal:** Enable partners to onboard themselves through a guided self-serve flow.

**Acceptance Criteria:**
- [ ] Multi-step onboarding wizard in dashboard
- [ ] KYB document collection and verification
- [ ] API key generation with test/live environments
- [ ] Webhook endpoint configuration and testing
- [ ] Settlement account setup (Circle, bank accounts)
- [ ] Compliance checks and approval workflow
- [ ] Onboarding progress tracking
- [ ] "Go live" checklist with validation

**Onboarding Steps:**
1. Business information & KYB
2. Technical setup (API keys, webhooks)
3. Settlement configuration (rails, currencies)
4. Compliance verification
5. Test transaction validation
6. Production approval

**Why It's Here:**
This story was moved from Epic 27 because it depends on agent-specific API keys (Story 24.1). Having it in Epic 24 keeps the dependency chain clean and allows Epic 27 to be marked complete.

---

## Story Summary

| Story | Points | Priority | Status | Origin |
|-------|--------|----------|--------|--------|
| 24.1 Agent-Specific API Keys | 5 | P1 | Pending | Original |
| 24.2 Scoped Permissions | 8 | P1 | Pending | Original |
| 24.3 Authentication Endpoint | 3 | P1 | Pending | Original |
| 24.4 API Key Rotation Flow | 5 | P1 | Pending | Original |
| 24.5 Key Usage Audit Trail | 3 | P2 | Pending | Original |
| 24.6 Update SDKs | 3 | P2 | Pending | Original |
| 24.7 Security Documentation | 1 | P2 | Pending | Original |
| 24.8 Partner Self-Serve Onboarding | 3 | P1 | Pending | **Epic 27** |
| **Total** | **31** | | **0/8 Complete** | |

---

## Implementation Priority

**Phase 1: Core Key Infrastructure**
1. Story 24.1: Agent-Specific API Keys
2. Story 24.2: Scoped Permissions
3. Story 24.3: Authentication Endpoint

**Phase 2: Rotation & Audit**
4. Story 24.4: API Key Rotation Flow
5. Story 24.5: Key Usage Audit Trail

**Phase 3: SDK & Docs**
6. Story 24.6: Update SDKs
7. Story 24.7: Security Documentation

**Phase 4: Partner Onboarding**
8. Story 24.8: Partner Self-Serve Onboarding (depends on Phase 1)

---

## Security Benefits

| Before | After |
|--------|-------|
| One key per user | One key per agent |
| Full permissions always | Scoped permissions |
| No rotation mechanism | Graceful rotation with grace period |
| Hard to audit agent actions | Complete audit trail |
| Compromised key = full access | Compromised key = limited blast radius |

---

## Related Documentation

- **Sample Apps PRD:** `/docs/SAMPLE_APPS_PRD.md`
- **x402 SDK Guide:** `/docs/X402_SDK_GUIDE.md`
- **Epic 17:** Multi-Protocol Gateway Infrastructure (completed)
- **Epic 27:** Settlement Infrastructure (completed, 27.8 moved here)
