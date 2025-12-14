# Multi-Tenancy Testing Guide

**Date:** 2025-12-14  
**Purpose:** Validate data isolation between tenants in PayOS

---

## Overview

PayOS uses API key-based multi-tenancy. Each tenant (partner fintech) has their own API key, and all data is scoped to that tenant. This guide covers how to test and validate tenant data isolation.

## Current Tenants

| Tenant | API Key | Accounts |
|--------|---------|----------|
| **Demo Fintech** | `pk_test_demo_fintech_key_12345` | 20 |
| **Competitor Corp** | `pk_test_competitor_key_99999` | 1 |

---

## Testing Approach

### Option 1: API-Level Testing (Recommended)

Test multi-tenancy directly via API calls with different API keys.

#### Step 1: Test Demo Fintech (Primary Tenant)

```bash
# List accounts for Demo Fintech
curl -X GET "http://localhost:4000/v1/accounts" \
  -H "Authorization: Bearer pk_test_demo_fintech_key_12345" \
  -H "Content-Type: application/json"
```

**Expected:** Returns ~20 accounts (Maria Garcia, TechCorp, etc.)

#### Step 2: Test Competitor Corp (Secondary Tenant)

```bash
# List accounts for Competitor Corp
curl -X GET "http://localhost:4000/v1/accounts" \
  -H "Authorization: Bearer pk_test_competitor_key_99999" \
  -H "Content-Type: application/json"
```

**Expected:** Returns only 1 account (Competitor Corp's data)

#### Step 3: Verify Data Isolation

```bash
# Try to access Demo Fintech's account with Competitor Corp's key
# Using a known Demo Fintech account ID
curl -X GET "http://localhost:4000/v1/accounts/bbbbbbbb-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer pk_test_competitor_key_99999" \
  -H "Content-Type: application/json"
```

**Expected:** Returns 404 (Not Found) - the account exists but is not visible to this tenant

---

### Option 2: UI Testing with Tenant Switcher

The UI (`payos-ui`) currently uses mock data. To test multi-tenancy in the UI:

#### Quick Implementation

Add a tenant context switcher to the TopBar:

```typescript
// In TopBar.tsx, add a tenant selector dropdown
const tenants = [
  { id: 'demo', name: 'Demo Fintech', apiKey: 'pk_test_demo_fintech_key_12345' },
  { id: 'competitor', name: 'Competitor Corp', apiKey: 'pk_test_competitor_key_99999' },
];
```

Then filter data based on selected tenant.

---

## Comprehensive Test Scenarios

### Scenario A: Account Visibility

| Action | Demo Fintech | Competitor Corp |
|--------|--------------|-----------------|
| List accounts | 20 accounts | 1 account |
| View Maria Garcia | ✅ Visible | ❌ 404 |
| View TechCorp | ✅ Visible | ❌ 404 |

### Scenario B: Transfer Isolation

| Action | Demo Fintech | Competitor Corp |
|--------|--------------|-----------------|
| List transfers | Many | Few/None |
| Create transfer to Demo account | ✅ Works | ❌ 404 (account not found) |
| View Demo's transfers | ✅ Works | ❌ Empty/404 |

### Scenario C: Disputes Isolation

| Action | Demo Fintech | Competitor Corp |
|--------|--------------|-----------------|
| List disputes | ✅ Shows tenant disputes | ❌ Empty |
| View Demo's dispute | ✅ Works | ❌ 404 |
| Create dispute for Demo transfer | ✅ Works | ❌ 404 |

### Scenario D: Agent Isolation

| Action | Demo Fintech | Competitor Corp |
|--------|--------------|-----------------|
| List agents | Shows Demo agents | Empty |
| Agent auth token | Works for Demo agents | Fails |

---

## API Test Script

Save this as `test-multitenancy.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:4000/v1"
DEMO_KEY="pk_test_demo_fintech_key_12345"
COMP_KEY="pk_test_competitor_key_99999"

echo "=== Multi-Tenancy Test Suite ==="
echo ""

# Test 1: Account count for Demo Fintech
echo "1. Demo Fintech - Account Count"
DEMO_COUNT=$(curl -s "$API_URL/accounts?limit=1" \
  -H "Authorization: Bearer $DEMO_KEY" | jq '.pagination.total')
echo "   Expected: ~20, Got: $DEMO_COUNT"
echo ""

# Test 2: Account count for Competitor Corp
echo "2. Competitor Corp - Account Count"
COMP_COUNT=$(curl -s "$API_URL/accounts?limit=1" \
  -H "Authorization: Bearer $COMP_KEY" | jq '.pagination.total')
echo "   Expected: 1, Got: $COMP_COUNT"
echo ""

# Test 3: Cross-tenant access attempt
echo "3. Cross-Tenant Access (should fail)"
# Try to access Demo's account with Competitor's key
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_URL/accounts/bbbbbbbb-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $COMP_KEY")
echo "   Expected: 404, Got: $STATUS"
if [ "$STATUS" = "404" ]; then
  echo "   ✅ PASS - Data isolation working"
else
  echo "   ❌ FAIL - Data leak detected!"
fi
echo ""

# Test 4: Transfers isolation
echo "4. Demo Fintech - Transfer Count"
DEMO_TXN=$(curl -s "$API_URL/transfers?limit=1" \
  -H "Authorization: Bearer $DEMO_KEY" | jq '.pagination.total')
echo "   Demo transfers: $DEMO_TXN"

echo "5. Competitor Corp - Transfer Count"
COMP_TXN=$(curl -s "$API_URL/transfers?limit=1" \
  -H "Authorization: Bearer $COMP_KEY" | jq '.pagination.total')
echo "   Competitor transfers: $COMP_TXN"
echo ""

# Test 5: Disputes isolation
echo "6. Demo Fintech - Disputes"
curl -s "$API_URL/disputes?limit=1" \
  -H "Authorization: Bearer $DEMO_KEY" | jq '.pagination.total'

echo "7. Competitor Corp - Disputes"
curl -s "$API_URL/disputes?limit=1" \
  -H "Authorization: Bearer $COMP_KEY" | jq '.pagination.total'

echo ""
echo "=== Test Complete ==="
```

---

## Expected Results Summary

### Data Isolation ✅
- Each tenant can ONLY see their own data
- Cross-tenant access returns 404 (not 403) to avoid leaking existence

### Tenant-Scoped Operations
- Creating accounts adds to the authenticated tenant
- Transfers can only involve accounts within the same tenant
- Disputes are scoped to tenant's transfers

### Security Properties
- API keys are hashed in database
- No tenant can enumerate other tenants' data
- Audit logs capture tenant_id for all operations

---

## How to Add a New Tenant (For Testing)

```sql
-- Create a new tenant
INSERT INTO tenants (id, name, api_key, api_key_prefix, status)
VALUES (
  gen_random_uuid(),
  'Test Tenant 3',
  'pk_test_tenant3_key_xxxxx',
  'pk_test_tena',
  'active'
);
```

Then use the new API key to test fresh tenant with no data.

---

## Checklist for Multi-Tenancy Testing

- [ ] Demo Fintech can list their 20 accounts
- [ ] Competitor Corp can list their 1 account
- [ ] Competitor Corp cannot access Demo Fintech accounts (404)
- [ ] Demo Fintech cannot access Competitor Corp accounts (404)
- [ ] Transfers are scoped to tenant
- [ ] Disputes are scoped to tenant
- [ ] Agents are scoped to tenant
- [ ] Creating entities uses authenticated tenant_id
- [ ] Invalid API key returns 401

---

*This guide enables testing of tenant data isolation without needing a full login/logout UI flow.*

