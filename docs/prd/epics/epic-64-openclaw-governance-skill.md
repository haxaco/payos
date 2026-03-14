# Epic 64: OpenClaw Governance Skill

**Status:** Pending
**Phase:** 5.4 (Ecosystem Distribution)
**Priority:** P1 — Distribution Into Moltbook Ecosystem
**Estimated Points:** 10
**Stories:** 4 (0 complete)
**Dependencies:** Epic 18 (Agent Wallets ✅), Epic 62 (Escrow Orchestration), Epic 63 (Reputation Bridge)
**Created:** March 1, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

OpenClaw's ecosystem (140K+ GitHub stars, 1.5M+ agents on Moltbook) uses a "skill" system for agent capabilities — Python packages published to ClawHub that agents install. This epic creates and publishes a **sly-governance** skill that OpenClaw agents install to route contracting actions through Sly's governance layer.

This is primarily a distribution and packaging concern — the governance logic already exists in Epics 18, 62, and 63. But it's the critical bridge between "Sly can govern contracts" and "Moltbook agents actually use Sly."

**What the Skill Intercepts:**
1. **Contract Discovery** — when agent browses m/hire or ClaWork, filters opportunities against wallet policy
2. **Contract Negotiation** — validates proposed terms against negotiation guardrails (Epic 18.9) before agent commits
3. **Escrow Management** — routes escrow calls through Sly's governance API (Epic 62) instead of direct AgentEscrowProtocol calls
4. **Reputation Reporting** — after completion, reports outcomes to Sly audit trail and optionally submits ERC-8004 feedback

**Key Design Decision — Thin Client, Not Logic Duplication:**
The skill is a thin Python API client that calls Sly's REST endpoints. All governance logic lives server-side. The skill adds <200ms latency per governance check (policy engine is <50ms + network round-trip).

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| ClawHub skill package | ❌ No | - | - | Python package, not TypeScript SDK |
| Sly Python API client | ✅ New | `sly-python` | P1 | Python client for governance APIs |
| Demo agent | ❌ No | - | - | Example only |

---

## Architecture

### Skill Integration Points

```
OpenClaw Agent on Moltbook
    │
    ├── browses m/hire for jobs ──────────► Sly Skill: filter by wallet policy
    │                                        POST /v1/agents/:id/wallet/policy/evaluate
    │                                        action_type: 'negotiation_check'
    │
    ├── negotiates price ─────────────────► Sly Skill: validate terms
    │                                        POST /v1/agents/:id/wallet/policy/evaluate
    │                                        Returns: approve / deny + suggested_counter_offer
    │
    ├── accepts contract ─────────────────► Sly Skill: create governed escrow
    │   (normally: agent-escrow-sdk          POST /v1/escrows
    │    directly)                           (pre-escrow authorization runs server-side)
    │
    └── completes work, gets paid ────────► Sly Skill: release through governance
                                             POST /v1/escrows/:id/release
                                             (release governance runs server-side)
```

### Package Structure

```
sly-governance/
├── __init__.py              # Skill registration with OpenClaw
├── governance.py            # Core interceptors (discover, negotiate, escrow, report)
├── sly_client.py            # Python HTTP client for Sly REST API
├── config.py                # API key + endpoint configuration
├── SKILL.md                 # ClawHub listing metadata
├── requirements.txt         # httpx, pydantic
└── tests/
    ├── test_governance.py
    └── test_sly_client.py
```

### Authentication

- Skill uses agent's Sly API key (generated via Epic 59 agent self-registration or Epic 60 A2A onboarding)
- Key stored in agent's environment configuration, not in skill code
- ClawHub security scan verifies no embedded credentials

### Existing Infrastructure Reused

| Component | Location | Reuse |
|-----------|----------|-------|
| Policy evaluate endpoint | Epic 18 `POST /v1/agents/:id/wallet/policy/evaluate` | Discovery filter + negotiation guardrails |
| Escrow CRUD | Epic 62 `POST /v1/escrows`, `POST /v1/escrows/:id/release` | Governed escrow lifecycle |
| Reputation query | Epic 63 `GET /v1/reputation/:identifier` | Counterparty checks |
| Agent self-registration | Epic 59 `POST /v1/auth/agent-signup` | Agent onboarding |

---

## Stories

---

### Story 64.1: Skill Package Scaffold

**Points:** 2
**Priority:** P1

**Description:**
Create the Python package structure, OpenClaw skill registration, configuration management, and ClawHub SKILL.md metadata.

**Files:**
- New: `packages/sly-governance-skill/__init__.py`
- New: `packages/sly-governance-skill/config.py`
- New: `packages/sly-governance-skill/SKILL.md`
- New: `packages/sly-governance-skill/requirements.txt`
- New: `packages/sly-governance-skill/pyproject.toml`

