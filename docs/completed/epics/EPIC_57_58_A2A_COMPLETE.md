# Epics 57 + 58: Google A2A Protocol + Task Processor — Complete

**Status:** ✅ Complete (Epic 57: 14/14; Epic 58: 17/18, one intentionally deferred)
**Completion Window:** February 21 – March 12, 2026
**Points Delivered:** 89 (Epic 57) + 109 (Epic 58, of 119) = **198 delivered, 10 deferred**
**PRD Versions:** v1.22 (Epic 57 commit), v1.23 (Epic 58 closure)
**Companion:** `docs/completed/epics/EPIC_58_IMPLEMENTATION_STATUS.md` (existing detailed status doc)

## Summary

Two coordinated epics that gave Sly first-class Google A2A protocol support — agent discovery, communication, paid task execution — and a background worker to process the inbound tasks. Together they turn agents from passive database records into active workers that can be discovered by Claude / Cursor / ChatGPT and paid to do real work.

Epic 58's intentional deferral: Story 58.4 (LLM Managed Handler) was dropped because the regex router proved faster and cheaper for the A2A task router use case. The deferral is documented in EPIC_58_IMPLEMENTATION_STATUS.md as a rationale, not a debt.

## Key Deliverables

### Epic 57 — Google A2A Protocol (89 pts, Feb 21, 2026)
- Full A2A v0.3 protocol: Agent Cards, JSON-RPC 2.0, task lifecycle
- Per-agent discovery at `/a2a/agents/:id/card` (public, no auth)
- Platform discovery at `/.well-known/agent.json`
- Payment integration: x402 payment gating + AP2 mandate linking within tasks
- Outbound A2A client for remote agent communication
- SDK types + client methods in `@sly/api-client`
- 4 MCP tools: `a2a_discover_agent`, `a2a_send_task`, `a2a_get_task`, `a2a_list_tasks`
- Dashboard: A2A tab on agent detail, tasks + sessions pages
- 599 lines of integration tests

### Epic 58 — A2A Task Processor Worker (109/119 pts, Mar 12, 2026)
- Background worker that polls for incoming A2A tasks and dispatches them
- Tool registry (built-in + per-tenant custom tools)
- Payment gating per task
- `agent_custom_tools` table with webhook execution (HMAC-signed)
- `a2a_audit_events` table (RLS-protected) capturing every task lifecycle event
- A2A types exported to `@sly/types`; `A2AClient` added to `@sly/sdk` with full method surface
- Context window: per-agent `max_context_messages` setting, default cap 100
- Story 58.4 (LLM Managed Handler) deferred — regex router preferred

## Source-of-Truth Files

- Epic specs: `docs/prd/epics/epic-57-google-a2a-protocol.md`, `docs/prd/epics/epic-58-a2a-task-processor.md`
- Detailed status: `docs/completed/epics/EPIC_58_IMPLEMENTATION_STATUS.md`
- Code paths:
  - `apps/api/src/routes/a2a*.ts`
  - `apps/api/src/services/a2a/*`
  - `apps/api/src/workers/a2a-task-processor.ts`
  - `packages/types/src/a2a.ts`
- Tests: `apps/api/tests/integration/a2a.test.ts`

## Linear

- Epic 57: Pre-Linear / early Linear cluster
- Epic 58: Linear project not explicitly named in version history; covered by mid-Q1 ticket cluster

## Follow-on Work

- A2A Agent Onboarding Skills (Epic 60): 🚧 In Progress — `register_agent`, `update_agent`, `get_my_status` skills
- A2A Result Acceptance & Quality Feedback (Epic 69): ✅ Complete
- Universal Agent Discovery (Epic 70): 📋 Backlog
- Agent Key-Pair Authentication for A2A (Epic 72): ✅ Complete
- Flexible Skill Pricing (Epic 68): 📋 Backlog
