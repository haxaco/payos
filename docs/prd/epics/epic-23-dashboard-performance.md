# Epic 23: Dashboard Performance & API Optimization 🚀

**Status:** ✅ COMPLETE (December 22, 2025)
**Phase:** Performance Optimization
**Priority:** P1 (Performance & User Experience)
**Total Points:** 18
**Stories:** 7/7 Complete
**Duration:** Completed in 3 days

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Optimizes dashboard performance and API efficiency after discovering 429 rate limit errors caused by inefficient data fetching patterns. The account detail page makes 5 parallel requests, fetches 100 transfers to filter client-side, and has no caching strategy.

---

## Business Value

- **Better UX:** Faster page loads, no rate limit errors
- **Lower Costs:** Reduced API calls = lower infrastructure costs
- **Scalability:** Efficient patterns support more users
- **Best Practices:** Modern caching and data fetching patterns

---

## Current Issues

1. **Account detail page makes 5 parallel requests** on every load
2. **Fetches 100 transfers** then filters client-side (wasteful)
3. **No caching** - every navigation = fresh API calls
4. **React Strict Mode** doubles requests in development
5. **Rate limit too low** - 500/min insufficient for dashboard patterns

---

## Stories

### Story 23.1: Increase API Rate Limit (1 point) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 19, 2025)

**Implementation:**
- Increase rate limit from 500 to 1000 requests/minute
- Immediate fix for 429 errors
- Buys time for proper optimizations

**Acceptance Criteria:**
- ✅ Rate limit increased in `apps/api/src/middleware/rate-limit.ts`
- ✅ Deployed to Railway
- ✅ No 429 errors during normal dashboard usage

---

### Story 23.2: Add Account Transfers Endpoint (3 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Problem:** Fetching 100 transfers then filtering client-side is wasteful

**Solution:**
```typescript
// Before (inefficient)
api.transfers.list({ limit: 100 }) // Get all, filter client-side

// After (efficient)
api.accounts.getTransfers(accountId, { limit: 50 }) // Filter server-side
```

**Implementation:**
- Add `GET /v1/accounts/:id/transfers` endpoint
- Filter in database query: `WHERE from_account_id = $1 OR to_account_id = $1`
- Support pagination (page, limit)
- Return only relevant transfers
- Update API client types

**Acceptance Criteria:**
- ✅ New endpoint returns transfers for specific account
- ✅ Supports pagination parameters
- ✅ Filters in SQL, not application code
- ✅ TypeScript types updated
- ✅ API client method added

---

### Story 23.3: Implement React Query for Caching (5 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Installation:**
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

**Setup:**
```typescript
// apps/web/src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    },
  },
});
```

**Usage Example:**
```typescript
const { data: account } = useQuery({
  queryKey: ['account', accountId],
  queryFn: () => api.accounts.get(accountId),
});
```

**Tasks:**
- Install React Query
- Create QueryClientProvider wrapper
- Convert account detail page to use useQuery
- Convert accounts list page to use useQuery
- Add React Query DevTools (development only)
- Document caching strategy

**Acceptance Criteria:**
- ✅ React Query installed and configured
- ✅ Account detail page uses useQuery hooks
- ✅ Accounts list page uses useQuery hooks
- ✅ Back/forward navigation uses cache
- ✅ DevTools available in development

---

### Story 23.4: Lazy Load Account Detail Tabs (3 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Problem:** Fetch all data on page load (5 requests)
**Solution:** Fetch only when tabs are activated

```typescript
useEffect(() => {
  if (activeTab === 'agents' && !agents.length) {
    fetchAgents();
  }
}, [activeTab]);
```

**Implementation:**
- Overview tab: Load immediately (account info only)
- Transactions tab: Load on activation
- Streams tab: Load on activation
- Agents tab: Load on activation
- Show loading state when switching tabs

**Acceptance Criteria:**
- ✅ Initial page load = 1-2 requests (not 5)
- ✅ Tab data loads on first activation
- ✅ Subsequent tab switches use cache
- ✅ Loading indicators shown during fetch
- ✅ No performance regression

---

### Story 23.5: Add 429 Error Handling (2 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Show user-friendly message when rate limited:**

```typescript
try {
  const data = await api.accounts.list();
} catch (error) {
  if (error.status === 429) {
    const retryAfter = error.headers?.['retry-after'] || 60;
    toast.error(`Too many requests. Please wait ${retryAfter} seconds.`);
  }
}
```

**Implementation:**
- Add global error handler for 429 responses
- Show toast notification with retry time
- Add "Retry" button after cooldown
- Log rate limit hits to analytics
- Update API client to parse Retry-After header

**Acceptance Criteria:**
- ✅ 429 errors show user-friendly message
- ✅ Retry-After header parsed and displayed
- ✅ Retry button appears after cooldown
- ✅ No app crashes on rate limit
- ✅ Error logged for monitoring

---

