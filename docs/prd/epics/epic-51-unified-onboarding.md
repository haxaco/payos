# Epic 51: Unified Platform Onboarding

**Status:** PLANNED
**Phase:** 4.0 (Platform Architecture)
**Priority:** P1 — User Experience
**Estimated Points:** 52 (was 24 + absorbed Epic 25)
**Stories:** 12
**Dependencies:** Epic 48 (Connected Accounts), Epic 49 (Protocol Discovery)
**Absorbs:** Epic 25 (User Onboarding & API Improvements)
**Created:** January 20, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Create protocol-specific onboarding flows that guide users through what they need for each protocol they want to enable. This epic combines **protocol onboarding UX** with **API foundation improvements** (from Epic 25) into a cohesive experience.

**Why Epic 25 Was Merged Here:**
- Epic 25's unified onboarding API (`POST /v1/accounts/onboard`) is the foundation that the UI wizard consumes
- Building them separately would result in duplicate effort and inconsistent behavior
- By merging, we build the API first (Part 1), then the UX layer on top (Part 2)

**Why This Matters:**
- Clear path from signup to first transaction
- Protocol requirements are non-obvious
- Reduces support burden (setup time: 63 min → 5-15 min)
- Increases activation rate
- Single API call can onboard any entity type

**Goal:** Users can set up any protocol through guided onboarding flows with a clean API foundation.

---

## Onboarding Requirements by Protocol

