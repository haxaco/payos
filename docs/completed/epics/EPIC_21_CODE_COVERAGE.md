# Epic 21: Code Coverage Improvement

**Status:** 📋 Planned  
**Priority:** Medium  
**Estimated Effort:** 3-4 weeks  
**Current Coverage:** 15.8% (Statements), 12.12% (Branches), 16.35% (Functions)  
**Target Coverage:** 70%+ (Statements), 60%+ (Branches), 65%+ (Functions)  

---

## 🎯 **Goal**

Improve code coverage from **15.8% to 70%+** by systematically adding unit and integration tests for all critical routes, services, and utilities. Focus on high-impact areas first (transfers, accounts, balances) then expand to comprehensive coverage.

---

## 📊 **Current State Analysis**

### **Coverage Breakdown (Unit Tests Only)**

| Category | Statements | Branches | Functions | Lines | Status |
|----------|-----------|----------|-----------|-------|--------|
| **Overall** | 15.58% | 12.12% | 16.35% | 15.8% | 🔴 Critical |
| `src/app.ts` | 97.56% | 66.66% | 66.66% | 97.5% | ✅ Excellent |
| `src/services/streams.ts` | 83.33% | 70.58% | 77.77% | 84.09% | ✅ Good |
| `src/utils/helpers.ts` | 69.23% | 67.59% | 90% | 73.91% | ✅ Good |
| `src/routes/disputes.ts` | 48.54% | 30.55% | 36.84% | 50.25% | 🟡 Medium |
| `src/middleware/auth.ts` | 40.35% | 45.74% | 80% | 40.35% | 🟡 Medium |
| `src/routes/reports.ts` | 21.68% | 20% | 20% | 23.07% | 🔴 Low |
| `src/routes/accounts.ts` | 17.73% | 6.25% | 13.04% | 18.45% | 🔴 Low |
| `src/routes/agents.ts` | 12.08% | 2.14% | 15.38% | 12.23% | 🔴 Low |
| `src/routes/transfers.ts` | 5.3% | 0% | 0% | 5.35% | 🔴 Critical |
| `src/services/balances.ts` | 0% | 0% | 0% | 0% | 🔴 Critical |
| `src/services/sessions.ts` | 0% | 0% | 0% | 0% | 🔴 Critical |
| `src/services/limits.ts` | 0% | 0% | 0% | 0% | 🔴 Critical |
| `src/db/client.ts` | 0% | 0% | 0% | 0% | 🔴 Critical |

---

## 📋 **Stories & Tasks**

### **Phase 1: Critical Services (Week 1)** - 24 points

#### **Story 21.1: Balance Service Tests** (8 points)
**Priority:** 🔴 Critical  
**Current Coverage:** 0%  
**Target Coverage:** 80%+

**Tasks:**
- [ ] Test `transfer()` - successful transfers
- [ ] Test `transfer()` - insufficient balance errors
- [ ] Test `transfer()` - account not found errors
- [ ] Test `getBalance()` - all account types
- [ ] Test `reserveBalance()` - stream reservations
- [ ] Test `releaseBalance()` - stream releases
- [ ] Test `updateBalance()` - balance updates
- [ ] Test error handling - invalid amounts, negative balances
- [ ] Test concurrent balance operations
- [ ] Test balance calculations for multi-currency

**Acceptance Criteria:**
- ✅ 80%+ statement coverage
- ✅ All error paths tested
- ✅ Edge cases covered (negative, zero, large amounts)
- ✅ Concurrent operation safety verified

---

#### **Story 21.2: Session Service Tests** (8 points)
**Priority:** 🔴 Critical  
**Current Coverage:** 0%  
**Target Coverage:** 75%+

