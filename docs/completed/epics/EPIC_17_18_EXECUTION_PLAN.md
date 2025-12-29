# Epic 17 & 18: x402 Implementation - Execution Plan

**Status:** 🚀 **IN PROGRESS**  
**Started:** December 21, 2025  
**Approach:** Option B (Hybrid - Internal Ledger)  
**Reference:** [Implementation Plan](./EPIC_17_18_X402_IMPLEMENTATION_PLAN.md)

---

## ✅ Confirmed Decisions

### 1. Architecture: Option B (Hybrid)
- ✅ Internal ledger for wallets (not real crypto wallets)
- ✅ Mock blockchain verification (generate fake tx_hash)
- ✅ Internal transfers for x402 payments
- ✅ Stablecoins only (USDC/EURC) per x402 spec
- ✅ Full x402 protocol compliance (x402.org)
- 🔜 Future: Real blockchain integration → **Separate Epic** (post-validation)

### 2. Scope: Epic 17 + 18 Only
**Build & Test:**
- ✅ Epic 17: x402 Gateway (receive payments) - 26 points
- ✅ Epic 18: Wallets & Spending Policies (make payments) - 23 points

**Defer to Later:**
- 🔜 Epic 19: PayOS x402 Services - After full validation
- 🔜 Epic 20: Streaming + Agent Registry - After Epic 17+18 testing complete

### 3. Demo & Testing Focus

**Internal Testing (3 Scenarios):**
1. Register x402 endpoint → Monetize API
2. Create wallet with spending policy → Agent makes payments
3. Monitor spending → View analytics

**External Testing:**
1. Agent registration for wallet (external user flow)
2. API provider registration for paid API (external user flow)
3. End-to-end: Agent calls paid API → Payment → Response
4. SDK testing:
   - Consumer SDK (agent making payments)
   - Producer SDK (API provider receiving payments)

---

## 🎯 Implementation Sequence

### Phase 1: Database & Core APIs (Week 1-2)

#### Day 1: Database Migrations ✅ IN PROGRESS
- [x] Create `20251222_create_x402_endpoints.sql`
- [x] Create `20251222_create_wallets.sql`
- [x] Create `20251222_extend_transfers_x402.sql`
- [x] Create `20251222_extend_accounts_agent_config.sql`
- [ ] Apply migrations to dev environment
- [ ] Test RLS policies
- [ ] Test stablecoin-only constraint

#### Day 2: x402 Endpoints API (Story 17.1)
- [ ] Create `apps/api/src/routes/x402-endpoints.ts`
- [ ] POST `/v1/x402/endpoints` - Register endpoint
- [ ] GET `/v1/x402/endpoints` - List endpoints
- [ ] GET `/v1/x402/endpoints/:id` - Get details
- [ ] PATCH `/v1/x402/endpoints/:id` - Update
- [ ] DELETE `/v1/x402/endpoints/:id` - Delete
- [ ] Zod validation schemas
- [ ] Mount in `apps/api/src/app.ts`
- [ ] Test with Postman

#### Day 3: x402 Payment Verification API (Story 17.2)
- [ ] Create `apps/api/src/services/x402-payment-verifier.ts`
- [ ] POST `/v1/x402/verify` - Verify payment
- [ ] Mock verification (check payment_proof exists in transfers)
- [ ] Generate mock tx_hash (UUID-based)
- [ ] Test idempotency with request_id

#### Day 4: Wallets API (Story 18.2)
- [ ] Create `apps/api/src/routes/wallets.ts`
- [ ] POST `/v1/wallets` - Create wallet
- [ ] GET `/v1/wallets` - List wallets
- [ ] GET `/v1/wallets/:id` - Get details
- [ ] PATCH `/v1/wallets/:id` - Update spending policy
- [ ] POST `/v1/wallets/:id/fund` - Fund wallet
- [ ] Currency validation (USDC/EURC only)
- [ ] Test all endpoints

