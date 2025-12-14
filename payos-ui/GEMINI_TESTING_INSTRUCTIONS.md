# Testing Instructions for Gemini

## Quick Answers

### 1. Should I treat payos-ui as the apps/dashboard mentioned in the PRD?

**Answer: YES, but with clarification:**

- The PRD mentions `apps/dashboard` but the actual project structure has:
  - `apps/web` - Next.js application (not currently active)
  - `payos-ui` - Vite + React Router application (this is the active UI)

**For testing purposes:**
- ✅ **Use `payos-ui`** - This is the active UI application we've been developing
- ✅ **URL:** http://localhost:5173
- ✅ **Tech Stack:** Vite + React Router + React 18

The PRD's reference to `apps/dashboard` is a naming convention, but `payos-ui` is the actual implementation.

---

### 2. Should I rely on payos-ui/UI_TESTING_GUIDE.md, or will you provide a different guide?

**Answer: YES, use `payos-ui/UI_TESTING_GUIDE.md`**

This is the official testing guide created specifically for UI testing. It includes:
- ✅ 19 comprehensive test flows
- ✅ All routes and navigation paths
- ✅ Expected UI elements and behaviors
- ✅ Test data references
- ✅ Error/loading/empty state testing
- ✅ Responsive and accessibility guidelines

**No other guide will be provided** - this is the single source of truth for UI testing.

---

### 3. Are the missing migrations an issue we need to address before testing?

**Answer: NO - Migrations are already applied ✅**

The database migrations for the new features have already been applied:

**Verified Applied Migrations:**
- ✅ `add_payment_methods_table` (version: 20251212225840)
- ✅ `add_disputes_table` (version: 20251212225844)
- ✅ `add_refunds_table` (version: 20251212225834)
- ✅ `add_transfer_schedules_table` (version: 20251212225836)
- ✅ `add_exports_table` (version: 20251212225849)

**You can proceed with testing immediately** - no database setup required.

---

## Testing Setup

### Prerequisites
1. **API Server:** Running on http://localhost:4000
2. **UI Server:** Running on http://localhost:5173
3. **Database:** Supabase (migrations already applied)

### Start Testing
1. Navigate to http://localhost:5173
2. Follow the flows in `UI_TESTING_GUIDE.md` sequentially
3. Report any issues with:
   - Screenshots
   - Browser console errors
   - Network request failures
   - UI/UX inconsistencies

---

## Key Features to Test

### New Features (P1 Stories)
1. **Disputes Page** (`/disputes`)
   - Queue with status badges
   - Detail slide-over panel
   - Filtering and search
   - Due date warnings

2. **Payment Methods Tab** (on Account Detail pages)
   - List of saved methods
   - Add new method modal
   - Set default functionality
   - Verification status indicators

### Existing Features
- All other pages and flows as documented in the guide

---

## Test Data

The application uses mock data for UI testing. Key test accounts:
- `acc_person_001` - Maria Garcia
- `acc_person_002` - Ana Souza
- `acc_biz_001` - TechCorp Inc

Key test disputes:
- `dsp_001` - Open status
- `dsp_002` - Under Review
- `dsp_003` - Escalated
- `dsp_004` - Resolved

---

## Reporting Issues

When reporting issues, include:
1. **Flow number** from UI_TESTING_GUIDE.md
2. **Step number** where issue occurred
3. **Expected vs Actual** behavior
4. **Screenshot** if visual issue
5. **Console errors** if any
6. **Browser/OS** information

---

*Last Updated: December 14, 2025*

