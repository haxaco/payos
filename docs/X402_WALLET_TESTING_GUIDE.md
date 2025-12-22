# x402 Enhanced Wallet Testing Guide

**Version:** 2.0  
**Date:** December 23, 2025  
**Purpose:** Testing new wallet features including multiple wallet types, external wallets, and Circle integration

---

## 🎯 What's New in Wallet v2

This guide covers the **NEW** wallet features added after the initial x402 implementation:

### **New Features:**
1. ✅ **Multiple Wallet Types** (Internal, Circle Custodial, Circle MPC, External)
2. ✅ **Create New vs Link Existing** wallet flows
3. ✅ **External Wallet Verification** (signature-based)
4. ✅ **Multiple Wallets per Account** (users can have many wallets)
5. ✅ **Circle Integration** (mocked for Phase 1)
6. ✅ **Enhanced Wallet Schema** (17 new fields for custody, compliance, sync)

### **What to Test:**
- Creating different wallet types
- Linking external wallets
- Verifying wallet ownership
- Managing multiple wallets
- Circle wallet creation (mock)
- Wallet type transitions

---

## 🔐 Test Account

**Email:** `haxaco@gmail.com`  
**Password:** `Password123!`

**URLs:**
- Frontend: https://payos.vercel.app
- API: https://payos-production.up.railway.app

---

## 📋 Test Scenario 1: Create Internal Wallet (PayOS Custodial)

### **Goal:** Create a standard PayOS-managed wallet

### **Duration:** 5 minutes

---

### **Step 1: Navigate to Wallets Page**

**UI Path:**
1. Log in to https://payos.vercel.app
2. Click "Wallets" in sidebar (under "x402 Protocol")
3. URL: `/dashboard/x402/wallets`

**Expected:**
- See wallets dashboard
- Stats cards show wallet counts and balances
- "Create Wallet" button visible

---

### **Step 2: Open Wallet Creation Modal**

**UI Steps:**
1. Click "Create Wallet" button (top right)
2. Modal opens with wallet type selection

**Expected Display:**
```
┌─────────────────────────────────────────────┐
│ Create a New Wallet                         │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 🏦 Create New Wallet                │   │
│ │ Create a custodial wallet managed   │   │
│ │ by PayOS                            │   │
│ │                                     │   │
│ │            [Select] →               │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 🔗 Link Existing Wallet             │   │
│ │ Connect a wallet you already own    │   │
│ │ (MetaMask, hardware wallet, etc.)   │   │
│ │                                     │   │
│ │            [Select] →               │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ⚪ Circle Wallet (Coming Soon)      │   │
│ │ Circle Programmable Wallet with MPC │   │
│ │                                     │   │
│ │         [Coming Soon]               │   │
│ └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

### **Step 3: Select "Create New Wallet"**

**UI Steps:**
1. Click "Select" button on "Create New Wallet" card

**Expected:**
- Form appears with fields for new wallet creation
- Form shows:
  - Account selector (dropdown)
  - Wallet name (text input)
  - Purpose (text area, optional)
  - Currency (USDC/EURC radio buttons)
  - Initial balance (number input, optional)
  - Back button (to change selection)

---

### **Step 4: Fill in Wallet Details**

**Test Data:**
```
Account: [Select your business account]
Wallet Name: "Operations Wallet"
Purpose: "Day-to-day operations and API payments"
Currency: USDC
Initial Balance: 1000
```

**UI Steps:**
1. Select account from dropdown
2. Enter "Operations Wallet" as name
3. Enter purpose text
4. Select "USDC" currency
5. Enter "1000" as initial balance
6. Click "Create Wallet"

---

### **Step 5: Verify Wallet Created**

**Expected Result:**
- ✅ Success message: "Wallet created successfully"
- ✅ Modal closes
- ✅ New wallet appears in wallet grid
- ✅ Wallet card shows:
  - Name: "Operations Wallet"
  - Balance: $1,000.00 USDC
  - Type: Internal (badge)
  - Status: Active (green badge)
  - Purpose text visible

**API Verification:**
```bash
curl https://payos-production.up.railway.app/v1/wallets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check Response:**
```json
{
  "data": [
    {
      "id": "wallet_xxx",
      "name": "Operations Wallet",
      "balance": 1000,
      "currency": "USDC",
      "walletType": "internal",
      "custodyType": "custodial",
      "provider": "payos",
      "status": "active",
      "paymentAddress": "internal://payos/tenant_xxx/account_xxx/..."
    }
  ]
}
```

---

### ✅ **Scenario 1 Success Criteria**

- [ ] Wallet creation modal opens
- [ ] Type selection step displays correctly
- [ ] Form fields render properly
- [ ] Wallet created successfully
- [ ] Wallet appears in list
- [ ] Balance is correct
- [ ] Wallet type is "internal"
- [ ] Payment address is internal format
- [ ] Provider is "payos"

