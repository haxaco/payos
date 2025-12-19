# Stories 14.2 & 14.3: Implementation Plan

**Date:** December 17, 2025  
**Status:** In Progress  
**Priority:** P1 (Mock Data Elimination)  

---

## Overview

These two stories will eliminate the last remaining mock data from the PayOS UI:
- **Story 14.2:** Disputes API Integration (5 points)
- **Story 14.3:** Account Relationships API (5 points)

**Total:** 10 points (~10 hours) to achieve 100% real data in UI

---

## Story 14.2: Disputes API Integration ✅ API Complete, UI Pending

### Current Status

**API Implementation:** ✅ COMPLETE
- Disputes API fully implemented in `apps/api/src/routes/disputes.ts`
- Endpoints exist:
  - `GET /v1/disputes` - List disputes with filtering
  - `GET /v1/disputes/:id` - Get single dispute
  - `POST /v1/disputes` - Create dispute
  - `POST /v1/disputes/:id/respond` - Respond to dispute
  - `POST /v1/disputes/:id/resolve` - Resolve dispute
  - `POST /v1/disputes/:id/escalate` - Escalate dispute
  - `GET /v1/disputes/stats/summary` - Dispute statistics

**Database:** ✅ HAS PROPER FOREIGN KEYS
- `disputes` table exists (from Epic 10)
- Foreign keys:
  - `tenant_id` → `tenants(id)`
  - `transfer_id` → `transfers(id)`
  - `claimant_account_id` → `accounts(id)` (implied from code)
  - `respondent_account_id` → `accounts(id)` (implied from code)
- RLS policies enabled (Epic 15)

**UI Implementation:** 🔄 USES MOCK DATA
- `payos-ui/src/pages/DisputesPage.tsx` - Uses `mockDisputes` array (lines 12-125)
- `payos-ui/src/hooks/api/useDisputes.ts` - Partially implemented (stats only)

### Implementation Tasks

#### 1. Complete React Query Hooks ✅ DONE
- [x] Added `useDisputes(filters)` hook
- [x] Added `useDispute(id)` hook  
- [x] Added Dispute type definitions
- [x] Added filters interface

#### 2. Update DisputesPage - TODO
**File:** `payos-ui/src/pages/DisputesPage.tsx`

**Changes needed:**
```typescript
// REPLACE mock data import
- const mockDisputes = [...]

// ADD React Query
+ import { useDisputes } from '../hooks/api/useDisputes';
+ const { data: disputesResponse, isLoading, error } = useDisputes({ 
+   status: statusFilter !== 'all' ? statusFilter : undefined 
+ });
+ const disputes = disputesResponse?.data || [];

// UPDATE filteredDisputes logic
- const filteredDisputes = mockDisputes.filter(...)
+ const filteredDisputes = disputes.filter(...)

// UPDATE stats calculation
- const stats = { open: mockDisputes.filter(...) }
+ const { data: statsData } = useDisputeStats();
+ const stats = statsData?.data || { ... };

// ADD loading state
+ if (isLoading) return <LoadingSpinner />;

// ADD error handling
+ if (error) return <ErrorMessage error={error} />;
```

#### 3. Update DisputeDetail Component - TODO
**File:** Same file, `DisputeDetail` component

**Changes needed:**
```typescript
// USE real dispute data from useDispute hook
+ const { data: disputeData } = useDispute(dispute?.id);
+ const fullDispute = disputeData?.data || dispute;
```

#### 4. Add Navigation Links - TODO
**Changes needed:**
```typescript
// ADD click handlers for accounts
<span 
  className="cursor-pointer hover:underline"
  onClick={() => navigate(`/accounts/${dispute.claimantAccountId}`)}
>
  {dispute.claimantAccountName}
</span>

// ADD click handler for transfers
<span
  className="cursor-pointer hover:underline"
  onClick={() => navigate(`/transactions/${dispute.transferId}`)}
>
  {dispute.transferId}
</span>
```

#### 5. Seed Database with Sample Data - TODO
**File:** `apps/api/scripts/seed-disputes.ts` (create)

```typescript
// Create sample disputes linked to real transfers
const sampleDisputes = [
  {
    transferId: '<real_transfer_id>',
    reason: 'service_not_received',
    description: 'Sample dispute for testing',
    // ...
  },
];
```

---

## Story 14.3: Account Relationships API

### Current Status

**API Implementation:** ❌ NOT IMPLEMENTED
**Database:** ❌ TABLE DOES NOT EXIST
**UI Implementation:** 🔄 USES MOCK DATA

**Affected Files:**
- `payos-ui/src/pages/AccountDetailPage.tsx` - Shows mock contractors (lines ~200-300)

### Implementation Tasks

#### 1. Create Database Migration
**File:** `apps/api/supabase/migrations/20251217_create_account_relationships.sql`