**Acceptance Criteria:**
- [ ] OpenClaw skill registration interface implemented (`register_skill()`, skill metadata)
- [ ] Configuration from environment: `SLY_API_KEY`, `SLY_API_URL`, `SLY_AGENT_ID`
- [ ] SKILL.md follows ClawHub metadata format (name, version, capabilities, dependencies)
- [ ] `requirements.txt`: httpx, pydantic (minimal dependencies)
- [ ] Package installable via `pip install sly-governance`

---

### Story 64.2: Sly Python API Client

**Points:** 3
**Priority:** P1

**Description:**
Lightweight Python HTTP client for Sly's governance, escrow, and reputation APIs. Typed with Pydantic models.

**Methods:**
```python
class SlyClient:
    def evaluate_policy(self, action_type, counterparty, amount, contract_type) -> PolicyResult
    def create_escrow(self, counterparty, amount, deadline, terms) -> Escrow
    def release_escrow(self, escrow_id) -> ReleaseResult
    def get_reputation(self, identifier) -> TrustScore
    def report_completion(self, escrow_id, outcome, feedback) -> None
```

**Files:**
- New: `packages/sly-governance-skill/sly_client.py`
- New: `packages/sly-governance-skill/models.py` (Pydantic models)

**Acceptance Criteria:**
- [ ] All methods call Sly REST API with proper auth headers
- [ ] Pydantic models for all request/response shapes
- [ ] Timeout handling: 3s default, configurable
- [ ] Retry logic: 1 retry on 5xx with 1s backoff
- [ ] Error responses mapped to typed exceptions
- [ ] Async support via httpx.AsyncClient

---

### Story 64.3: Governance Interceptors

**Points:** 3
**Priority:** P1

**Description:**
Core governance logic that intercepts OpenClaw agent actions and routes them through Sly.

**Interceptors:**
1. `filter_opportunities(opportunities)` — checks each job/contract opportunity against wallet policy, flags violations
2. `validate_negotiation(proposed_terms)` — calls negotiation guardrails API, returns approve/deny + counter-offer
3. `create_governed_escrow(contract)` — routes escrow creation through Sly instead of direct AgentEscrowProtocol
4. `governed_release(escrow_id)` — routes release through Sly governance

**Files:**
- New: `packages/sly-governance-skill/governance.py`

**Acceptance Criteria:**
- [ ] `filter_opportunities` calls policy evaluate for each opportunity, returns annotated list
- [ ] `validate_negotiation` returns policy-compliant counter-offer on deny
- [ ] `create_governed_escrow` calls Sly `POST /v1/escrows` (not AgentEscrowProtocol directly)
- [ ] `governed_release` calls Sly `POST /v1/escrows/:id/release`
- [ ] All interceptors handle Sly API unavailability gracefully (configurable: fail-open or fail-closed)
- [ ] Policy evaluation results cached for 60 seconds (avoid duplicate checks during negotiation)

---

### Story 64.4: ClawHub Publication & Demo Agent

**Points:** 2
**Priority:** P1

**Description:**
Publish the skill to ClawHub and create a demo agent that uses it.

**Publication Requirements:**
- Valid SKILL.md with capability description and usage examples
- Passing ClawHub automated security scan (no embedded credentials, no data exfiltration)
- At least one working demo agent

**Demo Agent:**
- Simple agent that browses m/hire, selects a job, negotiates price (with Sly guardrails), creates governed escrow, completes work, receives payment
- Demonstrates full governance loop in ~30 seconds

**Files:**
- New: `packages/sly-governance-skill/examples/demo_agent.py`
- New: `packages/sly-governance-skill/examples/README.md`

**Acceptance Criteria:**
- [ ] Skill passes ClawHub security scan
- [ ] Published to ClawHub with correct metadata
- [ ] Demo agent runs end-to-end with governed contracting flow
- [ ] README includes quickstart: install, configure API key, run demo
- [ ] Free tier messaging: "Free for agents under $1K/month contract volume"

---

## Points Summary

| Phase | Stories | Points |
|-------|---------|--------|
| Package & Client | 64.1, 64.2 | 5 |
| Governance & Publication | 64.3, 64.4 | 5 |
| **Total** | **4** | **10** |

---

## Implementation Sequence

```
64.1 (scaffold) → 64.2 (API client) → 64.3 (interceptors) → 64.4 (publish + demo)
```

Linear dependency chain. Stories 64.1 and 64.2 can start as soon as Epic 18 API endpoints are testable (even with mocks). Stories 64.3 and 64.4 require Epic 62 escrow endpoints to be functional.

---

## Definition of Done

- [ ] Skill installable via `pip install sly-governance`
- [ ] Published on ClawHub with passing security scan
- [ ] Demo agent completes full governed contracting flow
- [ ] All interceptors handle Sly API unavailability gracefully
- [ ] No credentials embedded in package (API key from environment only)
- [ ] README documentation sufficient for self-service adoption
- [ ] Governance checks add <200ms latency per call
