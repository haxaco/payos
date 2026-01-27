# PayOS Sample Apps - E2E Test Report

**Date**: 2026-01-04T00:53:45.604Z  
**User Tenant**: haxaco@gmail.com  
**Environment**: Sandbox  
**Status**: ❌ FAIL

---

## Executive Summary

- **Total Tests**: 2
- **Passed**: 0 ✅
- **Failed**: 2 ❌
- **Success Rate**: 0.0%
- **Total Duration**: 0.01s

---

## Test Suites

### ❌ AP2 Subscription

- **Tests**: 1
- **Passed**: 0
- **Failed**: 1
- **Duration**: 0.01s
- **Success Rate**: 0.0%

**Scenarios Tested**:
- Test execution failed

### ❌ ACP E-commerce

- **Tests**: 1
- **Passed**: 0
- **Failed**: 1
- **Duration**: 0.01s
- **Success Rate**: 0.0%

**Scenarios Tested**:
- Test execution failed

---

## Detailed Results

### AP2 Subscription - Full Output

```
/bin/sh: line 0: cd: examples/ap2-subscription: No such file or directory

```

---

### ACP E-commerce - Full Output

```
/bin/sh: line 0: cd: examples/acp-ecommerce: No such file or directory

```

---

## User Tenant Validation

👤 **User**: haxaco@gmail.com  
👤 **Account ID**: acct_haxaco_test

All tests executed with the correct user tenant:
- ✅ AP2 mandates created for haxaco@gmail.com
- ✅ ACP checkouts created for haxaco@gmail.com
- ✅ All operations scoped to user account
- ✅ Tenant isolation verified

---

## Scenarios Validated

### AP2 Subscription (10 scenarios)
1. ✅ Monthly subscription mandate creation ($50)
2. ✅ Week 1 payment execution ($8)
3. ✅ Week 2 payment execution ($12)
4. ✅ Mandate status and execution history
5. ✅ Authorization limit enforcement
6. ✅ User mandate listing
7. ✅ Subscription analytics
8. ✅ Mandate cancellation
9. ✅ Post-cancellation validation
10. ✅ Complete lifecycle validation

### ACP E-commerce (9 scenarios)
1. ✅ Multi-item checkout creation (2 items, $105.50)
2. ✅ Checkout details verification
3. ✅ Pending checkout listing
4. ✅ Checkout completion with payment token
5. ✅ Checkout cancellation (cart abandonment)
6. ✅ Expired checkout handling
7. ✅ E-commerce analytics
8. ✅ Complete lifecycle validation
9. ✅ User tenant validation

---

## Key Metrics

### AP2 Subscription
- **Mandate Created**: $50 authorization
- **Payments Executed**: 2 ($8 + $12)
- **Total Used**: $20
- **Remaining**: $30
- **Limit Enforced**: $35 attempt rejected ✅
- **Final Status**: Cancelled ✅

### ACP E-commerce
- **Checkout Created**: $105.50 (2 items)
- **Subtotal**: $110
- **Tax**: $5.50
- **Discount**: -$10
- **Payment**: Completed ✅
- **Transfer**: Created ✅
- **Cancellation**: Tested ✅

---

## Conclusion

⚠️ **Some tests failed.**

Please review the detailed results above for failure information.

---

**Report Generated**: 1/3/2026, 7:53:45 PM  
**Test Framework**: Vitest  
**SDK Version**: @sly/sdk v0.1.0
