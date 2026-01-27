# PayOS Sample Apps - Testing Guide

Complete E2E test suite for validating all scenarios in the AP2 and ACP sample apps.

## User Tenant

All tests are executed for:
- **Email**: haxaco@gmail.com
- **Account ID**: acct_haxaco_test

## Test Coverage

### AP2 Subscription Tests (10 scenarios)

1. **Monthly Subscription Setup**
   - Create $50 mandate
   - Validate authorization limits
   - Verify metadata and expiration

2. **Week 1 Payment**
   - Execute $8 payment
   - Validate deduction from remaining amount
   - Check execution count increment

3. **Week 2 Payment**
   - Execute $12 payment
   - Validate cumulative usage ($20 total)
   - Verify remaining amount ($30)

4. **Mandate Status Check**
   - Retrieve mandate details
   - Validate execution history
   - Check all financial metrics

5. **Exceeding Authorization**
   - Attempt $35 payment (only $30 remaining)
   - Verify rejection
   - Validate error handling

6. **User Mandate Listing**
   - List all user mandates
   - Filter by status
   - Verify tenant isolation

7. **Subscription Analytics**
   - Retrieve 30-day analytics
   - Validate revenue metrics
   - Check utilization rates

8. **Cancel Subscription**
   - Cancel active mandate
   - Verify status change
   - Check cancellation timestamp

9. **Post-Cancellation**
   - Attempt payment on cancelled mandate
   - Verify rejection
   - Validate final state

10. **Complete Lifecycle**
    - Validate end-to-end flow
    - Summary of all operations
    - Tenant validation

### ACP E-commerce Tests (9 scenarios)

1. **Multi-Item Checkout**
   - Create checkout with 2 items
   - Apply tax ($5.50) and discount ($10)
   - Validate total ($105.50)

2. **Checkout Details**
   - Retrieve complete checkout
   - Verify all items
   - Check pricing calculations

3. **Pending Checkouts**
   - List user's pending checkouts
   - Filter by status
   - Verify tenant isolation

4. **Complete Checkout**
   - Process payment with SPT
   - Verify transfer creation
   - Check status change

5. **Create & Cancel**
   - Create second checkout ($10)
   - Cancel (cart abandonment)
   - Verify cancellation

6. **Expired Checkout**
   - Create checkout with past expiration
   - Attempt completion
   - Verify rejection

7. **E-commerce Analytics**
   - Retrieve 7-day analytics
   - Validate AOV, revenue
   - Check merchant/agent metrics

8. **Complete Lifecycle**
   - Validate end-to-end flow
   - Summary of all operations

9. **Tenant Validation**
   - Verify all operations used correct tenant
   - Check account isolation
   - Validate email association

## Running Tests

### Prerequisites

```bash
# Install dependencies
cd examples
pnpm install

# Set up environment (if not using sandbox defaults)
export PAYOS_API_KEY=payos_sandbox_test
export PAYOS_ENVIRONMENT=sandbox
```

### Run All Tests

```bash
# Run complete test suite with report generation
cd examples
pnpm test

# This will:
# 1. Run AP2 subscription tests
# 2. Run ACP e-commerce tests
# 3. Generate comprehensive report
# 4. Save to TEST_REPORT.md
```

### Run Individual Test Suites

```bash
# AP2 tests only
pnpm test:ap2

# ACP tests only
pnpm test:acp
```

### Run Tests in Watch Mode

```bash
# AP2 watch mode
cd ap2-subscription
pnpm test:watch

# ACP watch mode
cd acp-ecommerce
pnpm test:watch
```

## Test Output

### Console Output

```
🚀 PayOS Sample Apps - E2E Test Suite
======================================
User Tenant: haxaco@gmail.com
Environment: Sandbox

🧪 Running AP2 Subscription tests...
✅ Scenario 1 PASS: Mandate created successfully
✅ Scenario 2 PASS: Week 1 payment executed
✅ Scenario 3 PASS: Week 2 payment executed
...
✅ AP2 tests passed: 10/10

🧪 Running ACP E-commerce tests...
✅ Scenario 1 PASS: Multi-item checkout created
✅ Scenario 2 PASS: Checkout details verified
...
✅ ACP tests passed: 9/9

📊 Generating test report...
✅ Report saved to: examples/TEST_REPORT.md

==================================================
📊 FINAL RESULTS
==================================================
Total Tests: 19
Passed: 19 ✅
Failed: 0
Success Rate: 100.0%
==================================================
```

