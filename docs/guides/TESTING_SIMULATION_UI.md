# 🧪 Testing the Simulation UI

**Quick guide to test the simulation preview features**

---

## 🚀 Setup

### 1. Start the Backend API
```bash
cd apps/api
npm run dev
```

The API should be running on `http://localhost:8787`

### 2. Start the Web App
```bash
cd apps/web
npm run dev
```

The web app should be running on `http://localhost:3000`

### 3. Configure API Key
1. Go to `http://localhost:3000/dashboard/api-keys`
2. Add your test API key: `pk_test_demo_fintech_key_12345`
3. Or use any valid API key from your database

---

## 🎯 Test Scenarios

### Test 1: Transfer Simulation Preview

**Steps:**
1. Navigate to `http://localhost:3000/dashboard/transfers`
2. Click the **"New Transfer"** button (top right, blue button)
3. A modal should open titled "New Payment"
4. Fill in the form:
   - **From Account**: Select any account (e.g., "Business Account")
   - **To Account**: Select a different account (e.g., "Vendor Account")
   - **Amount**: Enter `100`
   - **Description**: (optional) "Test transfer"
5. Click the **"Preview"** button (blue outline, left button)
6. Wait for simulation to complete (~500ms)
7. A preview modal should open showing:
   - ✅ Status badge ("Ready to Execute" or "Cannot Execute")
   - Transfer flow (from → to)
   - Balance before/after
   - Fee breakdown (platform fee, FX fee, rail fee)
   - Estimated timing
   - Any warnings (yellow alerts)
   - Any errors (red alerts)

**Expected Results:**
- ✅ Preview modal opens
- ✅ All simulation data displays correctly
- ✅ Fees are calculated and shown
- ✅ Balance impact is visible
- ✅ "Confirm & Execute" button is enabled (if can_execute)
- ✅ "Cancel" button closes the modal

**Actions to Test:**
- Click **"Confirm & Execute"** → Transfer should be created, modal closes, success message appears
- Click **"Cancel"** → Modal closes, no transfer created

---

### Test 2: Cross-Currency Transfer with FX

**Steps:**
1. Open "New Transfer" modal
2. Fill in:
   - **From Account**: USD account
   - **To Account**: BRL account (different currency)
   - **Amount**: `1000`
3. Click **"Preview"**
4. Preview modal should show:
   - FX rate section (e.g., "1 USD = 5.85 BRL")
   - Spread information
   - FX fee in addition to platform fee
   - Destination amount in BRL

**Expected Results:**
- ✅ FX rate displayed prominently
- ✅ Spread shown
- ✅ FX fee calculated and displayed
- ✅ Destination receives converted amount

---

### Test 3: Insufficient Balance Error

**Steps:**
1. Open "New Transfer" modal
2. Fill in:
   - **From Account**: Select account
   - **To Account**: Select destination
   - **Amount**: Enter amount **greater than account balance**
3. Click **"Preview"**
4. Preview modal should show:
   - ❌ Red "Cannot Execute" badge
   - Red error alert: "Insufficient balance"
   - "Confirm & Execute" button should be **disabled**

**Expected Results:**
- ✅ Error displayed clearly
- ✅ Cannot execute the transfer
- ✅ Execute button is disabled

---

### Test 4: Low Balance Warning

**Steps:**
1. Open "New Transfer" modal
2. Fill in amount that will leave balance < $5,000
3. Click **"Preview"**
4. Preview modal should show:
   - ✅ Green "Ready to Execute" badge (can still execute)
   - ⚠️ Yellow warning alert: "Balance will be low after this transfer"
   - Warning details showing balance after transfer

**Expected Results:**
- ✅ Warning displayed but transfer can proceed
- ✅ Execute button is enabled
- ✅ User is informed of low balance

---

### Test 5: Large Transfer Warning

**Steps:**
1. Open "New Transfer" modal
2. Fill in amount > 10% of account balance
3. Click **"Preview"**
4. Preview modal should show:
   - ⚠️ Yellow warning: "Transfer amount exceeds 10% of current balance"
   - Warning details with percentage

**Expected Results:**
- ✅ Warning displayed
- ✅ Transfer can still proceed
- ✅ User is informed of large transfer

---

### Test 6: Refund Simulation (Auto-Simulation)

**Steps:**
1. Go to `http://localhost:3000/dashboard/transfers`
2. Find any completed transfer in the list
3. Click the **"Refund"** button (or three-dot menu → Refund)
4. Refund modal opens
5. Select **"Partial Refund"**
6. Enter an amount (e.g., `25.00`)
7. **Wait 500ms** (debounce delay)
8. Inline preview should appear automatically showing:
   - ✅ Green "Refund Eligible" badge
   - Eligibility window expiry countdown
   - Balance impact (source and destination after refund)
   - Original transfer details
   - Any warnings or errors

