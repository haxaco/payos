# Pagination Testing Guide for Gemini

## Overview

This guide provides comprehensive testing instructions for validating pagination functionality across all 12 list/grid pages in the PayOS dashboard. All pages should now have professional pagination controls with server-side pagination.

---

## Test Credentials

**Test Account:**
- Email: `haxaco@gmail.com`
- Password: `Password123!`

**Environment:**
- Frontend: https://payos.vercel.app
- API: https://payos-api.up.railway.app

---

## Pages to Test (12 Total)

### Table-Based Pages (8)
1. **Accounts** (`/dashboard/accounts`) - 1,072 records
2. **Transfers** (`/dashboard/transfers`) - 30,884 records
3. **Schedules** (`/dashboard/schedules`) - 60 records
4. **Refunds** (`/dashboard/refunds`) - 12 records
5. **Cards** (`/dashboard/cards`) - 61 records
6. **Compliance** (`/dashboard/compliance`) - 15 records
7. **Reports** (`/dashboard/reports`) - 147 records
8. **Agents** (`/dashboard/agents`) - 68 records

### Card Grid Pages (2)
9. **x402 Endpoints** (`/dashboard/x402/endpoints`) - 62 records
10. **x402 Wallets** (`/dashboard/x402/wallets`) - 69 records

---

## Pagination Features to Validate

### Navigation Controls
- ✅ **First Page Button** - Jumps to page 1
- ✅ **Previous Page Button** - Goes back one page
- ✅ **Page Number Buttons** - Shows current and nearby pages
- ✅ **Next Page Button** - Advances one page
- ✅ **Last Page Button** - Jumps to last page
- ✅ **Smart Ellipsis** - Shows "..." when too many pages (e.g., `1 ... 10 11 [12] 13 14 ... 22`)

### Configuration Options
- ✅ **Items Per Page Selector** - Dropdown with options: 10, 25, 50, 100
- ✅ **"Showing X to Y of Z"** - Displays current range and total count
- ✅ **Jump to Page Input** - Text input + "Go" button (appears for 10+ pages)

### Interaction States
- ✅ **Disabled States** - First/Prev disabled on page 1, Next/Last disabled on last page
- ✅ **Current Page Highlight** - Active page number has different styling
- ✅ **Hover Effects** - Buttons show hover state

---

## Testing Methodology

### Test Flow for Each Page

1. **Initial Load Validation**
   - Verify pagination controls are visible
   - Verify "Showing 1 to X of Z results" matches actual data
   - Verify page 1 is selected/highlighted
   - Verify First/Previous buttons are disabled

2. **Basic Navigation**
   - Click "Next" → Verify page 2 loads
   - Verify "Showing X to Y of Z" updates correctly
   - Click "Previous" → Verify returns to page 1
   - Click "Last" → Verify jumps to final page
   - Verify Next/Last buttons are now disabled
   - Click "First" → Verify returns to page 1

3. **Page Number Navigation**
   - Click a specific page number → Verify that page loads
   - Verify page number is highlighted
   - Verify data changes

4. **Items Per Page Changes**
   - Change from 50 to 10 → Verify resets to page 1
   - Verify "Showing 1 to 10 of Z" updates
   - Verify more pages now exist
   - Change to 100 → Verify fewer pages
   - Change back to 50

5. **Jump to Page (if available)**
   - Type a valid page number → Click "Go"
   - Verify navigation to that page
   - Type invalid page (e.g., 99999) → Verify clamped to last page
   - Type 0 or negative → Verify clamped to page 1

6. **Data Consistency**
   - Navigate through 3-5 pages
   - Verify no duplicate records
   - Verify records change on each page
   - Verify total count remains consistent

---

## Detailed Test Cases

### Test Case 1: Accounts Page (1,072 records)

**Purpose:** Validate pagination on largest table-based dataset

**Steps:**
1. Navigate to `/dashboard/accounts`
2. Verify shows "Showing 1 to 50 of 1072 results"
3. Verify 22 pages total at 50 per page (1072 / 50 = 21.44 → 22 pages)
4. Click "Next" 5 times → Verify on page 6
5. Change items per page to 100
6. Verify now shows ~11 pages total
7. Click "Last" → Verify on page 11
8. Verify shows "Showing 1001 to 1072 of 1072 results" (or similar)
9. Jump to page 5 → Verify navigation works
10. Return to page 1

**Expected Results:**
- ✅ All navigation works smoothly
- ✅ No duplicate accounts across pages
- ✅ Total count stays 1,072
- ✅ Page calculations are accurate

---

### Test Case 2: Transfers Page (30,884 records)

**Purpose:** Validate pagination on LARGEST dataset

**Steps:**
1. Navigate to `/dashboard/transfers`
2. Verify shows "Showing 1 to 50 of 30884 results"
3. Verify ~618 pages at 50 per page
4. Verify "Jump to Page" input is visible (>10 pages)
5. Type "100" in jump input → Click "Go"
6. Verify jumps to page 100
7. Verify shows "Showing 4951 to 5000 of 30884 results"
8. Change items per page to 10
9. Verify now shows ~3089 pages
10. Click "Last" → Verify shows final records
11. Verify Next/Last buttons disabled

