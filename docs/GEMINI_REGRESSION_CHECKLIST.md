# Gemini Regression Test Checklist

## Quick Start

**Time Required:** ~2 hours  
**Priority:** Run RLS tests first (P0), then full regression

---

## 🔒 P0: RLS Security Tests (30 min)

**CRITICAL:** Test multi-tenant isolation first!

### Setup
1. Create 2 test users in different organizations
2. Note down their login credentials
3. Have both ready to switch between

### Test Flow 20: Multi-Tenant Data Isolation

**Goal:** Verify User A cannot see User B's data

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as User A | Successful login | ⬜ |
| 2 | Navigate to `/accounts` | See User A's accounts only | ⬜ |
| 3 | Note one account ID | - | ⬜ |
| 4 | Log out | Back to login screen | ⬜ |
| 5 | Log in as User B | Successful login | ⬜ |
| 6 | Navigate to `/accounts` | See User B's accounts (different from A) | ⬜ |
| 7 | Try to access User A's account ID | 404 or "Account not found" | ⬜ |
| 8 | Repeat for `/transactions` | Different transactions shown | ⬜ |
| 9 | Repeat for `/cards` | Different payment methods shown | ⬜ |
| 10 | Repeat for `/agents` | Different agents shown | ⬜ |

**If ANY test fails:** Report immediately as P0 security issue

### Test Flow 21: API-Level Isolation

**Goal:** Verify API responses don't leak data

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open DevTools → Network tab | - | ⬜ |
| 2 | As User A: Navigate to `/accounts` | - | ⬜ |
| 3 | Find `/v1/accounts` API call | - | ⬜ |
| 4 | Check response - note account IDs | - | ⬜ |
| 5 | Log out, log in as User B | - | ⬜ |
| 6 | Navigate to `/accounts` again | - | ⬜ |
| 7 | Check `/v1/accounts` response | Different account IDs | ⬜ |
| 8 | Verify no overlap | No shared IDs between users | ⬜ |

**If data leaks:** Report as P0 security issue

---

## ✅ Full Regression Tests (90 min)

### 1. Core Functionality (20 min)

| Feature | Test | Expected | Pass/Fail |
|---------|------|----------|-----------|
| **Accounts** | List page loads | Shows accounts | ⬜ |
| | Detail page loads | Shows account details | ⬜ |
| | Can navigate between | No errors | ⬜ |
| **Transactions** | List page loads | Shows transfers | ⬜ |
| | Detail page loads | Shows transaction details | ⬜ |
| | Filtering works | Can filter by status | ⬜ |
| **Cards** | List page loads | Shows payment methods | ⬜ |
| | Detail page loads | Shows card/bank details | ⬜ |
| | Last 4 digits only | No full PAN visible | ⬜ |
| **Agents** | List page loads | Shows agents | ⬜ |
| | Detail page loads | Shows agent details | ⬜ |
| | Parent account link | Can navigate to parent | ⬜ |
| **Compliance** | List page loads | Shows compliance flags | ⬜ |
| | Detail page loads | Shows flag details | ⬜ |
| | Stats show correctly | Numbers make sense | ⬜ |
| **Disputes** | List page loads | Shows disputes | ⬜ |
| | Detail page loads | Shows dispute details | ⬜ |
| | Stats show correctly | Numbers match UI | ⬜ |

### 2. Navigation (15 min)

| Test | Expected | Pass/Fail |
|------|----------|-----------|
| Click account name in transaction detail | Navigate to account | ⬜ |
| Click account name in card detail | Navigate to account | ⬜ |
| Click account link in compliance flag | Navigate to account | ⬜ |
| Click account link in agent detail | Navigate to account | ⬜ |
| Click transaction link in dispute | Navigate to transaction | ⬜ |
| All breadcrumbs work | Navigate correctly | ⬜ |
| Back button works | Returns to previous page | ⬜ |

### 3. UI States (15 min)

| State | Test | Expected | Pass/Fail |
|-------|------|----------|-----------|
| **Loading** | Refresh any list page | Skeletons appear briefly | ⬜ |
| | Navigate between pages | Skeletons show | ⬜ |
| **Empty** | View page with no data | Empty state with message | ⬜ |
| | Empty state has icon | Visual feedback present | ⬜ |
| **Error** | Force 404 (bad ID in URL) | Error message shown | ⬜ |
| | Error has retry button | Can attempt retry | ⬜ |
| **Success** | All list pages | Data displays correctly | ⬜ |
| | All detail pages | Details show correctly | ⬜ |