**Tasks:**
- [ ] Test `createSession()` - successful creation
- [ ] Test `createSession()` - invalid user/tenant
- [ ] Test `refreshSession()` - valid refresh tokens
- [ ] Test `refreshSession()` - expired/invalid tokens
- [ ] Test `revokeSession()` - single session
- [ ] Test `revokeAllSessions()` - all user sessions
- [ ] Test `getActiveSessions()` - filtering and pagination
- [ ] Test session expiration logic
- [ ] Test session security (IP, user agent tracking)
- [ ] Test concurrent session operations

**Acceptance Criteria:**
- ✅ 75%+ statement coverage
- ✅ All authentication flows tested
- ✅ Security edge cases covered
- ✅ Token refresh logic fully tested

---

#### **Story 21.3: Limits Service Tests** (8 points)
**Priority:** 🔴 Critical  
**Current Coverage:** 0%  
**Target Coverage:** 75%+

**Tasks:**
- [ ] Test `checkLimit()` - per-transaction limits
- [ ] Test `checkLimit()` - daily limits
- [ ] Test `checkLimit()` - monthly limits
- [ ] Test `checkLimit()` - limit exceeded errors
- [ ] Test `getEffectiveLimits()` - account + agent limits
- [ ] Test `getEffectiveLimits()` - parent account limits
- [ ] Test limit reset logic (daily/monthly)
- [ ] Test limit calculations for different account types
- [ ] Test concurrent limit checks
- [ ] Test limit enforcement across currencies

**Acceptance Criteria:**
- ✅ 75%+ statement coverage
- ✅ All limit types tested
- ✅ Edge cases covered (zero limits, unlimited)
- ✅ Concurrent operations tested

---

### **Phase 2: Core Routes (Week 2)** - 32 points

#### **Story 21.4: Transfers Route Tests** (13 points)
**Priority:** 🔴 Critical  
**Current Coverage:** 5.3%  
**Target Coverage:** 70%+

**Tasks:**
- [ ] Test `POST /v1/transfers` - successful external transfer
- [ ] Test `POST /v1/transfers` - validation errors (invalid UUID, amount, etc.)
- [ ] Test `POST /v1/transfers` - insufficient balance
- [ ] Test `POST /v1/transfers` - account not found
- [ ] Test `POST /v1/transfers` - limit exceeded
- [ ] Test `GET /v1/transfers` - list with filters (status, account, date range)
- [ ] Test `GET /v1/transfers` - pagination
- [ ] Test `GET /v1/transfers/:id` - successful fetch
- [ ] Test `GET /v1/transfers/:id` - not found
- [ ] Test `POST /v1/transfers/:id/cancel` - cancellation logic
- [ ] Test `POST /v1/transfers/:id/cancel` - already completed error
- [ ] Test transfer state machine (pending → processing → completed)
- [ ] Test transfer state machine (pending → failed)
- [ ] Test fee calculations
- [ ] Test multi-currency transfers
- [ ] Test compliance flag integration

**Acceptance Criteria:**
- ✅ 70%+ statement coverage
- ✅ All CRUD operations tested
- ✅ All validation paths tested
- ✅ State transitions verified
- ✅ Error handling comprehensive

---

#### **Story 21.5: Accounts Route Tests** (10 points)
**Priority:** 🔴 High  
**Current Coverage:** 17.73%  
**Target Coverage:** 65%+

**Tasks:**
- [ ] Test `GET /v1/accounts` - list with filters (type, status, search)
- [ ] Test `GET /v1/accounts` - pagination
- [ ] Test `GET /v1/accounts/:id` - successful fetch
- [ ] Test `GET /v1/accounts/:id` - not found
- [ ] Test `POST /v1/accounts` - create person account
- [ ] Test `POST /v1/accounts` - create business account
- [ ] Test `POST /v1/accounts` - validation errors
- [ ] Test `PATCH /v1/accounts/:id` - update account
- [ ] Test `GET /v1/accounts/:id/balance` - balance retrieval
- [ ] Test `GET /v1/accounts/:id/agents` - agent listing
- [ ] Test `GET /v1/accounts/:id/streams` - stream listing
- [ ] Test account verification status updates
- [ ] Test account type-specific logic
- [ ] Test multi-currency account handling