**Expected Results:**
- ✅ Handles large dataset efficiently
- ✅ Jump to page works correctly
- ✅ Math calculations accurate
- ✅ No performance issues

---

### Test Case 3: Compliance Page (15 records)

**Purpose:** Validate pagination on SMALLEST dataset + Real data (was mock)

**Steps:**
1. Navigate to `/dashboard/compliance`
2. Verify shows real compliance flags (NOT mock data)
3. Verify shows "Showing 1 to 15 of 15 results" (single page)
4. Verify pagination controls still visible
5. Verify Next/Last buttons disabled (only 1 page)
6. Change items per page to 10
7. Verify now shows 2 pages
8. Click "Next" → Verify shows records 11-15
9. Verify stats at top match real data

**Expected Results:**
- ✅ No more mock data
- ✅ Real compliance flags displayed
- ✅ Pagination works even with small dataset
- ✅ Stats cards show accurate counts

---

### Test Case 4: x402 Endpoints (62 records - Card Grid)

**Purpose:** Validate pagination on CARD GRID layout

**Steps:**
1. Navigate to `/dashboard/x402/endpoints`
2. Verify endpoints displayed as cards (not table rows)
3. Verify shows "Showing 1 to 50 of 62 results"
4. Verify 2 pages at 50 per page
5. Click "Next" → Verify second page of cards loads
6. Verify shows "Showing 51 to 62 of 62 results"
7. Change items per page to 25
8. Verify now shows 3 pages
9. Navigate through all 3 pages
10. Verify no duplicate endpoints

**Expected Results:**
- ✅ Pagination works with card grid layout
- ✅ Cards update on page change
- ✅ Stats at top remain consistent
- ✅ Visual layout stays intact

---

### Test Case 5: x402 Wallets (69 records - Card Grid)

**Purpose:** Validate pagination on second card grid

**Steps:**
1. Navigate to `/dashboard/x402/wallets`
2. Verify wallets displayed as cards
3. Verify shows "Showing 1 to 50 of 69 results"
4. Click "Next" → Verify shows 19 remaining wallets
5. Verify shows "Showing 51 to 69 of 69 results"
6. Click "Previous" → Return to page 1
7. Change items per page to 10
8. Verify now shows 7 pages
9. Navigate to page 4
10. Verify correct wallets displayed

**Expected Results:**
- ✅ Card grid pagination works
- ✅ Balance totals consistent
- ✅ No layout issues

---

### Test Case 6: All Remaining Pages (Quick Validation)

For each remaining page, perform quick validation:

**Schedules (60 records):**
- Navigate to `/dashboard/schedules`
- Verify pagination visible
- Click "Next" once → Verify page 2 loads
- Change items per page to 25
- Verify math: 60 / 25 = 3 pages

**Refunds (12 records):**
- Navigate to `/dashboard/refunds`
- Verify shows all 12 on single page (at 50 per page)
- Change to 10 per page → Verify 2 pages appear
- Click "Next" → Verify shows 2 remaining refunds

**Cards (61 records):**
- Navigate to `/dashboard/cards`
- Verify card transactions paginated
- Click through 2 pages (at 50 per page)
- Verify stats at top remain accurate

**Reports (147 records):**
- Navigate to `/dashboard/reports`
- Verify ~3 pages at 50 per page
- Navigate to page 3
- Verify shows remaining reports

**Agents (68 records):**
- Navigate to `/dashboard/agents`
- Verify agent cards paginated
- Click "Next" → Verify page 2 of agents
- Verify ~2 pages at 50 per page

---

## Edge Cases to Test

### Edge Case 1: Empty Search Results
1. Navigate to any page with search (e.g., Accounts)
2. Search for nonsense string "XYZABC123NOTFOUND"
3. Verify "No results found" message
4. Verify pagination controls hidden or disabled
5. Clear search → Verify pagination returns

### Edge Case 2: Single Page of Results
1. Navigate to page with <50 records (e.g., Refunds with 12)
2. Verify pagination controls visible but navigation disabled
3. Verify shows "Showing 1 to 12 of 12 results"
4. Verify page counter shows "Page 1 of 1"

### Edge Case 3: Boundary Navigation
1. Navigate to any page with multiple pages
2. Manually jump to page 0 or negative → Should clamp to page 1
3. Jump to page 99999 → Should clamp to last page
4. Verify no errors in console

### Edge Case 4: Rapid Navigation
1. Navigate to Transfers page (large dataset)
2. Rapidly click "Next" 10 times quickly
3. Verify all navigation completes successfully
4. Verify no duplicate data
5. Verify no loading state issues

### Edge Case 5: Items Per Page Changes
1. Start on page 5 with 50 items per page
2. Change to 100 items per page
3. Verify automatically resets to page 1 (expected behavior)
4. Change back to 10 items per page
5. Verify still on page 1

---

## Performance Validation

### Caching Behavior
1. Navigate to Accounts page
2. Click "Next" to page 2 → Note load time
3. Click "Previous" to page 1 → Should load instantly (cached)
4. Click "Next" to page 2 again → Should load instantly (cached)
5. Wait 35 seconds (cache expiry is 30s)
6. Click "Previous" to page 1 → May refetch (stale)

