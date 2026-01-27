# PRD Templates & Guidelines

This document contains templates for creating epics and stories with proper SDK consideration.

---

## Epic Template

```markdown
# Epic [NUMBER]: [Title] [Emoji]

**Status:** 📋 Pending | 🚧 In Progress | ✅ Complete  
**Phase:** [Phase number and name]  
**Priority:** P0 | P1 | P2  
**Total Points:** [X]  
**Stories:** 0/[Y] Complete  
**Dependencies:** [Epic X, Epic Y]  
**Enables:** [What this epic enables]  

[← Back to Epic List](./README.md)

---

## Executive Summary

[2-3 sentences describing what this epic accomplishes and why it matters]

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/example` | ✅ Yes | `payos.example` | P0 | New module |
| `GET /v1/other` | ✅ Yes | `payos.other` | P1 | Existing module |
| Internal service | ❌ No | - | - | No API surface |
| New webhook | ⚠️ Types | Types only | P2 | TypeScript types |

**SDK Stories Required:**
- [ ] Story 36.X: [Description]
- [ ] Story 36.Y: [Description]

---

## Architecture

[Diagram or description of how components fit together]

---

## Stories

### Story [EPIC].[NUMBER]: [Title]

**Points:** X  
**Priority:** PX  
**Dependencies:** [Story X.Y]

**Description:**
[What this story accomplishes]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests written
- [ ] Documentation updated

**SDK Exposure:**
- **Needs SDK exposure?** Yes / No / Types Only
- **Module:** `payos.[module]`
- **Method(s):** `method1()`, `method2()`
- **MCP tool needed?** Yes / No
- **SDK story:** [Link or N/A]

**Files to Create:**
- `path/to/new/file.ts`

**Files to Modify:**
- `path/to/existing/file.ts`

---

[Repeat for additional stories]

---

## Story Summary

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| [EPIC].1 | X | PX | [Brief description] |
| [EPIC].2 | X | PX | [Brief description] |
| **Total** | **X** | | |

---

## Technical Specifications

[Any technical details, API formats, database schemas, etc.]

---

## Success Criteria

1. [Measurable outcome 1]
2. [Measurable outcome 2]
3. [Measurable outcome 3]

---

## Related Documentation

- [Link to related doc 1]
- [Link to related doc 2]
```

---

## Story Template (Standalone)

Use this template when adding stories to an existing epic:

```markdown
### Story [EPIC].[NUMBER]: [Title]

**Points:** [1-13, fibonacci]  
**Priority:** P0 | P1 | P2  
**Dependencies:** [Story X.Y, or "None"]

**Description:**
[Clear description of what this story accomplishes. Should be completable in 1-3 days.]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]
- [ ] Unit tests written and passing
- [ ] Integration tests (if applicable)
- [ ] Documentation updated (if user-facing)

**SDK Exposure:**
- **Needs SDK exposure?** [Yes / No / Types Only]
- **If yes:**
  - **Module:** `payos.[module]`
  - **Method(s):** `create()`, `get()`, `list()`, etc.
  - **Parameters:** [Key parameters to expose]
  - **MCP tool needed?** [Yes / No]
  - **LangChain tool needed?** [Yes / No]
  - **SDK story:** [Link to Epic 36 story, or "Create: [description]"]
- **If no:**
  - **Reason:** [Internal-only / Admin-only / Refactor / Already covered by X]

**Implementation Notes:**
[Any technical guidance, code snippets, or architectural decisions]

**Files to Create:**
- `apps/api/src/routes/[name].ts`
- `packages/types/src/[name].ts`

**Files to Modify:**
- `apps/api/src/index.ts` (mount router)
- `packages/sdk/src/[module]/index.ts` (if SDK exposure)

**Testing Notes:**
- [Specific test scenarios to cover]
- [Edge cases to handle]
```

---

## SDK Exposure Decision Tree

Use this to decide whether a feature needs SDK exposure:

```
Is this a new or modified API endpoint?
├── No → No SDK exposure needed
└── Yes ↓
    
    Is this endpoint for partner/developer use?
    ├── No (admin-only, internal) → No SDK exposure needed
    └── Yes ↓
        
        Does it change request/response shape?
        ├── No (internal optimization) → No SDK exposure needed
        └── Yes ↓
            
            ✅ SDK EXPOSURE NEEDED
            
            What kind of exposure?
            ├── New endpoint in existing domain → Add method to existing module
            ├── New domain/resource type → Create new module
            ├── New webhook event → Add TypeScript types
            └── New protocol support → Create new protocol module
            
            What platforms need updates?
            ├── TypeScript SDK → Always
            ├── MCP Server → If useful for LLM agents
            ├── LangChain → If useful for Python agents
            └── OpenAI/Vercel → If useful for JS agents
```

---

## Quick Reference: SDK Module Mapping

| API Domain | SDK Module | MCP Tool | Notes |
|------------|------------|----------|-------|
| `/v1/settlements/*` | `payos.settlements` | `payos_settle`, `payos_quote` | Core settlement |
| `/v1/accounts/*` | `payos.accounts` | - | Account management |
| `/v1/agents/*` | `payos.agents` | - | Agent management |
| `/v1/compliance/*` | `payos.compliance` | `payos_compliance_check` | Screening |
| `/v1/x402/*` | `payos.x402` | - | x402 protocol |
| `/v1/ap2/*` | `payos.ap2` | - | AP2 protocol |
| `/v1/acp/*` | `payos.acp` | - | ACP protocol |
| `/v1/webhooks/*` | `payos.webhooks` | - | Webhook utilities |
| `/v1/simulate/*` | `payos.simulate` | `payos_simulate` | Dry-run |
| `/v1/batch/*` | `payos.batch` | `payos_batch_settle` | Batch operations |

---

## Definition of Done Checklist

Copy this into your PR description:

```markdown
## Definition of Done

### Code Quality
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] No linting errors
- [ ] Type-safe (no `any` types without justification)

### Documentation
- [ ] Code comments for complex logic
- [ ] API documentation updated (if endpoint changes)
- [ ] README updated (if setup changes)

### SDK Gate ⚠️
- [ ] SDK exposure decision documented in story/PR
- [ ] If SDK needed:
  - [ ] Epic 36 story created/updated
  - [ ] Types added to `@sly/sdk`
  - [ ] MCP tool added (if applicable)
- [ ] If SDK NOT needed:
  - [ ] Reason documented: _______________
```

---

## Examples

### Example: New Endpoint Needing SDK

**Story:** Add refund endpoint

```markdown
**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.settlements`
- **Method(s):** `refund(settlementId, options)`
- **MCP tool needed?** Yes - `payos_refund`
- **SDK story:** Create: "Add refund method to settlements module"
```

### Example: Internal Optimization

**Story:** Add Redis caching to quotes

```markdown
**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Internal optimization, no API changes
```

### Example: Admin-Only Endpoint

**Story:** Add tenant management endpoints

```markdown
**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Admin-only, not for partner SDK
```

### Example: New Protocol Support

**Story:** Add AP2 mandate verification

```markdown
**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.ap2` (new module)
- **Method(s):** `verifyMandate()`, `executePayment()`
- **MCP tool needed?** Yes - `payos_ap2_verify`, `payos_ap2_execute`
- **SDK story:** Story 36.5 (AP2 Support)
```