**Acceptance Criteria:**
- ✅ 65%+ statement coverage
- ✅ All CRUD operations tested
- ✅ Account type variations covered
- ✅ Related resources (agents, streams) tested

---

#### **Story 21.6: Agents Route Tests** (9 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 12.08%  
**Target Coverage:** 60%+

**Tasks:**
- [ ] Test `GET /v1/agents` - list with filters
- [ ] Test `GET /v1/agents/:id` - successful fetch
- [ ] Test `POST /v1/agents` - create agent
- [ ] Test `POST /v1/agents` - validation errors
- [ ] Test `PATCH /v1/agents/:id` - update agent
- [ ] Test `DELETE /v1/agents/:id` - delete agent
- [ ] Test agent limit calculations
- [ ] Test agent permissions validation
- [ ] Test agent type-specific logic (payment, treasury, compliance)
- [ ] Test agent authentication (API key, OAuth, x402)
- [ ] Test agent parent account relationships

**Acceptance Criteria:**
- ✅ 60%+ statement coverage
- ✅ All CRUD operations tested
- ✅ Agent types and permissions covered
- ✅ Limit calculations verified

---

### **Phase 3: Supporting Routes (Week 3)** - 24 points

#### **Story 21.7: Reports Route Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 21.68%  
**Target Coverage:** 60%+

**Tasks:**
- [ ] Test `GET /v1/reports/dashboard/summary` - successful fetch
- [ ] Test `GET /v1/reports/dashboard/summary` - empty data handling
- [ ] Test `GET /v1/reports/treasury/summary` - successful fetch
- [ ] Test `GET /v1/reports/treasury/summary` - multi-currency
- [ ] Test `GET /v1/reports/summary` - legacy endpoint
- [ ] Test `GET /v1/reports/summary` - period validation
- [ ] Test `POST /v1/reports` - report generation
- [ ] Test `POST /v1/reports` - validation errors
- [ ] Test database function error handling
- [ ] Test aggregation edge cases (no data, single record)

**Acceptance Criteria:**
- ✅ 60%+ statement coverage
- ✅ All endpoints tested
- ✅ Error handling verified
- ✅ Edge cases covered

---

#### **Story 21.8: Payment Methods Route Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 11.19%  
**Target Coverage:** 60%+

**Tasks:**
- [ ] Test `GET /v1/accounts/:id/payment-methods` - list methods
- [ ] Test `POST /v1/accounts/:id/payment-methods` - create card
- [ ] Test `POST /v1/accounts/:id/payment-methods` - create bank account
- [ ] Test `PATCH /v1/payment-methods/:id` - update method
- [ ] Test `DELETE /v1/payment-methods/:id` - delete method
- [ ] Test payment method verification
- [ ] Test payment method validation (card numbers, IBAN, etc.)
- [ ] Test payment method status updates
- [ ] Test account relationship validation

**Acceptance Criteria:**
- ✅ 60%+ statement coverage
- ✅ All payment method types tested
- ✅ Validation logic verified
- ✅ Account relationships tested

---

#### **Story 21.9: Streams Route Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 10.21%  
**Target Coverage:** 60%+

**Tasks:**
- [ ] Test `GET /v1/streams` - list with filters
- [ ] Test `POST /v1/streams` - create stream
- [ ] Test `POST /v1/streams` - validation errors
- [ ] Test `PATCH /v1/streams/:id` - update stream
- [ ] Test `POST /v1/streams/:id/pause` - pause stream
- [ ] Test `POST /v1/streams/:id/resume` - resume stream
- [ ] Test `POST /v1/streams/:id/cancel` - cancel stream
- [ ] Test stream flow rate calculations
- [ ] Test stream balance reservations
- [ ] Test stream status transitions

**Acceptance Criteria:**
- ✅ 60%+ statement coverage
- ✅ All stream operations tested
- ✅ State transitions verified
- ✅ Balance logic tested