---

## 📋 Test Scenario 2: Link External Wallet

### **Goal:** Connect an existing external wallet (MetaMask, hardware wallet, etc.)

### **Duration:** 10 minutes

---

### **Step 1: Open Wallet Creation Modal**

**UI Steps:**
1. Navigate to `/dashboard/x402/wallets`
2. Click "Create Wallet" button
3. Click "Select" on "Link Existing Wallet" card

---

### **Step 2: Fill in External Wallet Details**

**Test Data:**
```
Account: [Select your business account]
Wallet Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
Blockchain: Base
Currency: USDC
Wallet Name: "Hardware Wallet #1"
```

**UI Steps:**
1. Select account from dropdown
2. Enter test wallet address
3. Select "Base" blockchain
4. Select "USDC" currency
5. Enter wallet name
6. Click "Link Wallet"

**Expected:**
- Form validates wallet address format (0x...)
- Blockchain dropdown shows: Base, Ethereum, Polygon, Avalanche
- Info message: "You'll need to verify ownership via signature after linking"

---

### **Step 3: Verify Wallet Linked**

**Expected Result:**
- ✅ Success message: "External wallet linked successfully"
- ✅ Wallet appears in grid with:
  - Name: "Hardware Wallet #1"
  - Balance: $0.00 USDC (not synced yet)
  - Type: External (badge)
  - Status: Unverified (yellow badge)
  - Blockchain: Base
  - Address: 0x742d...bEb1 (truncated)
  - "Verify Ownership" button visible

---

### **Step 4: Verify Wallet Ownership** (Simulated)

**Note:** In Phase 1, verification is mocked. In Phase 2, this will use EIP-712 signatures.

**UI Steps:**
1. Click "Verify Ownership" button on wallet card
2. Modal opens with instructions:
   ```
   Verify Wallet Ownership
   
   To prove you own this wallet, you'll need to:
   1. Sign a message with your wallet
   2. Submit the signature for verification
   
   [Sign with MetaMask] [Sign with WalletConnect]
   ```
3. Click "Sign with MetaMask" (mock for now)

**API Call (mocked):**
```bash
curl -X POST https://payos-production.up.railway.app/v1/wallets/WALLET_ID/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "0xmock_signature",
    "message": "I own this wallet",
    "method": "eip712"
  }'
```

**Expected Result:**
- ✅ Success message: "Wallet ownership verified"
- ✅ Status changes to: Verified (green badge)
- ✅ `verificationStatus` = "verified"
- ✅ `verifiedAt` timestamp set
- ✅ "Sync Balance" button now available

---

### **Step 5: Sync External Wallet Balance** (Mocked)

**UI Steps:**
1. Click "Sync Balance" button
2. Loading indicator appears
3. Balance updates (mock)

**Expected Result:**
- ✅ Balance updates to mock value (e.g., $2,500.00 USDC)
- ✅ `lastSyncedAt` timestamp updated
- ✅ Sync status icon shows "Synced" with timestamp

---

### ✅ **Scenario 2 Success Criteria**

- [ ] Link existing wallet flow works
- [ ] Wallet address validated
- [ ] Blockchain selector works
- [ ] Wallet appears as "external" type
- [ ] Initial status is "unverified"
- [ ] Verification flow accessible
- [ ] Status updates to "verified" after verification
- [ ] Balance sync available after verification
- [ ] External address displayed correctly

---

## 📋 Test Scenario 3: Multiple Wallets per Account

### **Goal:** Verify users can create and manage multiple wallets

### **Duration:** 10 minutes

---

### **Step 1: Create Multiple Wallets**

**Create 3 different wallets for the same account:**

**Wallet 1: Internal (Operations)**
- Name: "Operations Wallet"
- Type: Internal
- Currency: USDC
- Balance: $1,000

**Wallet 2: Internal (Compliance)**
- Name: "Compliance Bot Wallet"
- Type: Internal
- Currency: USDC
- Balance: $500

**Wallet 3: External**
- Name: "Treasury Wallet"
- Type: External
- Address: 0xAbc...123
- Currency: USDC

---

### **Step 2: View All Wallets**

**UI Path:**
1. Go to `/dashboard/x402/wallets`
2. View wallet grid

**Expected Display:**
```
┌──────────────────────────────────────────┐
│ 📊 Stats                                  │
├──────────────────────────────────────────┤
│ Total Wallets: 3                         │
│ Total Balance: $1,500.00 USDC            │
│ Internal: 2  External: 1                 │
└──────────────────────────────────────────┘

┌────────────────┬────────────────┬────────────────┐
│ Operations     │ Compliance Bot │ Treasury       │
│ Wallet         │ Wallet         │ Wallet         │
│                │                │                │
│ $1,000.00 USDC │ $500.00 USDC   │ $2,500.00 USDC │
│ Internal       │ Internal       │ External       │
│ Active         │ Active         │ Verified       │
└────────────────┴────────────────┴────────────────┘
```

