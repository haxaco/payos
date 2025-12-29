# Epic 25: User Onboarding & API Improvements 🚀

**Status:** Planned
**Phase:** User Experience
**Priority:** P0 (Blocking external adoption)
**Total Points:** 29
**Stories:** 0/10 Complete
**Duration:** ~4 days

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

During SDK testing, we identified **7 critical snags** that would block first-time users from successfully setting up x402 credentials. While we created an internal automation script to workaround these issues, **real users won't have access to that script**. This epic fixes the underlying API and documentation problems so external users have a smooth onboarding experience.

---

## Business Value

- **Faster Onboarding:** Reduce setup time from 63 min → 5-15 min
- **Reduced Support Load:** Fix confusing errors before users hit them
- **Better First Impression:** Users succeed on first try
- **External Adoption:** Enable beta testers and partners to self-serve

---

## Problem Statement

**Current User Journey (Manual Setup):**
```
1. Read PRD → Try to create wallet
2. Error: "ownerAccountId required" (expected "accountId")
3. Try to create agent → Error: "parentAccountId required" 
4. Create account, retry agent creation
5. Try to fund wallet → Error: "sourceAccountId required"
6. Give up or contact support 😞
```

**Desired User Journey:**
```
1. Read PRD with clear step-by-step guide
2. Follow steps OR use onboarding wizard
3. Entities created in correct order
4. Helpful errors if something goes wrong
5. Test funding works out of the box
6. Ready to test in < 15 minutes ✅
```

---

## Stories

### Story 25.1: Standardize Wallet API Field Names (P0, 2 hours)
### Story 25.2: Implement Agent-Wallet Auto-Assignment (P0, 3 hours)
### Story 25.3: Add Test Wallet Funding Endpoint (P0, 2 hours)
### Story 25.4: Enhanced Error Messages with Next Steps (P0, 2 hours)
### Story 25.5: Onboarding Wizard API Endpoints (P1, 4 hours)
### Story 25.6: Idempotency Support for Creation Endpoints (P1, 3 hours)
### Story 25.7: Dashboard Onboarding Wizard UI (P1, 6 hours)
### Story 25.8: Update PRD with Setup Flow Diagrams (P1, 2 hours)
### Story 25.9: Add Error Troubleshooting Guide (P1, 2 hours)
### Story 25.10: Add Prerequisites Validation Endpoint (P2, 1 hour)

See full details in `/Users/haxaco/Dev/PayOS/docs/prd/PayOS_PRD_v1.15.md` lines 11621-12096

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 25.1 Standardize Field Names | 2 | P0 | Pending |
| 25.2 Agent-Wallet Assignment | 3 | P0 | Pending |
| 25.3 Test Wallet Funding | 2 | P0 | Pending |
| 25.4 Enhanced Error Messages | 2 | P0 | Pending |
| 25.5 Onboarding Wizard API | 4 | P1 | Pending |
| 25.6 Idempotency Support | 3 | P1 | Pending |
| 25.7 Dashboard Wizard UI | 6 | P1 | Pending |
| 25.8 Update PRD Diagrams | 2 | P1 | Pending |
| 25.9 Troubleshooting Guide | 2 | P1 | Pending |
| 25.10 Prerequisites Validation | 1 | P2 | Pending |
| **Total** | **29** | | **0/10 Complete** |

---

## Implementation Priority

**Phase 1: Critical API Fixes (P0) - Day 1**
1. Story 25.1: Standardize field names (2h)
2. Story 25.2: Agent-wallet assignment (3h)
3. Story 25.3: Test funding endpoint (2h)
4. Story 25.4: Enhanced error messages (2h)

**Phase 2: UX Improvements (P1) - Days 2-3**
5. Story 25.5: Onboarding wizard endpoints (4h)
6. Story 25.6: Idempotency support (3h)
7. Story 25.7: Dashboard wizard UI (6h)

**Phase 3: Documentation (P1) - Day 4**
8. Story 25.8: Update PRD with diagrams (2h)
9. Story 25.9: Troubleshooting guide (2h)
10. Story 25.10: Prerequisites validation (1h)

---

## Success Criteria

**Quantitative:**
- Setup time reduced from 63 min → 15 min (manual) or 5 min (wizard)
- Support tickets for "setup issues" drop by 80%
- Beta tester completion rate > 90%
- Zero API field name confusion errors

**Qualitative:**
- External users can complete setup without asking for help
- Error messages are actionable and helpful
- PRD works as a standalone guide (no internal scripts needed)
- Dashboard wizard provides smooth UX for non-technical users

---

## Related Documentation

- **Setup Snags Analysis:** `/docs/SDK_SETUP_IMPROVEMENTS.md`
- **Snags Summary:** `/docs/X402_SETUP_SNAGS_SUMMARY.md`
- **User Improvements:** `/docs/USER_ONBOARDING_IMPROVEMENTS.md`
- **Sample Apps PRD:** `/docs/SAMPLE_APPS_PRD.md`
