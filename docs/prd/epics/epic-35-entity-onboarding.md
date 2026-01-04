# Epic 35: Entity Onboarding API 🚀

## ⚠️ DEPRECATED — Merged into Epic 25

**Status:** DEPRECATED  
**Merged Into:** [Epic 25: Onboarding & Entity Management](./epic-25-user-onboarding.md)  
**Merge Date:** December 30, 2025  

---

## Why This Epic Was Merged

Epic 35's Entity Onboarding API is the **foundation** that Epic 25's Dashboard Wizard and UX improvements consume. Building them separately would have resulted in:
- Duplicate effort defining onboarding flows
- Inconsistent behavior between API and UI
- More maintenance burden

The merged Epic 25 now takes an **API-first approach**: build the unified onboarding endpoint first (Part 1), then the UX layer on top (Part 2).

---

## Story Mapping

| Epic 35 Story | Merged Into | New Story |
|---------------|-------------|-----------|
| 35.1 Unified Onboarding Endpoint (5 pts) | Epic 25 | **25.5** Unified Onboarding Endpoint |
| 35.2 Pix Key Verification (3 pts) | Epic 25 | **25.6** Pix Key Verification |
| 35.3 CLABE Verification (3 pts) | Epic 25 | **25.7** CLABE Verification |
| 35.4 Document Upload (3 pts) | Epic 25 | **25.11** Document Upload |

**Total Points Absorbed:** 14

---

## Reference

For the original epic content before merging, see git history or the PRD v1.14.

**New Location:** [Epic 25: Onboarding & Entity Management](./epic-25-user-onboarding.md)