| Protocol | Prerequisites | Onboarding Steps |
|----------|---------------|------------------|
| **x402** | USDC Wallet | Create wallet → Set spending policy → Register endpoint |
| **AP2** | USDC Wallet | Create wallet → Register agent → Create mandate |
| **ACP** | Payment Handler | Connect Stripe/PayPal → Create checkout |
| **UCP** | Payment Handler OR PayOS-native | Connect handler OR configure Pix/SPEI → Create checkout |

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/accounts/onboard` | ✅ Yes | `payos.accounts` | P0 | Single-call entity creation |
| `GET /v1/organization/onboarding-status` | ❌ No | - | P0 | Dashboard only |
| `GET /v1/onboarding/status` | ❌ No | - | P2 | Prerequisites check |
| Onboarding UI components | ❌ No | - | P1 | Frontend only |

**SDK Stories Required:**
- [ ] Add `onboard()` method to `payos.accounts` module

---

## Stories

### Part 1: API Foundation (From Epic 25) — 20 points

#### Story 51.1: Standardize API Field Names

**Points:** 2
**Priority:** P0
**Dependencies:** None

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

#### Story 51.2: Enhanced Error Messages with Next Steps

**Points:** 2
**Priority:** P0
**Dependencies:** None

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

#### Story 51.3: Unified Entity Onboarding Endpoint

**Points:** 5
**Priority:** P0
**Dependencies:** None

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
    "estimated_completion": "2026-01-29T10:00:00Z"
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

#### Story 51.4: Payment Method Verification

**Points:** 5
**Priority:** P1
**Dependencies:** 51.3

**Description:**
Automatically verify payment methods (Pix keys, CLABE) during onboarding.

**Acceptance Criteria:**
- [ ] Verify CPF/CNPJ PIX keys via DICT lookup
- [ ] Verify email/phone PIX keys
- [ ] Validate CLABE format (18 digits)
- [ ] Verify bank code exists
- [ ] Return verification status in response
- [ ] Handle verification failures gracefully

**Files to Create:**
- `apps/api/src/services/pix-verification.ts`
- `apps/api/src/services/clabe-verification.ts`

---

#### Story 51.5: Idempotency Support for Creation Endpoints

**Points:** 3
**Priority:** P1
**Dependencies:** None

**Description:**
Add idempotency key support to prevent duplicate entity creation.

**Acceptance Criteria:**
- [ ] Accept `Idempotency-Key` header
- [ ] Return cached response if key seen before
- [ ] 24-hour key expiration
- [ ] Works for: `/accounts/onboard`, `/accounts`, `/agents`, `/wallets`

---

#### Story 51.6: Test Wallet Funding & Auto-Assignment

**Points:** 3
**Priority:** P0
**Dependencies:** None

**Description:**
In sandbox mode, provide endpoint to add test funds. Also auto-create wallet when creating agent.

**Acceptance Criteria:**
- [ ] `POST /v1/wallets/:id/test-fund` adds mock balance
- [ ] Only works in sandbox/development environment
- [ ] Returns error in production
- [ ] Creates audit log entry
- [ ] `POST /v1/agents` creates wallet automatically if none specified
- [ ] Returns `wallet_id` in agent response

---

### Part 2: Onboarding State & Flows — 16 points

#### Story 51.7: Onboarding State Tracking

**Points:** 5
**Priority:** P0
**Dependencies:** Epic 49 (Protocol Discovery)

**Description:**
Track onboarding progress per protocol per tenant, persisting state across sessions.

**Acceptance Criteria:**
- [ ] `onboarding_progress` table or tenant metadata field
- [ ] Track steps completed per protocol
- [ ] Track prerequisites status
- [ ] Persist across sessions
- [ ] API endpoint for status retrieval
- [ ] Auto-detect completed steps (e.g., wallet exists = step done)

**Onboarding Status Schema:**
```typescript
interface OnboardingStatus {
  overall: {
    completed: boolean;
    completion_percentage: number;
  };
  protocols: {
    [protocolId: string]: {
      enabled: boolean;
      prerequisites_met: boolean;
      steps: {
        id: string;
        name: string;
        completed: boolean;
        completed_at?: string;
      }[];
      current_step: number;
    };
  };
}
```

**API Endpoint:**
```
GET /v1/organization/onboarding-status
```

**Files to Create:**
- `apps/api/src/services/onboarding/status.ts`
- `apps/api/src/routes/organization/onboarding.ts`

---

#### Story 51.8: Protocol-Specific Onboarding Flows

**Points:** 8
**Priority:** P0
**Dependencies:** 51.7

**Description:**
Implement distinct onboarding flows for each protocol based on their unique requirements.

**Acceptance Criteria:**
- [ ] **x402 Flow:** Create wallet → Set policy → Register endpoint
- [ ] **AP2 Flow:** Create wallet → Register agent → Create mandate
- [ ] **ACP Flow:** Connect handler → Create checkout
- [ ] **UCP Flow:** Connect handler OR PayOS-native → Create checkout
- [ ] Each step links to the appropriate action
- [ ] Step completion auto-detected
- [ ] Clear progress indication

**Files to Create:**
- `apps/api/src/services/onboarding/flows/x402.ts`
- `apps/api/src/services/onboarding/flows/ap2.ts`
- `apps/api/src/services/onboarding/flows/acp.ts`
- `apps/api/src/services/onboarding/flows/ucp.ts`

---

#### Story 51.9: Sandbox Mode Setup

**Points:** 3
**Priority:** P1
**Dependencies:** 51.7

**Description:**
Full sandbox mode for all protocols allowing testing without real accounts or funds.

**Acceptance Criteria:**
- [ ] Sandbox mode toggle in settings
- [ ] Mock payments in sandbox (no real charges)
- [ ] Mock wallets with test USDC
- [ ] Mock settlements (instant, no real payouts)
- [ ] Clear "SANDBOX" indicators on all test data
- [ ] Easy switch to production
- [ ] Sandbox data isolated from production

**Sandbox Features:**
- Test API keys (`pk_test_*`)
- Test webhooks
- Mock payment handlers
- Test wallets with 10,000 test USDC
- Instant mock settlements

**Files to Create:**
- `apps/api/src/services/sandbox/index.ts`

---

### Part 3: UX Layer — 16 points

#### Story 51.10: Onboarding Progress UI

**Points:** 6
**Priority:** P1
**Dependencies:** 51.8

**Description:**
Create the onboarding progress UI with step-by-step indicators and quick action buttons.

**Acceptance Criteria:**
- [ ] Step-by-step progress indicator (stepper component)
- [ ] Current step highlighted
- [ ] Completed steps show checkmark
- [ ] Quick action buttons for each step
- [ ] Conditional display (show when incomplete)
- [ ] Dismissible for advanced users
- [ ] Mobile responsive
- [ ] Wizard calls `POST /v1/accounts/onboard` for entity creation
- [ ] Progress saved between steps
- [ ] Validation on each step

**UI Components:**
```
┌────────────────────────────────────────────────────────────────┐
│ x402 Setup Progress                                     [Skip] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✓ Create Wallet    →   ○ Set Policy    →   ○ Register EP     │
│  Completed              In Progress          Pending           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Step 2: Set Spending Policy                              │ │
│  │                                                          │ │
│  │ Configure rate limits to control how much agents can     │ │
│  │ spend per request. This protects against runaway usage.  │ │
│  │                                                          │ │
│  │ [Configure Policy →]                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Files to Create:**
- `apps/web/src/components/onboarding/onboarding-progress.tsx`
- `apps/web/src/components/onboarding/onboarding-step.tsx`
- `apps/web/src/components/onboarding/protocol-onboarding.tsx`
- `apps/web/src/components/onboarding/OnboardingWizard.tsx`

---

#### Story 51.11: Quick Start Templates

**Points:** 3
**Priority:** P2
**Dependencies:** 51.8

**Description:**
Pre-configured setup templates for common use cases that auto-configure multiple settings.

**Acceptance Criteria:**
- [ ] "API Monetization" template (x402 + wallet + default policy)
- [ ] "E-commerce" template (UCP + Stripe connection prompt)
- [ ] "Agent Commerce" template (ACP + agent registration)
- [ ] "Procurement" template (accounts/onboard + Pix/SPEI)
- [ ] Template selection during onboarding
- [ ] Templates auto-create resources where possible
- [ ] Skip manual steps when template handles them

**Templates:**
```typescript
const templates = [
  {
    id: 'api_monetization',
    name: 'API Monetization',
    description: 'Monetize your APIs with per-call payments',
    protocols: ['x402'],
    autoSetup: ['wallet', 'default_policy']
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Accept payments for digital or physical goods',
    protocols: ['ucp'],
    autoSetup: []  // Need to connect handler
  },
  {
    id: 'procurement',
    name: 'Procurement / Payroll',
    description: 'Onboard vendors/employees for payments',
    protocols: [],
    autoSetup: ['unified_onboarding_endpoint']
  }
];
```