---

### **Phase 4: Utilities & Middleware (Week 4)** - 16 points

#### **Story 21.10: Middleware Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 36.44%  
**Target Coverage:** 70%+

**Tasks:**
- [ ] Test `auth.ts` - API key authentication
- [ ] Test `auth.ts` - JWT authentication
- [ ] Test `auth.ts` - token refresh
- [ ] Test `auth.ts` - invalid token handling
- [ ] Test `auth.ts` - tenant isolation
- [ ] Test `rate-limit.ts` - rate limiting logic
- [ ] Test `rate-limit.ts` - rate limit exceeded
- [ ] Test `security.ts` - request ID generation
- [ ] Test `security.ts` - security headers
- [ ] Test `error.ts` - error handler for all error types
- [ ] Test `error.ts` - Supabase error mapping
- [ ] Test middleware error propagation

**Acceptance Criteria:**
- ✅ 70%+ statement coverage
- ✅ All authentication flows tested
- ✅ Rate limiting verified
- ✅ Error handling comprehensive

---

#### **Story 21.11: Utility Functions Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 27.95%  
**Target Coverage:** 75%+

**Tasks:**
- [ ] Test `helpers.ts` - UUID validation
- [ ] Test `helpers.ts` - pagination helpers
- [ ] Test `helpers.ts` - date formatting
- [ ] Test `helpers.ts` - data mapping functions
- [ ] Test `crypto.ts` - API key hashing
- [ ] Test `crypto.ts` - API key verification
- [ ] Test `crypto.ts` - key prefix extraction
- [ ] Test `auth.ts` - audit logging
- [ ] Test `auth.ts` - security event logging
- [ ] Test edge cases for all utilities
- [ ] Test error handling in utilities

**Acceptance Criteria:**
- ✅ 75%+ statement coverage
- ✅ All utility functions tested
- ✅ Edge cases covered
- ✅ Error handling verified

---

### **Phase 5: Database & Integration (Ongoing)** - 16 points

#### **Story 21.12: Database Client Tests** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** 0%  
**Target Coverage:** 60%+

**Tasks:**
- [ ] Test `client.ts` - Supabase client creation
- [ ] Test `client.ts` - connection error handling
- [ ] Test `admin-client.ts` - admin operations
- [ ] Test database query error handling
- [ ] Test RLS policy enforcement
- [ ] Test transaction handling
- [ ] Test connection pooling
- [ ] Test retry logic

**Acceptance Criteria:**
- ✅ 60%+ statement coverage
- ✅ Connection handling tested
- ✅ Error scenarios covered
- ✅ Admin operations verified

---

#### **Story 21.13: Integration Test Coverage** (8 points)
**Priority:** 🟡 Medium  
**Current Coverage:** Unknown  
**Target Coverage:** 50%+

**Tasks:**
- [ ] Fix existing integration test failures
- [ ] Add integration tests for critical flows
- [ ] Test multi-tenant isolation
- [ ] Test end-to-end transfer flow
- [ ] Test end-to-end account creation
- [ ] Test session management flows
- [ ] Test authentication flows
- [ ] Test error propagation across services

**Acceptance Criteria:**
- ✅ All integration tests passing
- ✅ Critical flows covered
- ✅ Multi-tenant isolation verified
- ✅ End-to-end scenarios tested

---

## 🎯 **Success Criteria**

### **Coverage Targets**
- ✅ **Overall Statement Coverage:** 70%+ (from 15.58%)
- ✅ **Overall Branch Coverage:** 60%+ (from 12.12%)
- ✅ **Overall Function Coverage:** 65%+ (from 16.35%)
- ✅ **Overall Line Coverage:** 70%+ (from 15.8%)

### **Quality Targets**
- ✅ All critical services (balances, sessions, limits): 75%+
- ✅ All core routes (transfers, accounts, agents): 65%+
- ✅ All middleware: 70%+
- ✅ All utilities: 75%+
- ✅ Zero untested critical paths