#### Day 5: x402 Payment Execution (Story 18.3)
- [ ] Create `apps/api/src/services/x402-payment-executor.ts`
- [ ] POST `/v1/x402/pay` - Execute payment
- [ ] Spending policy checks:
  - [ ] Approved vendors
  - [ ] Daily/monthly limits
  - [ ] Approval threshold
- [ ] Create transfer (type='x402')
- [ ] Update wallet balances
- [ ] Update spending_policy.daily_spent/monthly_spent
- [ ] Generate payment_proof
- [ ] Test all policy violations

---

### Phase 2: UI Dashboards (Week 3)

#### Day 1: x402 Endpoints UI (Story 17.6)
- [ ] `payos-ui/src/pages/X402EndpointsPage.tsx`
- [ ] `payos-ui/src/hooks/api/useX402Endpoints.ts`
- [ ] Endpoint list with status
- [ ] Register endpoint modal
- [ ] Revenue & call count stats
- [ ] Integration instructions modal

#### Day 2-3: Wallets UI (Story 18.5)
- [ ] `payos-ui/src/pages/WalletsPage.tsx`
- [ ] `payos-ui/src/pages/WalletDetailPage.tsx`
- [ ] `payos-ui/src/hooks/api/useWallets.ts`
- [ ] Wallet list with filters
- [ ] Spending limit progress bars
- [ ] Create wallet modal
- [ ] Fund wallet modal
- [ ] Edit spending policy modal

#### Day 4: Wallet Analytics
- [ ] Transaction history (from transfers where type='x402')
- [ ] Top vendors chart
- [ ] Top categories chart
- [ ] 7-day spending trend

#### Day 5: Polish & Testing
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Navigation flow
- [ ] Bug fixes

---

### Phase 3: Seed Data & Demo (Week 4)

#### Day 1: Seed Data Scripts
- [ ] `apps/api/scripts/seed-x402-endpoints.ts`
- [ ] `apps/api/scripts/seed-wallets.ts`
- [ ] `apps/api/scripts/seed-x402-transfers.ts`
- [ ] Generate 5-10 endpoints per tenant
- [ ] Generate 3-5 wallets per tenant
- [ ] Generate 100+ x402 transfers (last 30 days)
- [ ] Add to `pnpm seed:all`

#### Day 2: Demo Scenarios
- [ ] Document demo flow
- [ ] Create test accounts
- [ ] Script scenario 1: Register endpoint
- [ ] Script scenario 2: Agent payment
- [ ] Script scenario 3: Monitor spending

#### Day 3: External Testing
- [ ] Create external test guide
- [ ] Agent registration flow
- [ ] API provider registration flow
- [ ] End-to-end payment flow
- [ ] Document results

#### Day 4: SDK Preparation (Phase 1)
- [ ] Define SDK interfaces
- [ ] Consumer SDK stub (JavaScript)
- [ ] Producer SDK stub (JavaScript)
- [ ] Integration examples
- [ ] Document for Epic 17.5

#### Day 5: Final Testing & Documentation
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security review
- [ ] Update PRD
- [ ] Create `EPIC_17_18_COMPLETE.md`

---

## 🎬 Demo Scenarios

### Scenario 1: API Provider Monetization
```
1. Acme Corp logs in
2. Navigate to "x402 Endpoints"
3. Click "Register Endpoint"
4. Fill form:
   - Name: "LATAM Compliance Check"
   - Path: "/api/compliance/check"
   - Method: POST
   - Price: $0.25
   - Currency: USDC
5. Submit → Endpoint created
6. View integration instructions
7. Copy endpoint ID and payment address
```

### Scenario 2: Agent Autonomous Payment
```
1. Business logs in
2. Navigate to "Wallets"
3. Click "Create Wallet"
4. Fill form:
   - Owner: Acme Corp
   - Managed by: Compliance Agent
   - Daily limit: $100
   - Monthly limit: $2,000
   - Approved vendors: ["api.acme.com"]
5. Submit → Wallet created
6. Fund wallet: $500
7. Agent makes x402 payment:
   - POST /v1/x402/pay
   - amount: $0.25
   - Policy checks pass
   - Transfer created (type='x402')
   - Payment proof returned
8. View transaction in wallet detail
```

