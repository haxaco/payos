# x402 SDK Test Credentials

> **Generated:** December 23, 2025  
> **API Server:** http://localhost:4000  
> **Dashboard:** http://localhost:3000

---

## 🔑 API Key (User-Scoped)

```bash
PAYOS_API_KEY=pk_test_pDIlJq3V3eMNdnBw2FTf10wVj1fUUzvnaaPKbK3StNg
```

---

## 🏢 Provider Credentials (Weather API)

| Field | Value |
|-------|-------|
| **Account Name** | Weather API Provider (Test) |
| **Account ID** | `054ad8f1-78b5-41ae-98b7-c84802ed52ae` |
| **Wallet ID** | `7a1fa1b0-95a7-4b68-812c-fd7cf3504c13` |
| **Wallet Balance** | $0.00 USDC (will receive payments) |

**Environment Variables:**
```bash
PAYOS_ACCOUNT_ID=054ad8f1-78b5-41ae-98b7-c84802ed52ae
```

---

## 🤖 Consumer Credentials (AI Agent)

| Field | Value |
|-------|-------|
| **Company Name** | AI Research Company (Test) |
| **Account ID** | `f9c37b69-26d8-4a66-a91e-18e77c8e566f` |
| **Agent Name** | Weather Research Agent (Test) |
| **Agent ID** | `7549e236-5a42-41fa-86b7-cc70fec64e8c` |
| **Agent Token** | `agent_BPdeBuin-wv7D2TP7XAG_teyP9VnuiHz` ⚠️ **SAVE THIS!** |
| **Wallet ID** | `d199d814-5f53-4300-b1c8-81bd6ce5f00a` |
| **Wallet Balance** | $100.00 USDC (funded for testing) |

**Environment Variables:**
```bash
PAYOS_AGENT_ID=7549e236-5a42-41fa-86b7-cc70fec64e8c
PAYOS_WALLET_ID=d199d814-5f53-4300-b1c8-81bd6ce5f00a
```

---

## 🚀 Quick Start

### Terminal 1 - Start Provider

```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-provider
PAYOS_API_KEY=pk_test_pDIlJq3V3eMNdnBw2FTf10wVj1fUUzvnaaPKbK3StNg \
PAYOS_ACCOUNT_ID=054ad8f1-78b5-41ae-98b7-c84802ed52ae \
pnpm dev
```

Expected output:
- Server starts on port 4000
- Endpoints register with PayOS
- Free endpoint available at `/api/weather/current`
- Paid endpoint protected at `/api/weather/forecast`

### Terminal 2 - Test Consumer

```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
PAYOS_API_KEY=pk_test_pDIlJq3V3eMNdnBw2FTf10wVj1fUUzvnaaPKbK3StNg \
PAYOS_AGENT_ID=7549e236-5a42-41fa-86b7-cc70fec64e8c \
PAYOS_WALLET_ID=d199d814-5f53-4300-b1c8-81bd6ce5f00a \
pnpm dev
```

Expected output:
- Interactive demo runs
- Shows wallet balance ($100)
- Calls free endpoint (no payment)
- Calls paid endpoint (auto-payment)
- Shows updated balance ($99.999 after $0.001 payment)

---

## 📝 Notes

### Agent Wallet Assignment
⚠️ Currently manual - you must pass both `agentId` and `walletId` to the consumer SDK.

**Epic 24** will automate this:
- Agents will get their own API keys
- Wallet will be auto-derived from agent authentication
- Only `apiKey` will be needed

### Dashboard Views

**Provider View:** http://localhost:3000/dashboard/x402
- Total Revenue
- API Calls
- Active Endpoints
- Recent Transactions

**Consumer View:** http://localhost:3000/dashboard/x402?view=consumer
- Total Spent
- API Calls Made
- Payment History

### Security

🔒 **Agent Token:** This token is shown only once during agent creation. It cannot be retrieved later. Save it securely!

For this test environment, the token is stored in this file for convenience.

---

## 🐛 Troubleshooting

### Provider won't start
- Check API server is running: `curl http://localhost:4000/health`
- Verify API key is correct
- Check account ID matches the created account

### Consumer payment fails
- Verify wallet has balance: `curl http://localhost:4000/v1/wallets/WALLET_ID -H "Authorization: Bearer API_KEY"`
- Check wallet ID is correct
- Ensure provider is running and accepting requests

### 402 response but payment not processed
- Check consumer SDK debug logs (set `debug: true`)
- Verify PayOS API is accessible
- Check agent has permission to initiate transactions

---

## 📊 Test Results Tracking

### Provider Tests
- [ ] Server starts successfully
- [ ] Endpoints register with PayOS
- [ ] Free endpoint returns data (200)
- [ ] Paid endpoint returns 402 with headers
- [ ] Dashboard shows registered endpoints

### Consumer Tests
- [ ] SDK initializes with credentials
- [ ] Free endpoint call succeeds
- [ ] 402 detected on paid endpoint
- [ ] Payment processes automatically
- [ ] Request retries with proof
- [ ] Data returned successfully
- [ ] Wallet balance decreases
- [ ] Dashboard shows transaction

### E2E Tests
- [ ] Multiple payments work
- [ ] Both dashboards show correct data
- [ ] Transfer detail shows x402 metadata
- [ ] Dark mode is readable
- [ ] Error handling works

---

## 🔄 Regenerating Credentials

If you need fresh credentials:

```bash
cd /Users/haxaco/Dev/PayOS/apps/api

# Generate new API key
npx tsx scripts/generate-api-key-for-user.ts haxaco@gmail.com

# Create new accounts/agents via API
# (Use the commands from the test setup)
```

---

**Last Updated:** December 23, 2025



