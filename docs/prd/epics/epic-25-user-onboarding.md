# Epic 25: Onboarding & Entity Management 🚀

**Status:** 📋 Planned  
**Phase:** User Experience + AI-Native Enhancement  
**Priority:** P0 (Blocking external adoption)  
**Total Points:** 40 (was 29 + 14 from Epic 35, minus 3 overlap)  
**Stories:** 0/12 Complete  
**Duration:** ~6 days  
**Absorbs:** Epic 35 (Entity Onboarding API) - merged for cohesive onboarding experience

[← Back to Epic List](./README.md)

---

## Executive Summary

This epic combines **user onboarding UX improvements** (original Epic 25) with **programmatic entity onboarding APIs** (Epic 35) into a cohesive onboarding experience. The API-first approach ensures that both the dashboard wizard AND external integrations use the same underlying endpoints.

### Why Epic 35 Was Merged Here

Epic 35's Entity Onboarding API (`POST /v1/accounts/onboard`) is the **foundation** that Epic 25's Dashboard Wizard consumes. Building them separately would result in:
- Duplicate effort defining onboarding flows
- Inconsistent behavior between API and UI
- More maintenance burden

By merging, we build the API first (Part 1), then the UX layer on top (Part 2).

---

## Business Value

- **Faster Onboarding:** Reduce setup time from 63 min → 5-15 min
- **Single-Call Entity Creation:** Create account + payment methods + verification in one API call
- **Reduced Support Load:** Fix confusing errors before users hit them
- **Better First Impression:** Users succeed on first try
- **External Adoption:** Enable beta testers and partners to self-serve
- **Procurement/Payroll Ready:** Programmatic vendor/employee onboarding

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
1. Single API call creates everything needed
2. OR use onboarding wizard in dashboard
3. Helpful errors if something goes wrong
4. Ready to transact in < 15 minutes ✅
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ONBOARDING ENTRY POINTS                              │
│                                                                             │
│   Dashboard Wizard          SDK/API              Procurement/Payroll        │
│   (Story 25.9)              (Story 25.5)         Systems                    │
│        │                        │                       │                   │
└────────┼────────────────────────┼───────────────────────┼───────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ONBOARDING API                                   │
│                                                                             │
│   POST /v1/accounts/onboard (Story 25.5)                                   │
│   ├── Creates account (person/business)                                    │
│   ├── Attaches payment methods (PIX/SPEI/CLABE)                           │
│   ├── Triggers verification (KYC/KYB)                                      │
│   ├── Returns ready_for_payments status                                    │
│   └── Supports idempotency (Story 25.8)                                    │
│                                                                             │
│   Verification Integrations:                                               │
│   ├── PIX key verification (Story 25.6)                                   │
│   ├── CLABE verification (Story 25.7)                                     │
│   └── Document upload (Story 25.11)                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXISTING PAYOS SYSTEMS                                   │
│       Accounts API    │    Payment Methods    │    Compliance              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stories

### Part 1: API Foundation (From Epic 35)

#### Story 25.1: Standardize Wallet API Field Names

**Points:** 2  
**Priority:** P0  
**Duration:** 2 hours

**Description:**
Fix field name inconsistencies that confuse first-time users.

**Changes:**
| Current Field | Expected Field | Endpoint |
|---------------|----------------|----------|
| `ownerAccountId` | `accountId` | POST /v1/wallets |
| `parentAccountId` | `accountId` | POST /v1/agents |
| `sourceAccountId` | `fromAccountId` | POST /v1/wallets/:id/fund |

**Acceptance Criteria:**
- [ ] Old field names still work (backward compatible)
- [ ] New field names are primary in docs
- [ ] Deprecation warning in response headers
- [ ] OpenAPI spec updated

---

#### Story 25.2: Implement Agent-Wallet Auto-Assignment

**Points:** 3  
**Priority:** P0  
**Duration:** 3 hours

**Description:**
When creating an agent, automatically create and assign a wallet if none specified.