```sql
CREATE TABLE account_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  related_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'contractor', 'employer', 'vendor', 'customer', 'partner'
  )),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate relationships
  UNIQUE(tenant_id, account_id, related_account_id, relationship_type),
  
  -- Prevent self-relationships
  CHECK (account_id != related_account_id)
);

CREATE INDEX idx_account_relationships_account ON account_relationships(tenant_id, account_id);
CREATE INDEX idx_account_relationships_related ON account_relationships(tenant_id, related_account_id);
CREATE INDEX idx_account_relationships_type ON account_relationships(tenant_id, relationship_type);

-- RLS Policies
ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own relationships" ON account_relationships
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

CREATE POLICY "Tenants can insert their own relationships" ON account_relationships
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

CREATE POLICY "Tenants can update their own relationships" ON account_relationships
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

CREATE POLICY "Tenants can delete their own relationships" ON account_relationships
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);
```

#### 2. Create API Routes
**File:** `apps/api/src/routes/relationships.ts` (create)

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';

const relationships = new Hono();

// GET /v1/accounts/:id/related-accounts
relationships.get('/:accountId/related-accounts', async (c) => {
  const accountId = c.req.param('accountId');
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Get relationships where this account is either side
  const { data, error } = await supabase
    .from('account_relationships')
    .select(`
      *,
      related:accounts!related_account_id(id, name, type, email)
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('account_id', accountId)
    .eq('status', 'active');
    
  // ...
});

// GET /v1/accounts/:id/contractors
relationships.get('/:accountId/contractors', async (c) => {
  // Filter by relationship_type = 'contractor'
  // ...
});

// POST /v1/accounts/:id/relationships
relationships.post('/:accountId/relationships', async (c) => {
  // Create new relationship
  // ...
});

// DELETE /v1/accounts/:id/relationships/:relatedId
relationships.delete('/:accountId/relationships/:relatedId', async (c) => {
  // Set status = 'inactive' or hard delete
  // ...
});

export default relationships;
```

#### 3. Register Routes in App
**File:** `apps/api/src/app.ts`

```typescript
import relationships from './routes/relationships.js';

app.route('/v1/accounts', relationships);
```

#### 4. Create React Query Hooks
**File:** `payos-ui/src/hooks/api/useRelationships.ts` (create)

```typescript
export interface AccountRelationship {
  id: string;
  accountId: string;
  relatedAccountId: string;
  relatedAccountName: string;
  relatedAccountType: string;
  relationshipType: 'contractor' | 'employer' | 'vendor' | 'customer';
  status: 'active' | 'inactive';
  createdAt: string;
}

export function useAccountRelationships(accountId?: string) {
  // Fetch relationships for an account
}

export function useAccountContractors(accountId?: string) {
  // Fetch contractors for an account
}
```

#### 5. Update AccountDetailPage
**File:** `payos-ui/src/pages/AccountDetailPage.tsx`

```typescript
// REPLACE mock contractors
- const mockContractors = [...]

// ADD React Query
+ import { useAccountContractors } from '../hooks/api/useRelationships';
+ const { data: contractorsData } = useAccountContractors(account?.id);
+ const contractors = contractorsData?.data || [];
```

#### 6. Seed Relationships
**File:** `apps/api/scripts/seed-relationships.ts` (create)

```typescript
// Create sample relationships between existing accounts
await supabase.from('account_relationships').insert([
  {
    tenant_id: 'xxx',
    account_id: 'business_account_1',
    related_account_id: 'person_account_1',
    relationship_type: 'contractor',
  },
  // ...
]);
```

---

## Implementation Order

### Phase 1: Story 14.2 (Disputes)
1. ✅ Complete useDisputes hooks
2. Update DisputesPage to use real API
3. Add navigation links (disputes → accounts/transfers)
4. Seed sample disputes
5. Test full dispute lifecycle
6. Remove mock data

### Phase 2: Story 14.3 (Relationships)
1. Create account_relationships migration
2. Create API routes
3. Create React Query hooks
4. Update AccountDetailPage
5. Seed relationships
6. Test navigation

---

## Testing Checklist

### Story 14.2
- [ ] DisputesPage loads real disputes from API
- [ ] Filtering by status works
- [ ] Search functionality works
- [ ] Click dispute → Opens detail panel
- [ ] Click claimant name → Navigates to account
- [ ] Click transfer ID → Navigates to transaction
- [ ] Stats card shows real numbers
- [ ] No mock data remains

### Story 14.3
- [ ] AccountDetailPage loads real contractors
- [ ] Can create new relationship
- [ ] Can delete relationship
- [ ] Navigation to contractor account works
- [ ] No mock data remains

---

## Files to Create

1. `apps/api/supabase/migrations/20251217_create_account_relationships.sql`
2. `apps/api/src/routes/relationships.ts`
3. `payos-ui/src/hooks/api/useRelationships.ts`
4. `apps/api/scripts/seed-disputes.ts`
5. `apps/api/scripts/seed-relationships.ts`

## Files to Modify

1. `payos-ui/src/hooks/api/useDisputes.ts` ✅ DONE
2. `payos-ui/src/pages/DisputesPage.tsx` - Remove mock, add API
3. `payos-ui/src/pages/AccountDetailPage.tsx` - Remove mock, add API
4. `apps/api/src/app.ts` - Register relationships routes

---

## Success Criteria

✅ **No mock data in production UI**
✅ **All data fetched from real APIs**
✅ **Navigation between related entities works**
✅ **Foreign keys and RLS policies in place**

**Total Points:** 10 (~10 hours to complete both stories)

---

*This is a comprehensive plan. Implementation should continue systematically through each phase.*


