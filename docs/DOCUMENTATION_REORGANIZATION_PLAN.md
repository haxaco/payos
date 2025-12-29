# PayOS Documentation Reorganization Plan

**Date:** December 29, 2025
**Status:** Proposed

---

## Current Problem

Documentation is scattered across:
- **Root folder:** 16 markdown files (deployment, security, quick fixes)
- **docs/ folder:** 116+ markdown files (loose, hard to navigate)
- **Some organization exists:** completed/, testing/, security/, prd/, stories/

This makes it difficult to:
- Find relevant documentation quickly
- Understand what's current vs. archived
- Maintain documentation over time

---

## Proposed Structure

```
PayOS/
├── README.md                          ✅ KEEP (project overview)
├── CLAUDE.md                          ✅ KEEP (dev guide, referenced in code)
│
└── docs/
    ├── README.md                      📝 NEW (docs navigation guide)
    │
    ├── prd/                           ✅ EXISTS (restructured)
    │   ├── PayOS_PRD_Master.md
    │   ├── PayOS_PRD_Development.md
    │   ├── epics/
    │   ├── archive/
    │   └── RESTRUCTURE_SUMMARY.md
    │
    ├── guides/                        📝 NEW (active guides)
    │   ├── development/
    │   │   ├── getting-started.md
    │   │   ├── typescript-workflow.md
    │   │   └── mock-to-api-migration.md
    │   ├── deployment/
    │   │   ├── quick-start.md
    │   │   ├── railway-setup.md
    │   │   ├── vercel-setup.md
    │   │   └── environment-variables.md
    │   ├── testing/
    │   │   ├── ap2-testing.md
    │   │   ├── acp-testing.md
    │   │   ├── x402-testing.md
    │   │   ├── gemini-testing.md
    │   │   └── pagination-testing.md
    │   └── onboarding/
    │       ├── gemini-start-here.md
    │       └── user-onboarding-improvements.md
    │
    ├── protocols/                     📝 NEW (protocol-specific docs)
    │   ├── x402/
    │   │   ├── README.md
    │   │   ├── testing-guide.md
    │   │   ├── sdk-guide.md
    │   │   ├── performance-analysis.md
    │   │   ├── business-scenarios.md
    │   │   └── test-credentials.md
    │   ├── ap2/
    │   │   ├── README.md
    │   │   ├── foundation-complete.md
    │   │   └── ui-fixes-complete.md
    │   └── acp/
    │       ├── README.md
    │       └── foundation-complete.md
    │
    ├── security/                      ✅ EXISTS (expand)
    │   ├── README.md
    │   ├── rls-strategy.md
    │   ├── rls-testing.md
    │   ├── security-review.md         ← FROM ROOT
    │   ├── incident-response.md       ← FROM ROOT
    │   ├── leaked-password-protection.md
    │   └── api-key-migration.md       ← FROM ROOT
    │
    ├── deployment/                    📝 NEW (consolidate all deployment)
    │   ├── README.md
    │   ├── quick-start.md
    │   ├── railway/
    │   │   ├── setup.md
    │   │   ├── env-vars.md
    │   │   ├── container-fix.md
    │   │   └── troubleshooting.md
    │   ├── vercel/
    │   │   └── env-vars.md
    │   ├── checklist.md
    │   └── status.md
    │
    ├── architecture/                  📝 NEW (technical design)
    │   ├── infrastructure.md
    │   ├── data-model-strategy.md
    │   ├── wallet-schema-analysis.md
    │   └── ml-treasury-projections.md
    │
    ├── completed/                     ✅ EXISTS (archive)
    │   ├── README.md
    │   ├── epics/
    │   │   ├── epic-0-complete.md
    │   │   ├── epic-14-complete.md
    │   │   ├── epic-16-complete.md
    │   │   ├── epic-17-complete.md
    │   │   ├── epic-22-complete.md
    │   │   └── ...
    │   ├── stories/
    │   │   ├── story-16.5-complete.md
    │   │   ├── story-17.0e-complete.md
    │   │   ├── stories-14.2-14.3-complete.md
    │   │   └── ...
    │   ├── bugfixes/
    │   │   ├── bugfixes-dec18.md
    │   │   ├── bugfixes-major-ui.md
    │   │   ├── settlement-bug-fix.md
    │   │   ├── snag-12-fix.md
    │   │   └── ...
    │   ├── sessions/
    │   │   ├── 2025-12-27-evening.md
    │   │   ├── 2025-12-27.md
    │   │   ├── session-status-dec22.md
    │   │   └── ...
    │   └── deployments/
    │       ├── deployment-complete.md
    │       ├── deployment-summary.md
    │       └── ...
    │
    ├── testing/                       ✅ EXISTS (expand)
    │   ├── README.md
    │   ├── AP2_TESTING_GUIDE.md       ← RENAME to lowercase
    │   ├── ACP_TESTING_GUIDE.md       ← RENAME to lowercase
    │   ├── x402-testing-guide.md
    │   ├── gemini-testing.md
    │   ├── pagination-testing.md
    │   └── test-status-report.md
    │
    └── stories/                       ✅ EXISTS (keep as-is)
        └── (implementation stories)
```

---

## Migration Plan

### Phase 1: Create New Directory Structure

```bash
mkdir -p docs/guides/{development,deployment,testing,onboarding}
mkdir -p docs/protocols/{x402,ap2,acp}
mkdir -p docs/deployment/{railway,vercel}
mkdir -p docs/architecture
mkdir -p docs/completed/{epics,stories,bugfixes,sessions,deployments}
```

