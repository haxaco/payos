# 🚨 Dashboard 429 Rate Limit Errors - Analysis & Fix

## 🔴 **The Problem**

Dashboard is hitting "429 Too Many Requests" errors when navigating between pages, especially account details.

---

## 🔍 **Root Cause Analysis**

### **Issue 1: Account Detail Page Makes 5 Parallel Requests**

When viewing `/dashboard/accounts/[id]`, the page makes **5 simultaneous API calls**:

```typescript
const [accountData, agentsData, streamsData, transactionsData, transfersData] = await Promise.all([
  api.accounts.get(accountId),                      // Request 1
  api.accounts.getAgents(accountId, { limit: 50 }), // Request 2
  api.accounts.getStreams(accountId, { limit: 50 }),// Request 3
  api.accounts.getTransactions(accountId, { limit: 50 }), // Request 4
  api.transfers.list({ limit: 100 }),               // Request 5 (WORST!)
]);
```

**Impact:** Viewing 3-4 accounts = 15-20 requests in seconds!

---

### **Issue 2: Fetching ALL Transfers Then Filtering Client-Side**

```typescript
api.transfers.list({ limit: 100 }), // Fetches 100 transfers
// Then filters client-side:
const accountTransfers = (transfersData.data || []).filter(
  t => t.from?.accountId === accountId || t.to?.accountId === accountId
);
```

**Why this is bad:**
- Fetches 100 transfers when you might only need 5
- Wastes bandwidth
- Slower page loads
- Contributes to rate limiting

---

### **Issue 3: No Request Caching**

Every page navigation = fresh API calls. No caching strategy.

**Impact:**
- Back button = 5 new requests
- Tab switching = 5 new requests
- Page refresh = 5 new requests

---

### **Issue 4: React Strict Mode (Development)**

In development, React Strict Mode intentionally **doubles requests** to catch bugs.

**Impact:** 5 requests → 10 requests in development!

---

## ✅ **Immediate Fix: Increased Rate Limit**

**Changed:**
```diff
- maxRequests: 500,   // 500 requests per minute
+ maxRequests: 1000,  // 1000 requests per minute
```

**Status:** ✅ Deployed

This **buys you time** but doesn't fix the underlying inefficiency.

---

## 🎯 **Long-Term Optimizations**

### **1. Add API Endpoint to Filter Transfers by Account**

**Current (inefficient):**
```typescript
api.transfers.list({ limit: 100 }) // Get all, filter client-side
```

**Better (add new endpoint):**
```typescript
api.accounts.getTransfers(accountId, { limit: 50 }) // Filter server-side
```

**Implementation:**
- Add `GET /v1/accounts/:id/transfers` endpoint
- Filter in database query (much faster)
- Return only relevant transfers

---

### **2. Implement Request Caching**

**Option A: React Query (Recommended)**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: account } = useQuery({
  queryKey: ['account', accountId],
  queryFn: () => api.accounts.get(accountId),
  staleTime: 30000, // Cache for 30 seconds
});
```

**Benefits:**
- Automatic caching
- Background refetching
- Deduplication (same request = 1 API call)
- Optimistic updates

**Option B: SWR (Simpler)**
```typescript
import useSWR from 'swr';

const { data: account } = useSWR(
  ['account', accountId],
  () => api.accounts.get(accountId)
);
```

---

### **3. Lazy Load Tabs**

**Current:** Fetch all data on page load  
**Better:** Fetch only when tabs are activated

```typescript
useEffect(() => {
  if (activeTab === 'agents' && agents.length === 0) {
    fetchAgents();
  }
}, [activeTab]);
```

**Impact:** Initial load = 2 requests instead of 5!

---

### **4. Paginate Large Lists**

Instead of `{ limit: 100 }`, use pagination:
```typescript
{ page: 1, limit: 20 } // Only fetch what's visible
```

---

### **5. Add 429 Error Handling**

Show user-friendly message when rate limited:

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

---

### **6. Debounce Search & Filters**

If you have search functionality:
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => fetchResults(query), 300),
  []
);
```

Prevents API call on every keystroke.

---

## 📊 **Before vs After**

### **Current State (After Rate Limit Increase)**
| Action | API Calls | Time to 429 |
|--------|-----------|-------------|
| View 3 accounts | 15 requests | ~200 views/min |
| Back/forward navigation | 5 new requests | Accumulates |
| Page refresh | All requests repeat | Quick with dev mode |

### **After Optimizations**
| Action | API Calls | Time to 429 |
|--------|-----------|-------------|
| View 3 accounts | 6-9 requests (with caching) | ~500+ views/min |
| Back/forward navigation | 0 (cached) | Never |
| Page refresh | Smart refetch | Rare |

---

## 🚀 **Implementation Priority**

### **Phase 1: Quick Wins (This Week)**
- [x] Increase rate limit to 1000/min ✅
- [ ] Add 429 error handling with user messaging
- [ ] Lazy load tabs on account detail page

### **Phase 2: Performance (Next Week)**
- [ ] Add `GET /v1/accounts/:id/transfers` endpoint
- [ ] Implement React Query for caching
- [ ] Remove client-side filtering of transfers

### **Phase 3: Polish (Future)**
- [ ] Add request deduplication
- [ ] Implement optimistic UI updates
- [ ] Add service worker for offline support

---

## 🧪 **Testing After Fix**

1. **Clear browser cache**
2. **Navigate to dashboard**
3. **Click through 5-10 accounts quickly**
4. **Open browser DevTools → Network tab**
5. **Count API requests**

**Expected:** No 429 errors with rate limit at 1000/min

**Monitor:** Check Railway logs for rate limit hits:
```bash
railway logs --filter "429"
```

---

## 📝 **Current Status**

✅ **Immediate Fix Deployed**
- Rate limit increased: 500 → 1000 requests/minute
- Should eliminate most 429 errors
- Dashboard remains functional

⏳ **Long-term optimizations tracked in TODO list**

---

## 💡 **Best Practices Moving Forward**

1. **Always paginate** - Never fetch more than needed
2. **Cache aggressively** - Use React Query or SWR
3. **Filter server-side** - Don't fetch 100 to show 5
4. **Lazy load** - Only fetch data when tabs/sections are visible
5. **Handle errors gracefully** - Show retry buttons, not crashes
6. **Monitor in production** - Set up rate limit alerts

---

**Need help implementing these optimizations?** Let me know which phase to prioritize!

