# x402 SDK Setup - Lessons Learned & Improvements

> **Date:** December 23, 2025  
> **Context:** First-time credential generation for SDK testing

---

## 🐛 Snags Encountered & Solutions

### 1. **API Server Port Mismatch**

**Problem:** Tried port 3456, but server was running on 4000.

**Root Cause:** 
- Documentation or .env showed different port
- Terminal showed server started on 4000

**Solution for First Run:**
```bash
# Always check the running API server first
curl http://localhost:4000/health
# OR check the terminal output where API is running
# OR check apps/api/.env for PORT setting
```

**Permanent Fix:**
- Update all documentation to consistently use port 4000
- Add port check to setup scripts
- Environment variable should default to 4000

---

### 2. **Missing Supabase Environment Variables**

**Problem:** `generate-api-key-for-user.ts` script failed without SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

**Root Cause:**
- Scripts run in isolated shell context
- Environment variables from .env not automatically loaded

**Solution for First Run:**
```bash
# Option A: Export from .env before running scripts
cd /Users/haxaco/Dev/PayOS/apps/api
export $(cat .env | grep -v '^#' | xargs)

# Option B: Inline for single command
SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/script.ts

# Option C: Use dotenv in the script itself (RECOMMENDED)
npx tsx -r dotenv/config scripts/script.ts
```

**Permanent Fix:**
- Update all scripts to load dotenv at the top:
  ```typescript
  import 'dotenv/config';
  ```
- OR create a wrapper script that sources .env first

---

### 3. **Wallet API Field Name (`accountId` vs `ownerAccountId`)**

**Problem:** Used `accountId` in POST /v1/wallets, but API expects `ownerAccountId`.

**Root Cause:**
- API field naming inconsistency
- PRD documentation may use different naming

**Solution for First Run:**
- **Check the API schema first** before making requests
- Use the SDK (when available) instead of raw curl

**Permanent Fix:**
- [ ] Standardize field names across API
- [ ] Update PRD to match actual API implementation
- [ ] Add TypeScript validation to prevent this
- [ ] Sample apps should use SDK (which has correct types)

---

### 4. **Agent Requires Parent Account**

**Problem:** Tried to create agent without `parentAccountId`, got validation error.

**Root Cause:**
- Agents must belong to an account
- Not immediately obvious from PRD

**Solution for First Run:**
1. Create consumer account FIRST
2. Then create agent with `parentAccountId`

**Order of Operations:**
```bash
# ✅ CORRECT ORDER
1. Generate API key
2. Create Provider Account
3. Create Provider Wallet
4. Create Consumer Account  ← Must happen before agent
5. Create Agent (with parentAccountId)
6. Create Agent Wallet
7. Assign wallet to agent
8. Fund wallet
```

**Permanent Fix:**
- [ ] Update PRD with clear dependency diagram
- [ ] Create a setup script that handles order automatically
- [ ] Add better error messages (e.g., "Agent requires parentAccountId. Create an account first.")

---

### 5. **Agent-Wallet Assignment Doesn't Persist**

**Problem:** 
- PATCH /v1/agents/:id with `walletId` succeeded but wallet not shown in response
- PATCH /v1/wallets/:id with `managedByAgentId` also didn't persist

**Root Cause:**
- Wallet-agent relationship may not be fully implemented yet
- Database schema might exist but API logic incomplete

**Solution for First Run:**
- **Workaround:** Pass both `agentId` AND `walletId` to consumer SDK explicitly
- SDK can look up wallet from agent later (future feature)

**Current SDK Usage:**
```typescript
const client = new X402Client({
  apiKey: PAYOS_API_KEY,
  agentId: AGENT_ID,        // Required
  walletId: WALLET_ID,      // Required for now
  apiUrl: PAYOS_API_URL,
  debug: true
});
```

**Permanent Fix (Epic 24):**
- [ ] Implement agent-wallet relationship in API
- [ ] Add `managed_by_agent_id` update logic in wallets route
- [ ] SDK should derive `walletId` from `agentId` automatically
- [ ] Only `apiKey` and `agentId` needed

---

### 6. **Wallet Funding Requires Source Account**

**Problem:** POST /v1/wallets/:id/deposit requires `sourceAccountId`, which we don't have for test funding.

**Root Cause:**
- No "test funding" endpoint for development
- Deposit endpoint designed for real transfers between accounts

**Solution for First Run:**
- **Option A: Direct SQL update (FASTEST for testing)**
  ```typescript
  // Update wallet balance directly via Supabase client
  await supabase
    .from('wallets')
    .update({ balance: 100.00 })
    .eq('id', WALLET_ID);
  ```

- **Option B: Create a "system" funding account**
  ```bash
  # Create once, reuse for all test funding
  SYSTEM_ACCOUNT_ID=xxx
  curl -X POST /v1/internal-transfers \
    -d '{
      "fromAccountId": "SYSTEM_ACCOUNT_ID",
      "toAccountId": "AGENT_ACCOUNT_ID",
      "amount": 100
    }'
  ```

