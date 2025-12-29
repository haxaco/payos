# Epic 21: Code Coverage Improvement 📊

**Status:** Planned
**Phase:** Ongoing
**Priority:** Medium
**Total Points:** 112
**Stories:** 0/13 Complete
**Estimated Effort:** 3-4 weeks

**Current Coverage:** 15.8% (Statements), 12.12% (Branches), 16.35% (Functions)
**Target Coverage:** 70%+ (Statements), 60%+ (Branches), 65%+ (Functions)

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Improve code coverage from **15.8% to 70%+** by systematically adding unit and integration tests for all critical routes, services, and utilities. Focus on high-impact areas first (transfers, accounts, balances) then expand to comprehensive coverage.

**For detailed implementation plan, see:** [EPIC_21_CODE_COVERAGE.md](../../EPIC_21_CODE_COVERAGE.md)

---

## Business Value

- **Quality Assurance:** Catch bugs before they reach production
- **Refactoring Confidence:** Safe code improvements with test safety net
- **Documentation:** Tests serve as living documentation
- **Developer Velocity:** Faster development with fewer regressions

---

## Stories

### Phase 1: Critical Services (Week 1) - 24 points

**Story 21.1: Balance Service Tests (8 pts)**
- Target: 80%+ coverage
- Test balance calculations
- Test concurrent updates
- Test multi-currency balances
- Test edge cases (negative, overflow)

**Story 21.2: Session Service Tests (8 pts)**
- Target: 75%+ coverage
- Test session creation and validation
- Test token refresh
- Test session expiration
- Test concurrent sessions

**Story 21.3: Limits Service Tests (8 pts)**
- Target: 75%+ coverage
- Test spending limits enforcement
- Test daily/monthly limits
- Test agent limits vs account limits
- Test limit reset logic

---

### Phase 2: Core Routes (Week 2) - 32 points

**Story 21.4: Transfers Route Tests (13 pts)**
- Target: 70%+ coverage
- Test transfer creation (all types)
- Test validation logic
- Test error handling
- Test RLS policies
- Test idempotency

**Story 21.5: Accounts Route Tests (10 pts)**
- Target: 65%+ coverage
- Test account CRUD
- Test account types
- Test KYC/KYB validation
- Test tenant isolation

**Story 21.6: Agents Route Tests (9 pts)**
- Target: 60%+ coverage
- Test agent creation
- Test permissions
- Test wallet assignment
- Test KYA tiers

---

### Phase 3: Supporting Routes (Week 3) - 24 points

**Story 21.7: Reports Route Tests (8 pts)**
- Target: 60%+ coverage
- Test report generation
- Test date range handling
- Test export formats
- Test large datasets

**Story 21.8: Payment Methods Route Tests (8 pts)**
- Target: 60%+ coverage
- Test payment method CRUD
- Test validation (PIX, CLABE, etc.)
- Test verification status
- Test default method logic

**Story 21.9: Streams Route Tests (8 pts)**
- Target: 60%+ coverage
- Test stream creation
- Test flow rate changes
- Test pause/resume
- Test termination

---

### Phase 4: Utilities & Middleware (Week 4) - 16 points

**Story 21.10: Middleware Tests (8 pts)**
- Target: 70%+ coverage
- Test auth middleware (all 3 types)
- Test rate limiting
- Test error handling
- Test security headers

**Story 21.11: Utility Functions Tests (8 pts)**
- Target: 75%+ coverage
- Test crypto helpers
- Test validators
- Test formatters
- Test date utilities

---

### Phase 5: Database & Integration (Ongoing) - 16 points

**Story 21.12: Database Client Tests (8 pts)**
- Target: 60%+ coverage
- Test connection handling
- Test query builders
- Test transaction handling
- Test error recovery

**Story 21.13: Integration Test Coverage (8 pts)**
- Target: 50%+ coverage
- Test end-to-end flows
- Test RLS policies
- Test multi-tenant isolation
- Test concurrent operations

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 21.1 Balance Service Tests | 8 | P1 | Pending |
| 21.2 Session Service Tests | 8 | P1 | Pending |
| 21.3 Limits Service Tests | 8 | P1 | Pending |
| 21.4 Transfers Route Tests | 13 | P1 | Pending |
| 21.5 Accounts Route Tests | 10 | P1 | Pending |
| 21.6 Agents Route Tests | 9 | P1 | Pending |
| 21.7 Reports Route Tests | 8 | P2 | Pending |
| 21.8 Payment Methods Route Tests | 8 | P2 | Pending |
| 21.9 Streams Route Tests | 8 | P2 | Pending |
| 21.10 Middleware Tests | 8 | P2 | Pending |
| 21.11 Utility Functions Tests | 8 | P2 | Pending |
| 21.12 Database Client Tests | 8 | P2 | Pending |
| 21.13 Integration Test Coverage | 8 | P2 | Pending |
| **Total** | **112** | | **0/13 Complete** |

---

## Success Criteria

- ✅ **Overall Statement Coverage:** 70%+ (from 15.58%)
- ✅ **Overall Branch Coverage:** 60%+ (from 12.12%)
- ✅ **Overall Function Coverage:** 65%+ (from 16.35%)
- ✅ **Overall Line Coverage:** 70%+ (from 15.8%)
- ✅ All critical services (balances, sessions, limits): 75%+
- ✅ All core routes (transfers, accounts, agents): 65%+
- ✅ All middleware: 70%+
- ✅ All utilities: 75%+
- ✅ Zero untested critical paths

---

## Implementation Plan

### Week 1: Critical Services
1. Set up coverage reporting infrastructure
2. Add balance service tests
3. Add session service tests
4. Add limits service tests
5. Review coverage reports daily

### Week 2: Core Routes
1. Add transfers route tests
2. Add accounts route tests
3. Add agents route tests
4. Update CI to track coverage trends

### Week 3: Supporting Routes
1. Add reports route tests
2. Add payment methods tests
3. Add streams route tests
4. Add coverage badges to README

### Week 4: Utilities & Polish
1. Add middleware tests
2. Add utility function tests
3. Add database client tests
4. Add integration tests
5. Final coverage review

---

## Testing Best Practices

### Unit Tests
- Test one function/method at a time
- Mock external dependencies
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests fast (<100ms)

### Integration Tests
- Test full request/response cycle
- Test RLS policies
- Test multi-tenant isolation
- Test concurrent operations
- Use real database (test instance)

### Test Structure
```typescript
describe('TransferService', () => {
  describe('createTransfer', () => {
    it('should create a valid transfer', async () => {
      // Arrange
      const input = { ... };

      // Act
      const result = await service.createTransfer(input);

      // Assert
      expect(result.status).toBe('pending');
    });

    it('should reject transfers with insufficient balance', async () => {
      // Test negative case
    });
  });
});
```

---

## Coverage Reporting

### Local Development
```bash
# Run tests with coverage
pnpm test:coverage

# Open coverage report in browser
open coverage/index.html
```

### CI/CD Integration
- Coverage tracked on every PR
- PRs blocked if coverage drops
- Weekly coverage reports
- Trend visualization

---

## Related Documentation

- **Detailed Plan:** `/docs/EPIC_21_CODE_COVERAGE.md`
- **Test Setup:** `/apps/api/tests/setup.ts`
- **Example Tests:** `/apps/api/tests/unit/helpers.test.ts`
- **CI Configuration:** `/.github/workflows/test.yml`