### Scenario 3: Spending Analytics
```
1. Navigate to Wallet Detail
2. View balance: $499.75 (after payment)
3. View spending limits:
   - Daily: $0.25 / $100 (0.25%)
   - Monthly: $0.25 / $2,000 (0.01%)
4. View recent transactions (last 20)
5. View top vendors chart
6. View spending trend (7 days)
```

---

## 🧪 External Testing Checklist

### Agent Registration & Payment
- [ ] Agent signs up for wallet
- [ ] Agent receives wallet address
- [ ] Agent funds wallet
- [ ] Agent discovers paid API (402 response)
- [ ] Agent makes payment via SDK
- [ ] Agent receives API response
- [ ] Agent views transaction history

### API Provider Registration
- [ ] Provider registers endpoint
- [ ] Provider receives payment address
- [ ] Provider integrates middleware
- [ ] Provider tests 402 response
- [ ] Provider verifies payment
- [ ] Provider receives revenue
- [ ] Provider views analytics

### End-to-End Flow
- [ ] External agent → 402 response
- [ ] External agent → Payment
- [ ] PayOS verification
- [ ] Provider confirmation
- [ ] API response delivered
- [ ] Both parties see transaction

---

## 📦 Deliverables

### Week 1-2: Core Infrastructure
- ✅ 4 database migrations applied
- ✅ 13 API endpoints implemented
- ✅ x402 payment execution working
- ✅ Spending policy enforcement
- ✅ All tests passing

### Week 3: UI Dashboards
- ✅ x402 Endpoints page
- ✅ Wallets page
- ✅ Wallet detail page
- ✅ All modals and forms
- ✅ Analytics charts

### Week 4: Demo & Testing
- ✅ Seed data scripts
- ✅ Demo scenarios documented
- ✅ External testing completed
- ✅ SDK stubs created
- ✅ Epic completion doc

---

## 🚀 Success Criteria

### Technical
- [ ] All P0 API endpoints working
- [ ] All database tables with proper RLS
- [ ] All UI dashboards functional
- [ ] Zero linter errors
- [ ] Spending policy enforced correctly
- [ ] Stablecoin-only validation working

### Demo Quality
- [ ] Register endpoint in < 2 minutes
- [ ] Create wallet in < 2 minutes
- [ ] Payment executes in < 1 second
- [ ] Dashboard shows real-time data
- [ ] Demo flows without bugs

### External Testing
- [ ] Agent can register wallet externally
- [ ] API provider can register endpoint externally
- [ ] End-to-end payment flow works
- [ ] SDK stubs are usable
- [ ] Documentation is clear

---

## 🔜 Next Epic: Epic 20 (After Epic 17+18)

**After successful testing of Epic 17+18, we will proceed to:**

**Epic 20: Streaming Payments & Agent Registry** (18 points)
- Story 20.1: Streaming Payments API (5 pts)
- Story 20.2: Streaming Dashboard UI (3 pts)
- Story 20.3: Agent Registry API (5 pts)
- Story 20.4: Agent Discovery Dashboard (3 pts)
- Story 20.5: Python SDK (2 pts)

---

## ⚠️ Deferred to Separate Epics

### Future Epic: Real Blockchain Integration
- Circle USDC integration
- Alchemy/Infura for on-chain verification
- Real wallet addresses
- EIP-712 signature verification
- Base, Ethereum, Solana support

### Future Epic: PayOS x402 Services (Epic 19)
- Compliance Check API
- FX Intelligence API
- Payment Routing API
- Treasury Analysis API

---

## 📝 Current Status

**Phase:** Day 1 - Database Migrations
**Progress:** Creating migrations now
**Next:** Apply migrations and test

---

**Let's build! 🚀**