**Permanent Fix:**
- [ ] Add `POST /v1/wallets/:id/fund-test` endpoint (dev only)
- [ ] Seed database with a "Test Funding" account
- [ ] Add balance manipulation to scripts/seed-all.ts

---

## 🚀 Automated Setup Script

To avoid all these snags, create a single setup script:

```typescript
// scripts/setup-x402-test-credentials.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupX402TestCredentials() {
  console.log('🚀 Setting up x402 test credentials...\n');

  // 1. Generate API key
  console.log('1️⃣  Generating API key...');
  const apiKey = await generateApiKey('haxaco@gmail.com');
  
  // 2. Create provider account
  console.log('2️⃣  Creating provider account...');
  const providerAccount = await createAccount(apiKey, {
    name: 'Weather API Provider (Test)',
    type: 'business',
    email: 'weather@test.payos.ai'
  });
  
  // 3. Create provider wallet
  console.log('3️⃣  Creating provider wallet...');
  const providerWallet = await createWallet(apiKey, {
    ownerAccountId: providerAccount.id,
    currency: 'USDC',
    name: 'Provider Revenue Wallet'
  });
  
  // 4. Create consumer account
  console.log('4️⃣  Creating consumer account...');
  const consumerAccount = await createAccount(apiKey, {
    name: 'AI Research Company (Test)',
    type: 'business',
    email: 'research@test.payos.ai'
  });
  
  // 5. Create agent
  console.log('5️⃣  Creating agent...');
  const agent = await createAgent(apiKey, {
    parentAccountId: consumerAccount.id,
    name: 'Weather Research Agent (Test)',
    description: 'AI agent that researches weather data via x402 APIs',
    capabilities: ['api_calls', 'data_analysis']
  });
  
  // 6. Create agent wallet
  console.log('6️⃣  Creating agent wallet...');
  const agentWallet = await createWallet(apiKey, {
    ownerAccountId: consumerAccount.id,
    currency: 'USDC',
    name: 'Agent Spending Wallet'
  });
  
  // 7. Fund agent wallet (direct SQL)
  console.log('7️⃣  Funding agent wallet...');
  await fundWalletDirect(agentWallet.id, 100.00);
  
  // 8. Output credentials
  console.log('\n✅ Setup complete!\n');
  
  const credentials = {
    apiKey,
    provider: {
      accountId: providerAccount.id,
      walletId: providerWallet.id
    },
    consumer: {
      accountId: consumerAccount.id,
      agentId: agent.id,
      agentToken: agent.credentials.token,
      walletId: agentWallet.id
    }
  };
  
  // Write to file
  await writeCredentialsFile(credentials);
  
  // Write .env files for sample apps
  await writeSampleAppEnvFiles(credentials);
  
  console.log('📄 Credentials saved to:');
  console.log('   - docs/X402_TEST_CREDENTIALS.md');
  console.log('   - apps/sample-provider/.env');
  console.log('   - apps/sample-consumer/.env');
  console.log('\n🚀 Ready to test!');
}

setupX402TestCredentials().catch(console.error);
```

**Usage:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/api
npx tsx scripts/setup-x402-test-credentials.ts
```

---

## 📋 Pre-Flight Checklist

Before running credential setup, verify:

- [ ] Supabase is accessible
  ```bash
  curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
    -H "apikey: YOUR_ANON_KEY"
  ```

- [ ] API server is running
  ```bash
  curl http://localhost:4000/health
  ```

- [ ] Environment variables are set
  ```bash
  cd apps/api
  cat .env | grep SUPABASE_URL
  cat .env | grep PORT
  ```

- [ ] User exists in Supabase Auth
  ```bash
  # Check in Supabase dashboard: Authentication > Users
  # OR run: npx tsx scripts/list-users.ts
  ```

- [ ] Database migrations are applied
  ```bash
  # Check latest migration applied
  cd apps/api
  cat supabase/migrations/*.sql | tail -20
  ```

---

## 🎯 Recommended Improvements

### High Priority (P0)

1. **Create automated setup script** - One command to generate all credentials
2. **Standardize API field names** - `accountId` vs `ownerAccountId`
3. **Add agent-wallet relationship** - Auto-assign wallet to agent
4. **Add test funding endpoint** - `/v1/wallets/:id/fund-test` for dev

### Medium Priority (P1)

5. **Update PRD with dependency diagram** - Show creation order
6. **Add dotenv to all scripts** - Automatic .env loading
7. **Better error messages** - Guide users on missing requirements
8. **SDK improvements** - Auto-derive walletId from agentId

### Low Priority (P2)

9. **Setup validation script** - Check prerequisites before starting
10. **Teardown script** - Clean up test data
11. **Reset script** - Start fresh without recreating everything

---

## 🔄 Quick Reset

If you need to start over:

```bash
# Delete test accounts/wallets/agents via SQL
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Delete test data
await supabase.from('agents').delete().ilike('name', '%Test%');
await supabase.from('wallets').delete().ilike('name', '%Test%');
await supabase.from('accounts').delete().ilike('name', '%Test%');
"
```

---

**Next Steps:**
1. Implement automated setup script
2. Add to CI/CD for consistent test environment
3. Update SDK testing guide with this information