### 4. Filtering & Search (10 min)

| Feature | Test | Expected | Pass/Fail |
|---------|------|----------|-----------|
| Account type filter | Select "Person" | Shows only person accounts | ⬜ |
| Transaction status filter | Select "Completed" | Shows only completed | ⬜ |
| Compliance risk filter | Select "High" | Shows only high risk | ⬜ |
| Dispute status filter | Select "Open" | Shows only open | ⬜ |
| Search accounts | Type account name | Filters results | ⬜ |
| Clear filters | Click clear/reset | Shows all data | ⬜ |

### 5. Reports & Exports (10 min)

| Feature | Test | Expected | Pass/Fail |
|---------|------|----------|-----------|
| Navigate to Reports | Click Reports in nav | Page loads | ⬜ |
| Generate QuickBooks export | Select format, generate | Export starts | ⬜ |
| Generate Xero export | Select format, generate | Export starts | ⬜ |
| View export status | Check status | Shows "Processing" or "Complete" | ⬜ |
| Download export | Click download | File downloads | ⬜ |
| Delete export | Click delete | Export removed | ⬜ |

### 6. Streams (10 min)

| Feature | Test | Expected | Pass/Fail |
|---------|------|----------|-----------|
| Navigate to Streams | Click Streams in nav | Page loads | ⬜ |
| View streams list | See list of streams | Data displays | ⬜ |
| Filter by status | Select "Active" | Shows only active | ⬜ |
| Filter by health | Select "Healthy" | Shows only healthy | ⬜ |
| View stream detail | Click a stream | Detail page loads | ⬜ |
| View event history | Scroll to events | Events shown | ⬜ |

### 7. Performance (10 min)

| Test | Expected | Pass/Fail |
|------|----------|-----------|
| Page load time < 2s | All pages | ⬜ |
| No duplicate API calls | Check Network tab | ⬜ |
| Smooth transitions | Between pages | ⬜ |
| No console errors | Check Console tab | ⬜ |
| No memory leaks | Navigate 10+ times | ⬜ |

---

## 🐛 Bug Reporting Template

If you find issues, report using this format:

```markdown
### Bug: [Short description]

**Priority:** [P0/P1/P2]
**Type:** [Security/Functional/UI/Performance]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected:**
...

**Actual:**
...

**Screenshots:**
[Attach if relevant]

**Environment:**
- URL: http://localhost:5173
- Browser: [Chrome/Firefox/Safari]
- User: [User A/User B]
```

---

## Priority Definitions

| Priority | Definition | Response Time |
|----------|------------|---------------|
| **P0** | Security issue or data leak | Immediate |
| **P1** | Feature broken, blocks workflow | 1 day |
| **P2** | UI issue, non-blocking | 1 week |
| **P3** | Nice-to-have, cosmetic | Backlog |

---

## Test Environment

**API URL:** http://localhost:4000  
**UI URL:** http://localhost:5173

**Test Users:**
- Create 2 users in different organizations
- Document credentials in your notes
- DO NOT commit credentials to git

---

## Completion Checklist

- [ ] RLS Security Tests complete (P0)
- [ ] Core Functionality Tests complete
- [ ] Navigation Tests complete
- [ ] UI States Tests complete
- [ ] Filtering & Search Tests complete
- [ ] Reports & Exports Tests complete
- [ ] Streams Tests complete
- [ ] Performance Tests complete
- [ ] All bugs reported
- [ ] Summary provided

---

## Summary Template

After completing all tests, provide this summary:

```markdown
## Regression Test Summary

**Date:** [Date]
**Tester:** Gemini
**Duration:** [X hours]

### Results
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Skipped: [X]

### Critical Issues (P0)
- [List any security/data issues]
- [None if all passed]

### Major Issues (P1)
- [List any broken features]

### Minor Issues (P2/P3)
- [List any UI/cosmetic issues]

### Recommendations
- [Any suggestions for improvement]

### Overall Status
[PASS/FAIL with explanation]
```

---

**Good luck with testing! 🚀**


