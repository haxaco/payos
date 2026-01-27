# Epic 54: PayOS → Sly Rebranding

**Status:** PLANNED
**Phase:** 5.0 (Brand Evolution)
**Priority:** P0 — Company Identity
**Estimated Points:** 34
**Stories:** 8
**Dependencies:** None
**Created:** January 27, 2026
**Updated:** January 27, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Rebrand the entire platform from **PayOS** to **Sly** — "The Agentic Settlement Layer". This epic covers all aspects of the rename across codebase, documentation, UI, packages, and external assets.

**New Identity:**
- **Name:** Sly
- **Tagline:** The Agentic Settlement Layer
- **Domain:** getsly.ai
- **Positioning:** One integration for every agentic commerce protocol

---

## Scope

### In Scope
- Package renaming (`@sly/*` → `@sly/*`)
- Repository rename consideration
- Documentation updates
- UI/Dashboard branding
- API response headers
- SDK naming
- Environment variables
- Database references (where applicable)

### Out of Scope
- Database schema changes (internal table names can remain)
- Breaking API changes (v1 endpoints remain stable)
- Historical git history rewriting

---

## Stories

### Story 54.1: Package Namespace Migration

**Points:** 8
**Priority:** P0

**Description:**
Rename all npm packages from `@sly/*` to `@sly/*`.

**Packages to Rename:**
- `@sly/api` → `@sly/api`
- `@sly/web` → `@sly/web`
- `@sly/sdk` → `@sly/sdk`
- `@sly/cards` → `@sly/cards`
- `@sly/types` → `@sly/types`
- `@sly/utils` → `@sly/utils`
- `@sly/ui` → `@sly/ui`
- `@sly/api-client` → `@sly/api-client`
- `@sly/mcp-server` → `@sly/mcp-server`
- `@sly/db` → `@sly/db`
- `@sly/x402-client-sdk` → `@sly/x402-client-sdk`
- `@sly/x402-provider-sdk` → `@sly/x402-provider-sdk`

**Acceptance Criteria:**
- [ ] All package.json files updated with new names
- [ ] All internal imports updated
- [ ] TypeScript paths updated
- [ ] Build succeeds with new names
- [ ] Tests pass

**Files to Modify:**
- All `package.json` files
- All import statements referencing `@sly/*`
- `tsconfig.json` path mappings
- `turbo.json` if applicable

---

### Story 54.2: Documentation Rebrand

**Points:** 5
**Priority:** P0

**Description:**
Update all documentation to reflect Sly branding.

**Areas:**
- README.md (root and all packages)
- CLAUDE.md
- PRD documents
- API documentation
- Integration guides
- Code comments mentioning "PayOS"

**Acceptance Criteria:**
- [ ] All README files updated
- [ ] CLAUDE.md updated with Sly context
- [ ] PRD master document updated
- [ ] All epic documents updated
- [ ] Integration guides reflect new name
- [ ] No "PayOS" references remain (except historical)

---

### Story 54.3: Dashboard UI Rebrand

**Points:** 5
**Priority:** P0

**Description:**
Update the Next.js dashboard with Sly branding.

**Areas:**
- Logo/wordmark
- Page titles
- Meta tags
- Favicon
- Footer
- About/help pages

**Acceptance Criteria:**
- [ ] Sly logo in header
- [ ] Page titles use "Sly"
- [ ] Meta description updated
- [ ] Favicon updated
- [ ] Copyright/footer updated

**Files to Modify:**
- `apps/web/src/app/layout.tsx`
- `apps/web/public/` (favicon, logos)
- `apps/web/src/components/` (header, footer)

---

### Story 54.4: SDK Public API Rebrand

**Points:** 5
**Priority:** P0

**Description:**
Update SDK exports and class names for Sly branding.

**Changes:**
```typescript
// Before
import { PayOS } from '@sly/sdk';
const payos = new PayOS({ apiKey: '...' });

// After
import { Sly } from '@sly/sdk';
const sly = new Sly({ apiKey: '...' });

// Or with backwards compatibility
import { Sly, PayOS } from '@sly/sdk'; // PayOS as alias
```

**Acceptance Criteria:**
- [ ] Main class renamed to `Sly`
- [ ] `PayOS` kept as deprecated alias for migration
- [ ] TypeScript types updated
- [ ] Examples in docs updated
- [ ] Migration guide created