### Generated Report

A markdown report is generated at `examples/TEST_REPORT.md` with:

- **Executive Summary**: Pass/fail rates, duration
- **Test Suites**: Individual suite results
- **Scenarios**: All validated scenarios
- **Detailed Output**: Full test output
- **User Tenant**: Validation of tenant isolation
- **Key Metrics**: Financial and operational metrics

## Test Structure

### AP2 Test File
`examples/ap2-subscription/src/index.test.ts`

- Uses Vitest framework
- Mocks API responses (sandbox mode)
- Validates all mandate lifecycle events
- Checks authorization limits
- Verifies analytics

### ACP Test File
`examples/acp-ecommerce/src/index.test.ts`

- Uses Vitest framework
- Mocks API responses (sandbox mode)
- Validates checkout lifecycle
- Checks pricing calculations
- Verifies analytics

### Test Runner
`examples/test-runner.ts`

- Orchestrates all test suites
- Generates comprehensive report
- Validates user tenant
- Provides summary statistics

## Assertions

Each test includes comprehensive assertions:

### AP2 Assertions
- Mandate creation (ID, amounts, status)
- Payment execution (transfers, remaining amounts)
- Status retrieval (execution history)
- Limit enforcement (rejections)
- Analytics (revenue, utilization)
- Cancellation (status changes)

### ACP Assertions
- Checkout creation (items, totals)
- Details retrieval (all fields)
- Listing (filtering, pagination)
- Completion (transfer creation)
- Cancellation (status changes)
- Analytics (AOV, revenue)

## Validation Criteria

✅ All tests must pass  
✅ User tenant must be haxaco@gmail.com  
✅ All financial calculations must be correct  
✅ All status transitions must be valid  
✅ All error cases must be handled  
✅ Analytics must be accurate  
✅ Tenant isolation must be verified  

## Troubleshooting

### Tests Fail to Run

```bash
# Check dependencies
pnpm install

# Verify SDK is built
cd ../../packages/sdk
pnpm build

# Run tests with debug output
pnpm test -- --reporter=verbose
```

### API Errors

```bash
# Verify environment
echo $PAYOS_API_KEY
echo $PAYOS_ENVIRONMENT

# Test API connectivity
curl http://localhost:4000/health

# Check API logs
cd ../../apps/api
pnpm logs
```

### Test Failures

1. Check the test report for details
2. Run individual suite to isolate
3. Enable verbose output
4. Check API responses
5. Verify tenant configuration

## CI/CD Integration

### GitHub Actions

```yaml
name: Sample Apps E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      - run: pnpm install
      - run: pnpm test
        working-directory: examples
        env:
          PAYOS_API_KEY: ${{ secrets.PAYOS_SANDBOX_KEY }}
          PAYOS_ENVIRONMENT: sandbox
      
      - uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: examples/TEST_REPORT.md
```

## Continuous Testing

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
cd examples && pnpm test
```

### Pre-push Hook

```bash
# .husky/pre-push
#!/bin/sh
cd examples && pnpm test:all
```

## Performance Benchmarks

Expected test durations:
- AP2 tests: ~2-3 seconds
- ACP tests: ~2-3 seconds
- Total suite: ~5-7 seconds

## Coverage Goals

- ✅ **Scenario Coverage**: 100% (19/19 scenarios)
- ✅ **User Flows**: 100% (all key flows tested)
- ✅ **Error Cases**: 100% (all error paths tested)
- ✅ **Analytics**: 100% (all metrics validated)

## Next Steps

After running tests:

1. Review `TEST_REPORT.md` for results
2. Check any failures in detail
3. Validate tenant isolation
4. Verify financial calculations
5. Check analytics accuracy
6. Deploy with confidence! 🚀

---

**User Tenant**: haxaco@gmail.com  
**Test Framework**: Vitest  
**SDK Version**: @sly/sdk v0.1.0  
**Report Format**: Markdown  
**Coverage**: 19 scenarios across 2 sample apps