### Story 23.6: Optimize Dashboard Home Page (2 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Problem:** Makes multiple API calls for stats
**Solution:** Single aggregated endpoint or cached queries

**Implementation:**
- Review dashboard home page API calls
- Combine related queries where possible
- Add React Query caching
- Reduce unnecessary re-renders
- Add loading skeletons

**Acceptance Criteria:**
- ✅ Dashboard loads with minimal API calls
- ✅ Stats cached for 30 seconds
- ✅ Loading states look polished
- ✅ No unnecessary re-fetches

---

### Story 23.7: Add Request Deduplication (2 points) ✅ COMPLETE

**Status:** ✅ COMPLETE (December 22, 2025)

**Prevent duplicate requests when multiple components need same data**

React Query handles this automatically, but need to ensure:
- Same query keys used across components
- Proper cache invalidation on mutations
- Background refetching configured

**Implementation:**
- Audit query keys for consistency
- Add mutation hooks with cache invalidation
- Configure background refetch strategy
- Document query key patterns

**Acceptance Criteria:**
- ✅ Duplicate requests eliminated
- ✅ Cache invalidated on data changes
- ✅ Query key naming documented
- ✅ Background refetch working

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 23.1 Increase API Rate Limit | 1 | P1 | ✅ Complete |
| 23.2 Add Account Transfers Endpoint | 3 | P1 | ✅ Complete |
| 23.3 Implement React Query | 5 | P1 | ✅ Complete |
| 23.4 Lazy Load Account Detail Tabs | 3 | P1 | ✅ Complete |
| 23.5 Add 429 Error Handling | 2 | P1 | ✅ Complete |
| 23.6 Optimize Dashboard Home Page | 2 | P1 | ✅ Complete |
| 23.7 Add Request Deduplication | 2 | P1 | ✅ Complete |
| **Total** | **18** | | **7/7 Complete** |

---

## Implementation Order

### Phase 1: Quick Wins (Week 1) ✅ COMPLETE
1. ✅ Story 23.1: Increase rate limit
2. ✅ Story 23.2: Add account transfers endpoint
3. ✅ Story 23.5: Add 429 error handling

### Phase 2: Caching Infrastructure (Week 1-2) ✅ COMPLETE
4. ✅ Story 23.3: Implement React Query
5. ✅ Story 23.6: Optimize dashboard home page
6. ✅ Story 23.7: Add request deduplication

### Phase 3: Performance Polish (Week 2) ✅ COMPLETE
7. ✅ Story 23.4: Lazy load account detail tabs

---

## Completion Summary

**Performance Metrics:**

**Before Optimization:**
| Metric | Value |
|--------|-------|
| Account detail initial load | 5 requests |
| Back button navigation | 5 new requests |
| Time to 429 error | ~200 page views |
| Wasted bandwidth | ~80% (fetch 100, show 5) |

**After Optimization:**
| Metric | Value |
|--------|-------|
| Account detail initial load | 1-2 requests |
| Back button navigation | 0 requests (cached) |
| Time to 429 error | ~500+ page views |
| Wasted bandwidth | <10% |

**Impact:**
- ✅ API calls reduced by 60-70% overall
- ✅ Page load time: <1 second for cached data
- ✅ No 429 rate limit errors during normal usage
- ✅ Better user experience with loading states

---

## Technical Deliverables

### API Changes
- `GET /v1/accounts/:id/transfers` - Server-side filtered transfers
- Rate limit increased to 1000 req/min in `apps/api/src/middleware/rate-limit.ts`

### UI Changes
- React Query integration in `apps/web/src/app/providers.tsx`
- Lazy loading in `apps/web/src/app/dashboard/accounts/[id]/page.tsx`
- 429 error handling in `apps/web/src/hooks/api/useApi.ts`

### Dependencies Added
- `@tanstack/react-query`
- `@tanstack/react-query-devtools`

---

## Technical Notes

**React Query Benefits:**
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Stale-while-revalidate pattern
- DevTools for debugging

**Server-Side Filtering Benefits:**
- Faster queries (database indexes)
- Less data over network
- Lower memory usage
- Better scalability

**Lazy Loading Benefits:**
- Faster initial page load
- Only fetch what's needed
- Better perceived performance
- Lower API usage

---

## Success Criteria

- ✅ No 429 rate limit errors during normal usage
- ✅ Account detail page: 5 requests → 1-2 requests on initial load
- ✅ Back/forward navigation: 0 new requests (cached)
- ✅ Page load time: <1 second for cached data
- ✅ API calls reduced by 60-70% overall
- ✅ User-friendly error messages for edge cases

---

## Related Documentation

- **Analysis:** `/docs/DASHBOARD_429_RATE_LIMIT_FIX.md`
- **Account Detail Page:** `/apps/web/src/app/dashboard/accounts/[id]/page.tsx`
- **API Middleware:** `/apps/api/src/middleware/rate-limit.ts`
- **React Query Docs:** https://tanstack.com/query/latest
