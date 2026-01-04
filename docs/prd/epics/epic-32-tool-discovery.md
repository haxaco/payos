# Epic 32: Tool Discovery 🧭

## ⚠️ DEPRECATED — Merged into Epic 36

**Status:** DEPRECATED  
**Merged Into:** [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md)  
**Merge Date:** December 30, 2025  

---

## Why This Epic Was Merged

Epic 32's tool discovery endpoints are **delivery mechanisms** for Epic 36's agent platform integrations. The `/v1/capabilities` and `/v1/capabilities/function-calling` endpoints exist to enable MCP, LangChain, and OpenAI integrations—which are the core of Epic 36.

Building them separately would have resulted in:
- Duplicate effort defining capability structures
- Inconsistent schemas between capabilities and agent tools
- More maintenance burden

---

## Story Mapping

| Epic 32 Story | Merged Into | New Story |
|---------------|-------------|-----------|
| 32.1 Capabilities Endpoint (3 pts) | Epic 36 | **36.9** Capabilities API |
| 32.2 Function-Calling Format (3 pts) | Epic 36 | **36.10** Function-Calling Format |
| 32.3 OpenAPI Spec (3 pts) | Deferred | Auto-generated from routes |
| 32.4 Capability Versioning (2 pts) | Epic 36 | Included in 36.9 via `api_version` |

**Total Points Absorbed:** 8 (11 - 3 deferred)

---

## Reference

For the original epic content before merging, see git history or the PRD v1.14.

**New Location:** [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md)
