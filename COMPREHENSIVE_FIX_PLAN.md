# Comprehensive UI Fix Plan

## Issues to Fix (13 total)

### 1. ✅ Wallets - Duplicate Data (FIXED)
- **Issue:** 9 wallets showing (same 3 repeated 3 times)
- **Root Cause:** Seed script run multiple times
- **Fix:** Ran cleanup script, deleted 6 duplicates
- **Status:** COMPLETE

### 2. Wallets - No Detail Page
- **Issue:** Clicking wallet doesn't go to detail page
- **Root Cause:** Missing `/dashboard/wallets/[id]/page.tsx`
- **Fix:** Create wallet detail page

### 3. ✅ Schedules - Duplicate Data (FIXED)
- **Issue:** Same schedules repeated
- **Root Cause:** Seed script run multiple times
- **Fix:** Ran cleanup script, deleted 6 duplicates
- **Status:** COMPLETE

### 4. Schedules - No Detail Page
- **Issue:** Clicking schedule doesn't go to detail page
- **Root Cause:** Missing `/dashboard/schedules/[id]/page.tsx`
- **Fix:** Create schedule detail page

### 5. Refunds - No Detail Page & N/A Links
- **Issue:** No detail page, "Original Transfer" shows N/A
- **Root Cause:** Missing detail page + `originalTransferId` is null
- **Fix:** Create detail page + handle null `originalTransferId`

### 6. Cards - No Cards Showing
- **Issue:** Cards page shows no data
- **Root Cause:** Double-nesting or API config issue
- **Fix:** Check API response structure and fix data access

### 7. Compliance - Shows 0 Flags (Unknown Reason)
- **Issue:** Page shows "No Compliance Flags" but DB has 6
- **Root Cause:** Double-nesting `(flagsData as any)?.data?.data`
- **Fix:** Change to `(flagsData as any)?.data` (API returns `{ data: [...] }`)

### 8. Treasury - Hardcoded $2.4M
- **Issue:** Treasury shows hardcoded data instead of real treasury accounts
- **Root Cause:** Frontend not fetching treasury accounts API
- **Fix:** Implement treasury accounts API call

### 9. Agent Detail - `streams.filter is not a function`
- **Issue:** Runtime error on agent detail page
- **Root Cause:** `streams` is not an array (likely double-nested or undefined)
- **Fix:** Add null check and fix data access: `(streams || []).filter(...)`

### 10. AP2 Mandates - No Data Loading
- **Issue:** `/dashboard/agentic-payments/ap2/mandates` doesn't load
- **Root Cause:** Double-nesting or API config issue
- **Fix:** Check API response structure

### 11. AP2 New Mandate - `agents?.data?.map is not a function`
- **Issue:** Create mandate page crashes
- **Root Cause:** Double-nesting `agents?.data?.map` should be `agents?.map`
- **Fix:** Change to `agents?.map` or `(agents as any)?.data?.map` depending on API structure

### 12. x402 Endpoints - `mx-auto` Centers Content
- **Issue:** Page content shrunk to 1/3 of screen
- **Root Cause:** `mx-auto` with `max-w-*` centers and limits width
- **Fix:** Remove `mx-auto` or increase `max-w` value

### 13. x402 Detail - No Name/Data Showing
- **Issue:** Endpoint detail page missing name and shows no calls/revenue
- **Root Cause:** Double-nesting or missing data fields
- **Fix:** Check API response and fix data access

### 14. ACP Checkouts - No Data & Slow Render
- **Issue:** No checkouts showing, slow to render
- **Root Cause:** Double-nesting or API config issue
- **Fix:** Check API response structure

### 15. Developers Page - 404
- **Issue:** `/dashboard/agentic-payments/developers` returns 404
- **Root Cause:** Page doesn't exist
- **Fix:** Create the developers page

## Common Patterns

### Double-Nesting Issue
Many pages expect `data.data.data` when API returns `data.data`:
- ✅ **Correct:** `(response as any)?.data`
- ❌ **Wrong:** `(response as any)?.data?.data`

### Null/Undefined Checks
Many crashes due to missing null checks:
- ✅ **Correct:** `(array || []).filter(...)`
- ❌ **Wrong:** `array.filter(...)`

## Fix Order (by priority)

1. ✅ Clean duplicate data (DONE)
2. Fix compliance page (high visibility)
3. Fix cards page (high visibility)
4. Fix agent detail crash (blocks testing)
5. Fix AP2 pages (agentic payments critical)
6. Fix x402 pages (agentic payments critical)
7. Fix ACP checkouts (agentic payments critical)
8. Create missing detail pages (wallets, schedules, refunds)
9. Fix treasury display
10. Create developers page