**What to Verify:**
- ✅ All 3 wallets appear
- ✅ Each has unique name
- ✅ Balances display correctly
- ✅ Types are labeled correctly
- ✅ Stats card shows correct totals
- ✅ Can filter by wallet type
- ✅ Can search by name

---

### **Step 3: Manage Individual Wallets**

**Test Operations on Each Wallet:**

1. **Deposit to Operations Wallet:**
   - Click "Deposit" button
   - Enter $500
   - Verify balance → $1,500

2. **Withdraw from Compliance Wallet:**
   - Click "Withdraw" button
   - Enter $100
   - Verify balance → $400

3. **Sync Treasury Wallet:**
   - Click "Sync" button
   - Verify balance updates
   - Check `lastSyncedAt` timestamp

---

### **Step 4: Test Wallet Selection in Payments**

**When making an x402 payment:**
1. Navigate to x402 payment flow
2. Check wallet selector dropdown

**Expected:**
- ✅ All active wallets appear in dropdown
- ✅ Each shows: Name, Balance, Currency
- ✅ Can select any wallet for payment
- ✅ Only wallets with sufficient balance are usable

---

### ✅ **Scenario 3 Success Criteria**

- [ ] Can create multiple wallets per account
- [ ] All wallets display in dashboard
- [ ] Stats cards aggregate correctly
- [ ] Can manage each wallet independently
- [ ] Deposit/withdraw work per wallet
- [ ] Wallet selector shows all wallets
- [ ] Can filter/search wallets
- [ ] No limit on wallet count

---

## 📋 Test Scenario 4: Circle Wallet Integration (Mocked)

### **Goal:** Test Circle Programmable Wallet creation (Phase 1 mock)

### **Duration:** 10 minutes

### **Note:** This is currently MOCKED. Real Circle integration comes in Phase 2.

---

### **Step 1: Attempt Circle Wallet Creation**

**UI Steps:**
1. Navigate to `/dashboard/x402/wallets`
2. Click "Create Wallet"
3. Observe "Circle Wallet" option

**Expected:**
- ✅ "Circle Wallet (Coming Soon)" badge visible
- ✅ Button is disabled
- ✅ Tooltip explains: "Circle integration coming in Phase 2"

---

### **Step 2: Create Circle Wallet via API** (Mock)

**API Call:**
```bash
curl -X POST https://payos-production.up.railway.app/v1/wallets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerAccountId": "YOUR_ACCOUNT_ID",
    "name": "Circle MPC Wallet",
    "walletType": "circle_mpc",
    "currency": "USDC"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "id": "wallet_xxx",
    "name": "Circle MPC Wallet",
    "walletType": "circle_mpc",
    "custodyType": "mpc",
    "provider": "circle",
    "providerWalletId": "mock_circle_wa_xxx",
    "paymentAddress": "0xMOCK_ADDRESS_FROM_CIRCLE",
    "network": "base-mainnet",
    "status": "active",
    "balance": 0,
    "currency": "USDC"
  }
}
```

---

### **Step 3: Verify Mock Circle Wallet**

**What to Check:**
- ✅ `walletType` = "circle_mpc"
- ✅ `custodyType` = "mpc"
- ✅ `provider` = "circle"
- ✅ `providerWalletId` is set (mock ID)
- ✅ `paymentAddress` looks like Ethereum address
- ✅ `providerMetadata` contains mock Circle data

**API Verification:**
```bash
curl https://payos-production.up.railway.app/v1/wallets/WALLET_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check `providerMetadata`:**
```json
{
  "providerMetadata": {
    "walletSet": "mock_set_123",
    "entityId": "mock_entity_456",
    "blockchain": "ETH-SEPOLIA",
    "accountType": "SCA",
    "updateDate": "2025-12-23T10:30:00Z",
    "createDate": "2025-12-23T10:30:00Z",
    "_mock": true
  }
}
```

---

### ✅ **Scenario 4 Success Criteria**

- [ ] Circle option visible in UI (disabled)
- [ ] Can create Circle wallet via API (mock)
- [ ] Wallet type set to "circle_mpc" or "circle_custodial"
- [ ] Provider set to "circle"
- [ ] Provider wallet ID generated
- [ ] Payment address looks valid
- [ ] Provider metadata populated
- [ ] Mock flag indicates Phase 1 status

---

## 📋 Test Scenario 5: Wallet Type-Specific Features

### **Goal:** Verify different behaviors for different wallet types

### **Duration:** 15 minutes

---

### **Feature Matrix:**

| Feature | Internal | External | Circle |
|---------|----------|----------|--------|
| PayOS-managed balance | ✅ | ❌ | ✅ (mock) |
| Requires verification | ❌ | ✅ | ❌ |
| Balance sync | ❌ | ✅ | ✅ (mock) |
| Direct deposit | ✅ | ❌ | ✅ (mock) |
| Custody type | custodial | self | mpc/custodial |
| On-chain address | ❌ | ✅ | ✅ (mock) |

---

### **Test 1: Internal Wallet**

**What to Test:**
1. Create internal wallet
2. Deposit funds directly
3. Withdraw funds directly
4. Use in x402 payments
5. Check payment address format: `internal://payos/...`