**Acceptance Criteria:**
- [ ] `POST /v1/agents` creates wallet automatically
- [ ] Wallet linked to agent's parent account
- [ ] Returns `wallet_id` in response
- [ ] Optional: specify existing wallet via `wallet_id` param

---

#### Story 25.3: Add Test Wallet Funding Endpoint

**Points:** 2  
**Priority:** P0  
**Duration:** 2 hours

**Description:**
In sandbox mode, provide endpoint to add test funds to wallets.

**Acceptance Criteria:**
- [ ] `POST /v1/wallets/:id/test-fund` adds mock balance
- [ ] Only works in sandbox/development environment
- [ ] Returns error in production
- [ ] Creates audit log entry

---

#### Story 25.4: Enhanced Error Messages with Next Steps

**Points:** 2  
**Priority:** P0  
**Duration:** 2 hours

**Description:**
All API errors include actionable next steps and links to documentation.

**Error Response Format:**
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account acc_123 not found",
    "suggestion": "Create an account first using POST /v1/accounts",
    "docs_url": "https://docs.payos.ai/accounts/create",
    "related_endpoints": [
      { "method": "POST", "path": "/v1/accounts", "description": "Create account" }
    ]
  }
}
```

**Acceptance Criteria:**
- [ ] All error responses include `suggestion` field
- [ ] Common errors have `docs_url`
- [ ] Related endpoints suggested where relevant

---

#### Story 25.5: Unified Onboarding Endpoint

**Points:** 5  
**Priority:** P0  
**Duration:** 4 hours  
**Origin:** Epic 35, Story 35.1

**Description:**
Single-call endpoint that creates account + payment methods + triggers verification.

**API:**
```
POST /v1/accounts/onboard
```

**Request:**
```json
{
  "type": "business",
  "business_name": "Brazilian Supplier Ltd",
  "country": "BR",
  "tax_id": "12.345.678/0001-90",
  "payment_methods": [
    { "type": "pix", "pix_key_type": "cnpj", "pix_key": "12345678000190" }
  ],
  "verification": {
    "skip_kyb": false,
    "documents": [
      { "type": "cnpj_card", "url": "https://..." }
    ]
  },
  "metadata": {
    "vendor_code": "SUPP-001",
    "payment_terms": "net30"
  }
}
```

**Response:**
```json
{
  "account_id": "acc_new",
  "status": "pending_verification",
  "verification": {
    "kyb_status": "in_progress",
    "estimated_completion": "2025-12-29T10:00:00Z"
  },
  "payment_methods": [
    { "id": "pm_1", "type": "pix", "status": "verified" }
  ],
  "ready_for_payments": false,
  "ready_for_payments_after": "kyb_completed"
}
```

**Acceptance Criteria:**
- [ ] Creates account in single call
- [ ] Attaches payment methods
- [ ] Triggers KYC/KYB if not skipped
- [ ] Returns `ready_for_payments` status
- [ ] Supports both `person` and `business` types

**Files to Create:**
- `apps/api/src/routes/accounts-onboard.ts`
- `apps/api/src/services/entity-onboarding.ts`

---

#### Story 25.6: Pix Key Verification Integration

**Points:** 3  
**Priority:** P1  
**Duration:** 3 hours  
**Origin:** Epic 35, Story 35.2

**Description:**
Automatically verify PIX keys during onboarding.

**Acceptance Criteria:**
- [ ] Verify CPF/CNPJ PIX keys via DICT lookup
- [ ] Verify email/phone PIX keys
- [ ] Return verification status in response
- [ ] Handle verification failures gracefully

**Files to Create:**
- `apps/api/src/services/pix-verification.ts`

---

#### Story 25.7: CLABE Verification Integration

**Points:** 3  
**Priority:** P1  
**Duration:** 3 hours  
**Origin:** Epic 35, Story 35.3

**Description:**
Automatically verify Mexican CLABE numbers during onboarding.

**Acceptance Criteria:**
- [ ] Validate CLABE format (18 digits)
- [ ] Verify bank code exists
- [ ] Return verification status in response
- [ ] Handle verification failures gracefully

**Files to Create:**
- `apps/api/src/services/clabe-verification.ts`

---

#### Story 25.8: Idempotency Support for Creation Endpoints

**Points:** 3  
**Priority:** P1  
**Duration:** 3 hours

**Description:**
Add idempotency key support to prevent duplicate entity creation.

**Acceptance Criteria:**
- [ ] Accept `Idempotency-Key` header
- [ ] Return cached response if key seen before
- [ ] 24-hour key expiration
- [ ] Works for: `/accounts/onboard`, `/accounts`, `/agents`, `/wallets`

---

### Part 2: UX Layer

#### Story 25.9: Dashboard Onboarding Wizard UI

**Points:** 6  
**Priority:** P1  
**Duration:** 6 hours  
**Dependencies:** 25.5

**Description:**
Multi-step wizard in dashboard that calls the unified onboarding API.

**Wizard Steps:**
1. **Account Type** - Person or Business?
2. **Basic Info** - Name, country, tax ID
3. **Payment Method** - Add PIX/SPEI/CLABE
4. **Verification** - Upload documents (if required)
5. **Complete** - Summary and next steps

**Acceptance Criteria:**
- [ ] Wizard calls `POST /v1/accounts/onboard`
- [ ] Progress saved between steps
- [ ] Validation on each step
- [ ] Success state shows next actions
- [ ] Mobile-responsive

**Files to Create:**
- `apps/dashboard/src/components/onboarding/OnboardingWizard.tsx`
- `apps/dashboard/src/components/onboarding/steps/*.tsx`

---

#### Story 25.10: Prerequisites Validation Endpoint

**Points:** 1  
**Priority:** P2  
**Duration:** 1 hour

**Description:**
Endpoint that checks if user has completed all prerequisites.

**Acceptance Criteria:**
- [ ] `GET /v1/onboarding/status` returns checklist
- [ ] Indicates: has_account, has_wallet, has_agent, has_funding

---

#### Story 25.11: Document Upload and Processing

**Points:** 3  
**Priority:** P2  
**Duration:** 3 hours  
**Origin:** Epic 35, Story 35.4

**Description:**
Handle document uploads for KYC/KYB verification.

**Acceptance Criteria:**
- [ ] Accept document URLs or base64
- [ ] Support: passport, ID card, CNPJ card, proof of address
- [ ] Store securely with encryption
- [ ] Trigger verification workflow

---

#### Story 25.12: Update Documentation with Setup Flow Diagrams

**Points:** 2  
**Priority:** P1  
**Duration:** 2 hours

**Description:**
Add visual flow diagrams and troubleshooting guide to docs.

**Acceptance Criteria:**
- [ ] Mermaid diagrams for setup flows
- [ ] Common error troubleshooting guide
- [ ] Links to relevant API endpoints
- [ ] Examples for procurement/payroll use cases

---

## Story Summary

| Story | Points | Priority | Description | Origin |
|-------|--------|----------|-------------|--------|
| **Part 1: API Foundation** | | | | |
| 25.1 Standardize Field Names | 2 | P0 | Fix inconsistent API fields | Original |
| 25.2 Agent-Wallet Auto-Assignment | 3 | P0 | Auto-create wallets for agents | Original |
| 25.3 Test Wallet Funding | 2 | P0 | Sandbox funding endpoint | Original |
| 25.4 Enhanced Error Messages | 2 | P0 | Actionable error responses | Original |
| 25.5 Unified Onboarding Endpoint | 5 | P0 | Single-call entity creation | **Epic 35** |
| 25.6 Pix Key Verification | 3 | P1 | Auto-verify PIX keys | **Epic 35** |
| 25.7 CLABE Verification | 3 | P1 | Auto-verify Mexican CLABEs | **Epic 35** |
| 25.8 Idempotency Support | 3 | P1 | Prevent duplicate creation | Original |
| **Part 2: UX Layer** | | | | |
| 25.9 Dashboard Wizard UI | 6 | P1 | Multi-step onboarding wizard | Original |
| 25.10 Prerequisites Validation | 1 | P2 | Check setup completeness | Original |
| 25.11 Document Upload | 3 | P2 | KYC/KYB document handling | **Epic 35** |
| 25.12 Documentation Update | 2 | P1 | Flow diagrams, troubleshooting | Original |
| **Total** | **40** | | | |

---

## Implementation Priority

**Phase 1: Critical API Fixes (P0) - Day 1-2** (14 pts)
1. Story 25.1: Standardize field names (2h)
2. Story 25.2: Agent-wallet assignment (3h)
3. Story 25.3: Test funding endpoint (2h)
4. Story 25.4: Enhanced error messages (2h)
5. Story 25.5: Unified onboarding endpoint (4h)

**Phase 2: Verification & Idempotency (P1) - Day 3-4** (12 pts)
6. Story 25.6: Pix key verification (3h)
7. Story 25.7: CLABE verification (3h)
8. Story 25.8: Idempotency support (3h)
9. Story 25.12: Documentation update (2h)

**Phase 3: UX Layer (P1) - Day 5-6** (10 pts)
10. Story 25.9: Dashboard wizard UI (6h)
11. Story 25.10: Prerequisites validation (1h)
12. Story 25.11: Document upload (3h)

---

## Use Cases

### Procurement Platform
```typescript
// Onboard new vendor in single call
const vendor = await payos.accounts.onboard({
  type: 'business',
  business_name: 'Acme Supplies',
  country: 'MX',
  tax_id: 'ABC123456789',
  payment_methods: [
    { type: 'spei', clabe: '012345678901234567' }
  ],
  metadata: {
    vendor_code: 'V-1234',
    payment_terms: 'net30',
    category: 'office_supplies'
  }
});

if (vendor.ready_for_payments) {
  // Can pay immediately
} else {
  // Wait for verification webhook
}
```

### Payroll System
```typescript
// Onboard new employee
const employee = await payos.accounts.onboard({
  type: 'person',
  first_name: 'João',
  last_name: 'Silva',
  country: 'BR',
  tax_id: '123.456.789-00',
  payment_methods: [
    { type: 'pix', pix_key_type: 'cpf', pix_key: '12345678900' }
  ],
  metadata: {
    employee_id: 'EMP-5678',
    department: 'engineering'
  }
});
```

### Dashboard Wizard
```
User clicks "Add New Vendor" →
  Step 1: Select "Business" →
  Step 2: Enter company info →
  Step 3: Add PIX key → [auto-verified] →
  Step 4: Upload CNPJ card →
  Step 5: "Vendor ready for payments!" ✅
```

---

## Success Criteria

**Quantitative:**
- [ ] Setup time reduced from 63 min → 15 min (manual) or 5 min (wizard)
- [ ] Support tickets for "setup issues" drop by 80%
- [ ] Beta tester completion rate > 90%
- [ ] Zero API field name confusion errors

**Qualitative:**
- [ ] External users can complete setup without asking for help
- [ ] Error messages are actionable and helpful
- [ ] Single API call can onboard any entity type
- [ ] Dashboard wizard provides smooth UX for non-technical users

---

## Deprecated: Epic 35

**Epic 35 (Entity Onboarding API)** has been fully absorbed into Epic 25:
- Story 35.1 → Story 25.5 (Unified Onboarding Endpoint)
- Story 35.2 → Story 25.6 (Pix Key Verification)
- Story 35.3 → Story 25.7 (CLABE Verification)
- Story 35.4 → Story 25.11 (Document Upload)

---

## Related Documentation

- **Setup Snags Analysis:** `/docs/SDK_SETUP_IMPROVEMENTS.md`
- **Snags Summary:** `/docs/X402_SETUP_SNAGS_SUMMARY.md`
- **User Improvements:** `/docs/USER_ONBOARDING_IMPROVEMENTS.md`
- **Sample Apps PRD:** `/docs/SAMPLE_APPS_PRD.md`