---

### Story 54.5: Environment Variables Update

**Points:** 3
**Priority:** P1

**Description:**
Update environment variable naming convention.

**Changes:**
- `PAYOS_API_KEY` → `SLY_API_KEY` (with fallback)
- `PAYOS_*` → `SLY_*` prefix

**Acceptance Criteria:**
- [ ] New `SLY_*` variables supported
- [ ] Old `PAYOS_*` variables still work (fallback)
- [ ] .env.example files updated
- [ ] Documentation updated

---

### Story 54.6: API Response Headers

**Points:** 2
**Priority:** P1

**Description:**
Update API response headers to reflect Sly branding.

**Changes:**
- `X-PayOS-Request-Id` → `X-Sly-Request-Id`
- Server header if exposed

**Acceptance Criteria:**
- [ ] Request ID header updated
- [ ] Any other branded headers updated
- [ ] Backwards compatibility maintained where needed

---

### Story 54.7: MCP Server Rebrand

**Points:** 3
**Priority:** P1

**Description:**
Update MCP server naming and tool prefixes.

**Changes:**
- Package name: `@sly/mcp-server`
- Tool names: Consider `sly_*` prefix
- Server name in manifest

**Acceptance Criteria:**
- [ ] MCP server package renamed
- [ ] Tool names updated (if applicable)
- [ ] README updated
- [ ] Anthropic directory listing updated

---

### Story 54.8: External Assets & Accounts

**Points:** 3
**Priority:** P1

**Description:**
Update external assets and accounts.

**Areas:**
- GitHub repository name (if changing)
- npm organization
- Domain configuration
- Social media handles
- Developer portal content

**Acceptance Criteria:**
- [ ] Decision made on repo rename
- [ ] npm org `@sly` secured or alternative chosen
- [ ] Domain DNS configured
- [ ] External references documented

---

## Implementation Strategy

### Phase 1: Internal (No Breaking Changes)
1. Update documentation
2. Update dashboard UI
3. Update internal comments/names

### Phase 2: SDK Migration Path
1. Add `Sly` class alongside `PayOS`
2. Mark `PayOS` as deprecated
3. Update examples to use `Sly`

### Phase 3: Package Rename
1. Publish packages under `@sly/*`
2. Keep `@sly/*` as deprecated aliases
3. Announce migration timeline

### Phase 4: Cleanup
1. Remove deprecated aliases (major version)
2. Update all external references
3. Archive old package names

---

## Migration Guide (for SDK Users)

```typescript
// Step 1: Update package
// npm install @sly/sdk
// npm uninstall @sly/sdk

// Step 2: Update imports
// Before
import { PayOS } from '@sly/sdk';
const payos = new PayOS({ apiKey: process.env.PAYOS_API_KEY });

// After
import { Sly } from '@sly/sdk';
const sly = new Sly({ apiKey: process.env.SLY_API_KEY });

// Step 3: Update env vars
// PAYOS_API_KEY → SLY_API_KEY

// The API itself (endpoints, responses) remains unchanged
```

---

## Epic 54 Summary

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 54.1 Package Namespace | 8 | P0 | Rename @sly/* → @sly/* |
| 54.2 Documentation | 5 | P0 | Update all docs |
| 54.3 Dashboard UI | 5 | P0 | Logo, titles, meta |
| 54.4 SDK Public API | 5 | P0 | Sly class, deprecate PayOS |
| 54.5 Environment Vars | 3 | P1 | SLY_* prefix with fallback |
| 54.6 API Headers | 2 | P1 | X-Sly-* headers |
| 54.7 MCP Server | 3 | P1 | MCP naming |
| 54.8 External Assets | 3 | P1 | GitHub, npm, domain |
| **Total** | **34** | | |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing integrations | High | Maintain backwards compatibility, deprecation period |
| npm namespace unavailable | Medium | Check availability early, have alternatives |
| SEO impact | Low | Proper redirects, update external links |
| Developer confusion | Medium | Clear migration guide, deprecation warnings |

---

## Success Criteria

1. All internal references updated to Sly
2. SDK users can migrate with minimal friction
3. No breaking changes in Phase 1-2
4. Clean separation in Phase 3+
5. External presence reflects new brand

---

*Created: January 27, 2026*