**Expected Results:**
- ✅ Auto-simulation triggers on amount change
- ✅ Debounce works (doesn't fire on every keystroke)
- ✅ Eligibility status displayed
- ✅ Balance impact shown
- ✅ Submit button enabled/disabled based on eligibility

---

### Test 7: Refund Ineligible (Over Amount)

**Steps:**
1. Open refund modal for a transfer
2. Enter refund amount **greater than original transfer amount**
3. Wait for auto-simulation
4. Should show:
   - ❌ Red "Refund Not Eligible" badge
   - Red error: "Refund amount exceeds available amount"
   - Submit button should be **disabled**

**Expected Results:**
- ✅ Error displayed
- ✅ Cannot submit refund
- ✅ Submit button is disabled

---

### Test 8: Direct Send (No Preview)

**Steps:**
1. Open "New Transfer" modal
2. Fill in all fields
3. Click **"Send"** button (right button, skip preview)
4. Transfer should be created directly without preview

**Expected Results:**
- ✅ Transfer created immediately
- ✅ No preview modal shown
- ✅ Success message appears
- ✅ Modal closes

---

### Test 9: Loading States

**Steps:**
1. Open "New Transfer" modal
2. Fill in form
3. Click **"Preview"**
4. While simulating, button should show:
   - Spinner icon
   - Text: "Simulating..."
   - Button disabled

**Expected Results:**
- ✅ Loading spinner visible
- ✅ Button disabled during simulation
- ✅ Clear feedback to user

---

### Test 10: Error Handling

**Steps:**
1. **Stop the API server** (to simulate network error)
2. Open "New Transfer" modal
3. Fill in form
4. Click **"Preview"**
5. Should show error message

**Expected Results:**
- ✅ Error message displayed
- ✅ No crash or blank screen
- ✅ User can retry or close modal

---

## 🎨 Visual Checks

### Colors
- ✅ Green badges/alerts for success/ready states
- ✅ Red badges/alerts for errors/cannot execute
- ✅ Yellow alerts for warnings
- ✅ Blue for info/neutral states

### Typography
- ✅ Modal titles are clear and readable
- ✅ Amounts are prominent (large, bold)
- ✅ Labels are muted but readable
- ✅ Details are smaller but not too small

### Layout
- ✅ Modal is centered on screen
- ✅ Content is scrollable if too long
- ✅ Buttons are clearly visible
- ✅ Spacing is consistent

### Dark Mode
1. Toggle dark mode in the app
2. Repeat all tests
3. Verify:
   - ✅ All text is readable
   - ✅ Colors adapt correctly
   - ✅ No white flashes or jarring transitions

---

## 📱 Mobile Testing

### Responsive Design
1. Resize browser to mobile width (375px)
2. Open "New Transfer" modal
3. Verify:
   - ✅ Modal fits on screen
   - ✅ Buttons are tappable (not too small)
   - ✅ Form fields are usable
   - ✅ Preview modal is scrollable

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Missing Account Data
If accounts don't have names, the preview shows account IDs instead.
- **Expected**: Graceful fallback to IDs
- **Not a bug**: System should handle missing data

### Issue 2: Very Large Amounts
Amounts > $1,000,000 might overflow in some displays.
- **Test**: Enter `1000000` and verify display
- **Expected**: Numbers should format with commas

### Issue 3: Multiple Warnings
A transfer can have multiple warnings (low balance + large transfer + FX rate).
- **Test**: Create scenario with multiple warnings
- **Expected**: All warnings displayed in list

---

## ✅ Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No blank screens or crashes
- ✅ All data displays correctly
- ✅ Loading states work
- ✅ Error states work
- ✅ Buttons are responsive
- ✅ Modals open and close correctly
- ✅ Simulations complete in < 1 second
- ✅ Auto-simulation debounces correctly
- ✅ Dark mode works

---

## 🆘 Troubleshooting

### Preview Button Does Nothing
- Check browser console for errors
- Verify API is running (`http://localhost:8787`)
- Check API key is configured
- Verify `/api/simulate` route exists

### "Authentication required" Error
- Go to API Keys page
- Add test API key: `pk_test_demo_fintech_key_12345`
- Refresh the page

### Simulation Takes Too Long
- Check API server logs
- Verify database connection
- Check for N+1 queries (should be batched)
- Expected time: < 1 second

### Modal Doesn't Open
- Check browser console
- Verify `SimulationPreviewModal` component exists
- Check `showPreview` state is being set
- Verify no z-index conflicts

### Auto-Simulation Doesn't Trigger
- Wait 500ms after typing (debounce delay)
- Check browser console for errors
- Verify `useEffect` is running
- Check `isValidAmount` condition

---

## 📊 Performance Benchmarks

Expected performance:
- **Single simulation**: < 500ms
- **Batch simulation (10)**: < 1 second
- **Batch simulation (100)**: < 2 seconds
- **Batch simulation (1000)**: < 5 seconds
- **Modal open time**: < 100ms
- **Auto-simulation debounce**: 500ms

---

## 🎉 You're Done!

If all tests pass, the simulation UI is working correctly and ready for production use!

**Questions or issues?** Check:
- [Simulation Engine Demo Guide](./SIMULATION_ENGINE_DEMO.md)
- [UI Integration Guide](./SIMULATION_UI_INTEGRATION_GUIDE.md)
- [Story 28.8 Complete Documentation](../completed/stories/STORY_28.8_COMPLETE.md)