**Files to Create:**
- `apps/api/src/services/onboarding/templates.ts`
- `apps/web/src/components/onboarding/template-selector.tsx`

---

#### Story 51.12: Sandbox Toggle & Documentation

**Points:** 4
**Priority:** P1
**Dependencies:** 51.9

**Description:**
UI for sandbox mode toggle and updated documentation with setup flow diagrams.

**Acceptance Criteria:**
- [ ] Sandbox toggle component in settings
- [ ] Clear "SANDBOX" badge in header when active
- [ ] Mermaid diagrams for setup flows in docs
- [ ] Common error troubleshooting guide
- [ ] Links to relevant API endpoints
- [ ] Examples for procurement/payroll use cases

**Files to Create:**
- `apps/web/src/components/settings/sandbox-toggle.tsx`
- `docs/guides/onboarding/SETUP_FLOWS.md`

---

## Story Summary

| Story | Points | Priority | Description | Origin |
|-------|--------|----------|-------------|--------|
| **Part 1: API Foundation** | **20** | | | |
| 51.1 | 2 | P0 | Standardize field names | Epic 25 |
| 51.2 | 2 | P0 | Enhanced error messages | Epic 25 |
| 51.3 | 5 | P0 | Unified onboarding endpoint | Epic 25 |
| 51.4 | 5 | P1 | Payment method verification | Epic 25 |
| 51.5 | 3 | P1 | Idempotency support | Epic 25 |
| 51.6 | 3 | P0 | Test funding & auto-assignment | Epic 25 |
| **Part 2: State & Flows** | **16** | | | |
| 51.7 | 5 | P0 | Onboarding state tracking | Original |
| 51.8 | 8 | P0 | Protocol-specific flows | Original |
| 51.9 | 3 | P1 | Sandbox mode setup | Original |
| **Part 3: UX Layer** | **16** | | | |
| 51.10 | 6 | P1 | Onboarding progress UI + wizard | Combined |
| 51.11 | 3 | P2 | Quick start templates | Original |
| 51.12 | 4 | P1 | Sandbox toggle & docs | Combined |
| **TOTAL** | **52** | | **12 stories** | |

---

## Implementation Priority

**Phase 1: API Foundation (P0) - Days 1-3** (17 pts)
1. Story 51.1: Standardize field names
2. Story 51.2: Enhanced error messages
3. Story 51.3: Unified onboarding endpoint
4. Story 51.6: Test funding & auto-assignment
5. Story 51.7: Onboarding state tracking
6. Story 51.8: Protocol-specific flows

**Phase 2: Verification & Sandbox (P1) - Days 4-5** (16 pts)
7. Story 51.4: Payment method verification
8. Story 51.5: Idempotency support
9. Story 51.9: Sandbox mode setup
10. Story 51.12: Sandbox toggle & docs

**Phase 3: UX Layer (P1/P2) - Days 6-8** (12 pts)
11. Story 51.10: Onboarding progress UI
12. Story 51.11: Quick start templates

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
    payment_terms: 'net30'
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

## Verification Plan

| Checkpoint | Verification |
|------------|--------------|
| API | Unified onboarding endpoint works |
| State | Onboarding progress persists across sessions |
| Flows | Each protocol has distinct onboarding steps |
| Detection | Completed steps auto-detected |
| UI | Progress indicator shows correctly |
| Templates | Quick start creates expected resources |
| Sandbox | Can test without real accounts |

---

## Dependencies

**Requires:**
- Epic 48: Connected Accounts (for handler connection steps)
- Epic 49: Protocol Discovery (for protocol metadata)

**Enables:**
- Epic 52: Dashboard Redesign (onboarding banner integration)

---

## Deprecated: Epic 25

**Epic 25 (User Onboarding & API Improvements)** has been fully absorbed into Epic 51:
- Story 25.1 → Story 51.1 (Standardize Field Names)
- Story 25.2 → Story 51.6 (Auto-Assignment)
- Story 25.3 → Story 51.6 (Test Funding)
- Story 25.4 → Story 51.2 (Enhanced Errors)
- Story 25.5 → Story 51.3 (Unified Onboarding)
- Story 25.6, 25.7 → Story 51.4 (Verification)
- Story 25.8 → Story 51.5 (Idempotency)
- Story 25.9 → Story 51.10 (Wizard UI)
- Story 25.10 → Story 51.7 (State Tracking)
- Story 25.11 → Story 51.4 (Document Upload in Verification)
- Story 25.12 → Story 51.12 (Documentation)

---

## Related Documentation

- [Three-Layer Architecture](../../architecture/three-layer-architecture.md)
- [Epic 48: Connected Accounts](./epic-48-connected-accounts.md)
- [Epic 49: Protocol Discovery](./epic-49-protocol-discovery.md)

---

*Created: January 20, 2026*
*Updated: January 20, 2026 (Merged Epic 25)*
*Status: Planning*