### Server-Side Filtering
1. Navigate to Transfers page
2. Change status filter to "completed"
3. Verify pagination resets to page 1
4. Verify total count updates
5. Change filter back to "all"
6. Verify pagination recalculates

---

## Automated Testing Script

```bash
#!/bin/bash
# Pagination API Test Script
# Tests pagination across all major endpoints

BASE_URL="https://payos-api.up.railway.app/v1"
TOKEN="YOUR_JWT_TOKEN_HERE"  # Replace after login

echo "🧪 Testing Pagination API Endpoints..."

# Test Accounts pagination
echo "\n📋 Testing Accounts (1,072 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/accounts?page=1&limit=50" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Total: \(.total)"'

# Test Transfers pagination  
echo "\n💸 Testing Transfers (30,884 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/transfers?page=100&limit=50" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Showing: \((.page-1)*50+1)-\(.page*50) of \(.total)"'

# Test Cards pagination
echo "\n💳 Testing Cards (61 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/card-transactions?page=2&limit=50" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Total: \(.total)"'

# Test Agents pagination
echo "\n🤖 Testing Agents (68 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/agents?page=1&limit=10" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Total: \(.total)"'

# Test x402 Endpoints pagination
echo "\n🔌 Testing x402 Endpoints (62 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/x402/endpoints?page=1&limit=25" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Total: \(.total)"'

# Test Wallets pagination
echo "\n👛 Testing Wallets (69 records)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/wallets?page=2&limit=50" | \
  jq '.pagination | "Page: \(.page)/\(.pages), Total: \(.total)"'

echo "\n✅ API Pagination Tests Complete!"
```

---

## Visual Validation Checklist

For each page, verify these visual elements:

### Layout & Styling
- [ ] Pagination controls centered at bottom of page
- [ ] Proper spacing between controls (not cramped)
- [ ] Buttons have clear hover states
- [ ] Current page number is highlighted/different color
- [ ] Disabled buttons have muted appearance
- [ ] Dark mode works correctly

### Responsive Design
- [ ] On mobile (<768px): Controls stack vertically
- [ ] On tablet (768-1024px): Controls remain horizontal
- [ ] On desktop (>1024px): Full controls visible
- [ ] "Showing X to Y" text remains readable
- [ ] Buttons remain clickable on small screens

### Accessibility
- [ ] Keyboard navigation works (Tab through controls)
- [ ] Enter key submits "Jump to Page"
- [ ] Buttons have proper focus states
- [ ] ARIA labels present (if applicable)

---

## Known Limitations

1. **Compliance API:** Uses `offset` instead of `page` parameter (backend limitation)
2. **Client-side Filtering:** Search and some filters still client-side (not all APIs support filtering)
3. **Cache Timing:** First load may be slower, subsequent navigations cached for 30s

---

## Success Criteria

### Must Pass (Critical)
- ✅ All 12 pages have visible pagination controls
- ✅ Navigation buttons work correctly on all pages
- ✅ "Showing X to Y of Z" matches actual data
- ✅ No duplicate records when navigating
- ✅ Total counts remain consistent
- ✅ Items per page selector works
- ✅ Large datasets (30K+ transfers) perform well

### Should Pass (Important)
- ✅ Jump to page works where available
- ✅ Page number buttons display correctly
- ✅ Ellipsis appears for large page counts
- ✅ Caching improves performance
- ✅ Dark mode displays correctly

### Nice to Have (Enhancement)
- ✅ Smooth transitions between pages
- ✅ Loading states during navigation
- ✅ Mobile responsive design works well

---

## Reporting Issues

If you find any issues, report them with:

1. **Page Name** - Which of the 12 pages
2. **Steps to Reproduce** - Exact steps taken
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happened
5. **Data State** - Record counts, page numbers, etc.
6. **Screenshots** - If visual issue

Example:
```
❌ Issue: Transfers page shows wrong total

Page: Transfers (/dashboard/transfers)
Steps: 
  1. Navigate to transfers page
  2. Check "Showing X to Y of Z" counter

Expected: "Showing 1 to 50 of 30884 results"
Actual: "Showing 1 to 50 of 0 results"

Data: User haxaco@gmail.com, tested at 2025-12-22 10:30 AM
```

---

## Quick Test Summary

**Fastest way to validate pagination is working:**

1. ✅ Test **Transfers** (largest dataset - 30,884)
2. ✅ Test **Compliance** (smallest + was mock data - 15)
3. ✅ Test **x402 Endpoints** (card grid - 62)
4. ✅ Spot-check 3 other random pages

If these 6 work, pagination is likely working everywhere.

---

## Conclusion

This guide provides comprehensive coverage of pagination functionality across all PayOS dashboard pages. Complete all test cases to ensure pagination is production-ready.

**Estimated Testing Time:** 30-45 minutes for full suite

**Priority Testing:** Transfers, Compliance, x402 Endpoints (15 mins)

---

**Last Updated:** December 22, 2025  
**Version:** 1.0  
**Status:** Ready for Testing ✅