### Phase 2: Move Root Files

**Security Files → docs/security/**
```bash
mv SECURITY_REVIEW.md docs/security/security-review.md
mv SECURITY_INCIDENT_RESPONSE.md docs/security/incident-response.md
mv SECURITY_AND_MIGRATION_SUMMARY.md docs/security/api-key-migration.md
mv SECURITY_FIX_CHECKLIST.md docs/security/fix-checklist.md
mv MIGRATION_TO_NEW_KEYS.md docs/security/key-migration.md
```

**Deployment Files → docs/deployment/**
```bash
mv DEPLOY_NOW.md docs/deployment/deploy-now.md
mv DEPLOYMENT_ROADMAP.md docs/deployment/roadmap.md
mv DEPLOYMENT_SETUP_INSTRUCTIONS.md docs/deployment/setup-instructions.md
mv DEPLOYMENT_STATUS_AND_NEXT_STEPS.md docs/deployment/status-and-next-steps.md
mv RAILWAY_*.md docs/deployment/railway/
mv VERCEL_ENV_VARS.md docs/deployment/vercel/env-vars.md
```

**Quick Fixes → docs/completed/bugfixes/**
```bash
mv QUICK_FIX.md docs/completed/bugfixes/quick-fix.md
mv DASHBOARD_429_RATE_LIMIT_FIX.md docs/completed/bugfixes/rate-limit-fix.md
```

### Phase 3: Organize docs/ Files

**Epic Completions → docs/completed/epics/**
```bash
mv docs/EPIC_*_COMPLETE.md docs/completed/epics/
mv docs/MULTI_PROTOCOL_*.md docs/completed/epics/
mv docs/AP2_FOUNDATION*.md docs/protocols/ap2/
mv docs/ACP_FOUNDATION*.md docs/protocols/acp/
```

**X402 Protocol → docs/protocols/x402/**
```bash
mv docs/X402_*.md docs/protocols/x402/
```

**Session Summaries → docs/completed/sessions/**
```bash
mv docs/SESSION_*.md docs/completed/sessions/
mv docs/CURRENT_STATUS.md docs/completed/sessions/
```

**Bugfixes → docs/completed/bugfixes/**
```bash
mv docs/BUGFIXES_*.md docs/completed/bugfixes/
mv docs/SNAG_*.md docs/completed/bugfixes/
mv docs/SETTLEMENT_BUG_FIX.md docs/completed/bugfixes/
mv docs/FIX_SUMMARY.md docs/completed/bugfixes/
mv docs/ISSUES_FIXED_*.md docs/completed/bugfixes/
```

**Deployment → docs/deployment/**
```bash
mv docs/DEPLOYMENT_*.md docs/deployment/
mv docs/README_DEPLOYMENT.md docs/deployment/README.md
```

**Testing Guides → docs/guides/testing/**
```bash
mv docs/testing/*.md docs/guides/testing/
mv docs/*_TESTING_*.md docs/guides/testing/
mv docs/VALIDATION_GUIDE.md docs/guides/testing/
mv docs/UI_VALIDATION_*.md docs/guides/testing/
```

**Development Guides → docs/guides/development/**
```bash
mv docs/TYPESCRIPT_WORKFLOW.md docs/guides/development/typescript-workflow.md
mv docs/MOCK_TO_API_MIGRATION.md docs/guides/development/mock-to-api-migration.md
mv docs/SDK_*.md docs/guides/development/
```

**Onboarding → docs/guides/onboarding/**
```bash
mv docs/GEMINI_START_HERE.md docs/guides/onboarding/gemini-start-here.md
mv docs/USER_ONBOARDING_IMPROVEMENTS.md docs/guides/onboarding/user-onboarding.md
```

**Architecture → docs/architecture/**
```bash
mv docs/INFRASTRUCTURE.md docs/architecture/infrastructure.md
mv docs/EPIC_0_DATA_MODEL_STRATEGY.md docs/architecture/data-model-strategy.md
mv docs/WALLET_SCHEMA_ANALYSIS.md docs/architecture/wallet-schema.md
mv docs/ML_TREASURY_PROJECTIONS.md docs/architecture/ml-treasury.md
```

### Phase 4: Create Index Files

Create README.md files in each directory with:
- Purpose of the directory
- List of documents
- Links to related docs

### Phase 5: Update References

- Update CLAUDE.md to reference new paths
- Update Master PRD links
- Update any code comments with doc links

---

## Benefits

✅ **Discoverability:** Logical grouping makes docs easy to find
✅ **Maintainability:** Clear structure for adding new docs
✅ **Separation:** Active guides vs. archived completions
✅ **Protocol-Specific:** x402, AP2, ACP docs grouped together
✅ **Context Efficiency:** Load only relevant directory

---

## Validation

After migration:
- [ ] All root .md files moved (except README.md, CLAUDE.md)
- [ ] docs/ has < 10 loose files
- [ ] Each directory has README.md
- [ ] No broken links in CLAUDE.md or Master PRD
- [ ] Git history preserved (use `git mv`)

---

## Recommended Next Steps

1. **Review this plan** - Adjust structure as needed
2. **Run Phase 1** - Create directory structure
3. **Run Phase 2-3** - Move files (use `git mv` to preserve history)
4. **Create READMEs** - Document each directory
5. **Update references** - Fix any broken links
6. **Commit changes** - Single commit with descriptive message

---

**Estimated Time:** 30-45 minutes for full reorganization