**Expected:**
- ✅ No verification required
- ✅ Deposits instant
- ✅ Withdrawals instant
- ✅ Balance managed by PayOS
- ✅ No blockchain sync needed

---

### **Test 2: External Wallet**

**What to Test:**
1. Link external wallet
2. Verify ownership (signature)
3. Sync balance from blockchain (mock)
4. Try to deposit (should show message about funding externally)
5. Use in x402 payments

**Expected:**
- ✅ Verification required before use
- ✅ Sync button available
- ✅ Direct deposit disabled (must fund externally)
- ✅ Balance read-only (synced from blockchain)
- ✅ Shows real blockchain address

---

### **Test 3: Circle Wallet (Mocked)**

**What to Test:**
1. Create Circle wallet via API
2. Check provider metadata
3. Sync balance (mock)
4. Use in x402 payments

**Expected:**
- ✅ Provider wallet ID assigned
- ✅ MPC custody type
- ✅ Mock blockchain address
- ✅ Provider metadata populated
- ✅ Can be used in payments

---

### ✅ **Scenario 5 Success Criteria**

- [ ] Each wallet type has unique behaviors
- [ ] Internal wallets fully managed by PayOS
- [ ] External wallets require verification
- [ ] External wallet balance is read-only
- [ ] Circle wallets have provider metadata
- [ ] Payment flows work with all types
- [ ] Type-specific UI elements display

---

## 🤖 Automated Testing

### **New Wallet Features Test Script:**

```bash
cd /Users/haxaco/Dev/PayOS

# Test all new wallet features
tsx scripts/test-wallet-features.ts
```

### **What It Tests:**
1. Create internal wallet
2. Create multiple wallets per account
3. Link external wallet
4. Verify external wallet ownership
5. Create Circle wallet (mock)
6. Sync external wallet balance
7. Deposit/withdraw operations
8. Wallet type validation

---

## 📊 Test Results Template

```markdown
## Wallet v2 Testing Report

**Date:** YYYY-MM-DD
**Tester:** [Name/Gemini]
**Environment:** Production / Local

### Scenario 1: Internal Wallet
- [ ] All steps completed
- [ ] Wallet created successfully
- [ ] Balance management works
- Issues: [None / List]

### Scenario 2: External Wallet
- [ ] Link flow works
- [ ] Verification accessible
- [ ] Balance sync works
- Issues: [None / List]

### Scenario 3: Multiple Wallets
- [ ] Created 3+ wallets
- [ ] All display correctly
- [ ] Independent management works
- Issues: [None / List]

### Scenario 4: Circle Integration
- [ ] Mock API tested
- [ ] Metadata validated
- [ ] Provider fields correct
- Issues: [None / List]

### Scenario 5: Type-Specific Features
- [ ] Internal wallet fully functional
- [ ] External wallet read-only balance
- [ ] Circle wallet mocked correctly
- Issues: [None / List]

### Overall Status
- **Passed:** X/5 scenarios
- **Failed:** Y/5 scenarios
- **Blockers:** [None / List]
- **Ready for Phase 2:** [Yes / No]
```

---

## ✅ Final Checklist

### **Wallet Creation**
- [ ] Can create internal wallets
- [ ] Can link external wallets
- [ ] Can create Circle wallets (API)
- [ ] Type selection UI works

### **Wallet Management**
- [ ] Multiple wallets per account supported
- [ ] Each wallet manageable independently
- [ ] Wallet stats aggregate correctly
- [ ] Search/filter works

### **Wallet Verification**
- [ ] External wallets require verification
- [ ] Verification flow accessible
- [ ] Status updates correctly
- [ ] Verified wallets usable

### **Wallet Types**
- [ ] Internal: Full PayOS management
- [ ] External: Read-only balance, sync available
- [ ] Circle: Provider metadata populated
- [ ] Type-specific UI elements display

### **Integration**
- [ ] All wallet types work in x402 payments
- [ ] Wallet selector shows all wallets
- [ ] Balance checks work per type
- [ ] Payment proofs include wallet info

---

**Wallet v2 Testing Complete!** 🎉

*This guide ensures comprehensive validation of all enhanced wallet features.*