### **Process Targets**
- ✅ Coverage reports generated on every PR
- ✅ Coverage thresholds enforced in CI/CD
- ✅ Coverage badges in README
- ✅ Regular coverage reviews (monthly)

---

## 📈 **Implementation Strategy**

### **Approach**
1. **Bottom-Up:** Start with services (foundation), then routes (API layer)
2. **High-Impact First:** Focus on critical paths (transfers, balances)
3. **Incremental:** Add tests in small, reviewable chunks
4. **Comprehensive:** Test happy paths, error paths, and edge cases

### **Testing Patterns**
- **Unit Tests:** Mock external dependencies (Supabase, services)
- **Integration Tests:** Use test database for real interactions
- **Test Data:** Use factories/fixtures for consistent test data
- **Test Organization:** Group by feature/route, not by test type

### **Mock Strategy**
- **Supabase Client:** Comprehensive mocks for all table operations
- **Services:** Mock service dependencies, test service logic
- **External APIs:** Mock all external API calls
- **Database Functions:** Mock RPC calls or use test database

---

## 🔧 **Technical Requirements**

### **Test Infrastructure**
- ✅ Vitest configured with coverage
- ✅ Mock factories for common entities
- ✅ Test database setup/teardown
- ✅ Coverage reporting (text, JSON, HTML)
- ✅ CI/CD integration

### **Code Quality**
- ✅ Tests follow AAA pattern (Arrange, Act, Assert)
- ✅ Tests are independent and isolated
- ✅ Tests have clear, descriptive names
- ✅ Tests cover edge cases and error paths
- ✅ No flaky tests

### **Documentation**
- ✅ Test coverage documented in README
- ✅ Coverage reports accessible (HTML)
- ✅ Testing guidelines documented
- ✅ Mock patterns documented

---

## 📊 **Progress Tracking**

### **Metrics to Track**
- Overall coverage percentage (statements, branches, functions, lines)
- Coverage by file/category
- Number of tests added
- Test execution time
- Flaky test count

### **Milestones**
- [ ] **Week 1:** Critical services at 75%+ coverage
- [ ] **Week 2:** Core routes at 65%+ coverage
- [ ] **Week 3:** Supporting routes at 60%+ coverage
- [ ] **Week 4:** Utilities & middleware at 70%+ coverage
- [ ] **Ongoing:** Integration tests and database coverage

---

## 🚀 **Quick Wins (Can Start Immediately)**

1. **Add tests for `src/db/client.ts`** (0% → 60%+) - 2 hours
2. **Add tests for `src/services/balances.ts`** (0% → 80%+) - 1 day
3. **Add tests for `src/routes/transfers.ts`** (5% → 70%+) - 2 days
4. **Improve `src/middleware/auth.ts`** (40% → 70%+) - 1 day
5. **Add tests for `src/utils/crypto.ts`** (11% → 75%+) - 4 hours

**Estimated Quick Wins Impact:** +15-20% overall coverage

---

## 📝 **Notes**

- **Current Test Count:** 80 unit tests passing
- **Target Test Count:** 300+ unit tests
- **Integration Tests:** 7 failing, need fixing
- **Coverage Tool:** Vitest with v8 provider
- **Coverage Reports:** Generated in `coverage/` directory

---

## 🔗 **Related Epics**

- **Epic 0:** UI Data Completion (recently completed)
- **Epic 16:** Database Security (may need test coverage)
- **Epic 8:** AI Insights (will need new tests)

---

## ✅ **Definition of Done**

For each story:
- [ ] All tests written and passing
- [ ] Coverage target met for that component
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Code reviewed and approved
- [ ] Coverage report updated
- [ ] Documentation updated if needed

---

**Created:** December 18, 2025  
**Last Updated:** December 18, 2025  
**Owner:** Development Team  
**Status:** 📋 Ready to Start


