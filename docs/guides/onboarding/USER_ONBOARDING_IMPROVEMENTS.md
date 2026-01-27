# User Onboarding Improvements - API & PRD Fixes

> **Context:** The automated setup script solves our internal testing problems, but external users won't have access to it. This document outlines the API improvements and PRD updates needed for smooth user onboarding.

---

## 🎯 Goal

Enable external users (providers and consumers) to set up x402 credentials through:
1. **Dashboard UI** (point-and-click, guided flow)
2. **Public API** (programmatic setup for automation)
3. **Clear Documentation** (PRD that works first time)

Without requiring any internal scripts or workarounds.

---

## 🔧 Required API Improvements

### Priority 0 (Blocking Issues)

#### Fix 1: Standardize Wallet Creation Field Names

**Problem:** API expects `ownerAccountId` but users might try `accountId` (more intuitive)

**Solution:**
```typescript
// apps/api/src/routes/wallets.ts

// BEFORE (confusing)
const schema = z.object({
  ownerAccountId: z.string(),
  // ...
});

// AFTER (accept both, prefer accountId)
const schema = z.object({
  accountId: z.string().optional(),
  ownerAccountId: z.string().optional(),
  // ...
}).refine(data => data.accountId || data.ownerAccountId, {
  message: "Either accountId or ownerAccountId is required"
});

// Normalize internally
const normalizedAccountId = body.accountId || body.ownerAccountId;
```

**User Impact:** No more field name confusion

---

#### Fix 2: Implement Agent-Wallet Auto-Assignment

**Problem:** PATCH /v1/agents/:id with `walletId` doesn't persist the relationship

**Solution A: Backend Logic (Recommended)**
```typescript
// apps/api/src/routes/agents.ts

// When creating an agent, optionally accept walletId
const createSchema = z.object({
  parentAccountId: z.string(),
  name: z.string(),
  walletId: z.string().optional(), // ← Accept wallet assignment on creation
  // ...
});

// If walletId provided, update wallet's managed_by_agent_id
if (body.walletId) {
  await supabase
    .from('wallets')
    .update({ managed_by_agent_id: agentId })
    .eq('id', body.walletId)
    .eq('owner_account_id', body.parentAccountId); // Security: only assign wallets from same account
}
```

**Solution B: Database Constraint (Epic 24)**
```sql
-- Add trigger to auto-create wallet when agent is created
CREATE OR REPLACE FUNCTION create_agent_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (
    owner_account_id,
    managed_by_agent_id,
    name,
    currency,
    status
  ) VALUES (
    NEW.parent_account_id,
    NEW.id,
    NEW.name || ' Wallet',
    'USDC',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_wallet_auto_create
  AFTER INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_wallet();
```

**User Impact:** Agents automatically get wallets OR can assign existing wallets easily

---

#### Fix 3: Add Test Wallet Funding Endpoint

**Problem:** `POST /v1/wallets/:id/deposit` requires `sourceAccountId` which test users don't have

**Solution: Add Development-Only Funding Endpoint**
```typescript
// apps/api/src/routes/wallets.ts

/**
 * POST /v1/wallets/:id/fund-test
 * Development-only endpoint to fund wallets for testing
 * Disabled in production via environment check
 */
app.post('/v1/wallets/:id/fund-test', async (c) => {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 403);
  }
  
  const { id } = c.req.param();
  const { amount } = await c.req.json();
  
  // Validate amount
  if (amount < 0 || amount > 10000) {
    return c.json({ error: 'Amount must be between 0 and 10000' }, 400);
  }
  
  // Update balance directly (test funding)
  const { data: wallet, error } = await supabase
    .from('wallets')
    .update({ 
      balance: supabase.rpc('increment_balance', { amount }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return c.json({ error: error.message }, 400);
  }
  
  return c.json({ 
    data: wallet,
    message: `Wallet funded with ${amount} ${wallet.currency} (test mode)` 
  });
});
```

**Alternative: Seed "Test Funding Account"**
```typescript
// apps/api/scripts/seed-test-funding-account.ts

// Create a system account that exists in all environments
const systemAccount = await supabase
  .from('accounts')
  .insert({
    tenant_id: SYSTEM_TENANT_ID,
    type: 'system',
    name: 'Test Funding Account',
    email: 'funding@system.payos.ai',
    // Infinite balance for test funding
  });

// Users can then do:
// POST /v1/internal-transfers
// {
//   "fromAccountId": "system_funding_account",
//   "toAccountId": "user_account",
//   "amount": 100
// }
```

**User Impact:** Easy wallet funding for testing without complex setup

---

#### Fix 4: Better Error Messages with Next Steps

**Problem:** Errors like "parentAccountId required" don't explain what to do

**Solution: Enhanced Error Responses**
```typescript
// apps/api/src/middleware/error.ts

interface EnhancedError {
  error: string;
  code: string;
  details?: any;
  suggestion?: string;  // ← Add actionable suggestion
  docsUrl?: string;     // ← Link to relevant docs
}

// Example in agents route:
if (!body.parentAccountId) {
  return c.json({
    error: 'Validation failed',
    code: 'MISSING_PARENT_ACCOUNT',
    details: { parentAccountId: ['Required'] },
    suggestion: 'Create an account first, then use its ID as parentAccountId',
    docsUrl: 'https://docs.payos.ai/guides/create-agent'
  }, 400);
}
```

**User Impact:** Users know exactly what to do when they hit an error

---

### Priority 1 (UX Improvements)

#### Fix 5: Add "Onboarding Wizard" API Endpoint

**Problem:** Users need to make 5+ sequential API calls to get started

**Solution: Single Endpoint for Complete Setup**
```typescript
// apps/api/src/routes/onboarding.ts

/**
 * POST /v1/onboarding/setup-x402-consumer
 * Creates account, agent, and wallet in one call
 */
app.post('/v1/onboarding/setup-x402-consumer', async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    accountName: z.string(),
    accountType: z.enum(['person', 'business']),
    agentName: z.string(),
    agentDescription: z.string().optional(),
    walletName: z.string().default('Agent Spending Wallet'),
    initialFunding: z.number().min(0).max(10000).optional(), // Test funding
  });
  
  const data = schema.parse(body);
  
  // Create everything in one transaction
  const result = await db.transaction(async (tx) => {
    // 1. Create account
    const account = await tx.from('accounts').insert({
      tenant_id: c.get('tenantId'),
      name: data.accountName,
      type: data.accountType,
      // ...
    }).single();
    
    // 2. Create agent
    const agent = await tx.from('agents').insert({
      parent_account_id: account.id,
      name: data.agentName,
      description: data.agentDescription,
      // ...
    }).single();
    
    // 3. Create wallet
    const wallet = await tx.from('wallets').insert({
      owner_account_id: account.id,
      managed_by_agent_id: agent.id,
      name: data.walletName,
      balance: data.initialFunding || 0,
      // ...
    }).single();
    
    return { account, agent, wallet };
  });
  
  return c.json({
    data: result,
    message: 'x402 consumer setup complete',
    nextSteps: [
      'Save your agent token (shown once)',
      'Fund your wallet if needed',
      'Install x402 client SDK',
      'Start making API calls'
    ]
  });
});

/**
 * POST /v1/onboarding/setup-x402-provider
 * Creates provider account and wallet in one call
 */
app.post('/v1/onboarding/setup-x402-provider', async (c) => {
  // Similar pattern for provider setup
});
```

**User Impact:** One API call instead of 5+ calls

---

#### Fix 6: Add Idempotency to Creation Endpoints

**Problem:** If user's script fails halfway, re-running creates duplicates

**Solution: Idempotency Keys**
```typescript
// All POST endpoints accept optional idempotency key
const schema = z.object({
  idempotencyKey: z.string().optional(),
  // ... other fields
});

// Check if this key was used before
if (body.idempotencyKey) {
  const existing = await redis.get(`idempotency:${body.idempotencyKey}`);
  if (existing) {
    return c.json(JSON.parse(existing)); // Return cached response
  }
}

// Create entity...
const result = await createEntity(body);

// Cache response
if (body.idempotencyKey) {
  await redis.set(
    `idempotency:${body.idempotencyKey}`,
    JSON.stringify(result),
    'EX',
    86400 // 24 hours
  );
}
```

**User Impact:** Safe to retry failed requests without creating duplicates

---

## 📚 Required PRD Updates

### Update 1: Add Complete Setup Flow Diagram

**Add to `docs/SAMPLE_APPS_PRD.md`:**

```markdown
## Setup Flow Diagram

### Option A: Quick Setup (Single API Call)

```
┌─────────────────────────────────────────────────────────┐
│ POST /v1/onboarding/setup-x402-consumer                │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   "accountName": "My AI Company",                      │
│   "accountType": "business",                           │
│   "agentName": "Research Agent",                       │
│   "initialFunding": 100  // Optional test funding      │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Response: {                                             │
│   account: { id, name, ... },                          │
│   agent: { id, token, ... },      ← Save this token!   │
│   wallet: { id, balance, ... }                         │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

### Option B: Step-by-Step Setup (Granular Control)

```
1. Create Account
   POST /v1/accounts
   { "name": "My AI Company", "type": "business" }
   → Returns: accountId

2. Create Agent (under account)
   POST /v1/agents
   { 
     "parentAccountId": "<from step 1>",
     "name": "Research Agent"
   }
   → Returns: agentId, agentToken ⚠️ SAVE THIS!

3. Create Wallet (auto-assigned to agent)
   POST /v1/wallets
   { 
     "accountId": "<from step 1>",
     "assignToAgent": "<from step 2>"  ← New field!
   }
   → Returns: walletId

4. Fund Wallet (test mode)
   POST /v1/wallets/:id/fund-test
   { "amount": 100 }
   → Returns: updated balance
```

---

### Update 2: Document Field Name Aliases

```markdown
## API Field Names

### Wallet Creation

Both field names are accepted (prefer `accountId` for clarity):

✅ Recommended:
```json
{
  "accountId": "acc_123",
  "currency": "USDC",
  "name": "My Wallet"
}
```

✅ Also works (legacy):
```json
{
  "ownerAccountId": "acc_123",
  "currency": "USDC",
  "name": "My Wallet"
}
```

**Why two names?** Historical reasons. Use `accountId` for new integrations.
```

---

### Update 3: Add Error Troubleshooting Section

```markdown
## Common Errors & Solutions

### "parentAccountId required"

**Error:**
```json
{
  "error": "Validation failed",
  "fieldErrors": { "parentAccountId": ["Required"] }
}
```

**Cause:** Agents must belong to an account.

**Solution:** Create an account first:
```bash
# 1. Create account
curl -X POST /v1/accounts \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"name": "My Company", "type": "business"}'

# 2. Use returned accountId when creating agent
curl -X POST /v1/agents \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"parentAccountId": "acc_123", "name": "My Agent"}'
```

### "sourceAccountId required"

**Error:**
```json
{
  "error": "Validation failed",
  "details": { "sourceAccountId": ["Required"] }
}
```

**Cause:** Regular deposits require a source account.

**Solution for Testing:** Use test funding endpoint:
```bash
curl -X POST /v1/wallets/wal_123/fund-test \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"amount": 100}'
```

**Solution for Production:** Transfer from another account:
```bash
curl -X POST /v1/internal-transfers \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "fromAccountId": "acc_source",
    "toAccountId": "acc_destination",
    "amount": 100
  }'
```

[Add section for each snag we encountered]
```

---

### Update 4: Add Prerequisites Checklist

```markdown
## Before You Start

Ensure you have:

- [ ] **API Access**
  - PayOS account created
  - API key generated (Dashboard → Settings → API Keys)
  - API key saved securely

- [ ] **API Server**
  - Development: `http://localhost:4000` (for local testing)
  - Production: `https://api.payos.ai`

- [ ] **Environment Variables**
  ```bash
  export PAYOS_API_KEY="pk_test_..."
  export PAYOS_API_URL="https://api.payos.ai"
  ```

- [ ] **Tools**
  - cURL, Postman, or HTTP client
  - OR: Install SDK (`npm install @sly/x402-client-sdk`)

### Quick Health Check

```bash
# Verify API is accessible
curl $PAYOS_API_URL/health

# Verify your API key works
curl $PAYOS_API_URL/v1/accounts \
  -H "Authorization: Bearer $PAYOS_API_KEY"
```

If either fails, refer to [Troubleshooting Guide](#troubleshooting).
```

---

## 🎨 Dashboard UI Improvements

### Add Guided Setup Wizard

**New Page:** `/dashboard/onboarding/x402-setup`

```typescript
// apps/web/src/app/dashboard/onboarding/x402-setup/page.tsx

export default function X402SetupWizard() {
  const [step, setStep] = useState(1);
  
  return (
    <div>
      <h1>x402 Setup Wizard</h1>
      
      {/* Progress bar */}
      <ProgressBar current={step} total={4} />
      
      {step === 1 && (
        <StepCreateAccount
          onSuccess={(accountId) => {
            setAccountId(accountId);
            setStep(2);
          }}
        />
      )}
      
      {step === 2 && (
        <StepCreateAgent
          accountId={accountId}
          onSuccess={(agentId, agentToken) => {
            setAgentId(agentId);
            setAgentToken(agentToken);
            setStep(3);
          }}
        />
      )}
      
      {step === 3 && (
        <StepCreateWallet
          accountId={accountId}
          agentId={agentId}
          onSuccess={(walletId) => {
            setWalletId(walletId);
            setStep(4);
          }}
        />
      )}
      
      {step === 4 && (
        <StepComplete
          accountId={accountId}
          agentId={agentId}
          agentToken={agentToken}
          walletId={walletId}
        />
      )}
    </div>
  );
}
```

**Features:**
- Point-and-click interface (no API knowledge needed)
- Auto-saves progress (can resume if interrupted)
- Shows generated credentials at each step
- Downloads `.env` file at the end
- Links to SDK docs and sample apps

---

## 🚀 Implementation Plan

### Phase 1: Critical API Fixes (P0)

| Task | Story | Est | Priority |
|------|-------|-----|----------|
| Standardize wallet field names | 24.11 | 2h | P0 |
| Implement agent-wallet assignment | 24.12 | 3h | P0 |
| Add test funding endpoint | 24.13 | 2h | P0 |
| Enhanced error messages | 24.14 | 2h | P0 |
| **Total** | | **9h** | |

### Phase 2: UX Improvements (P1)

| Task | Story | Est | Priority |
|------|-------|-----|----------|
| Onboarding wizard endpoints | 24.15 | 4h | P1 |
| Idempotency support | 24.16 | 3h | P1 |
| Dashboard setup wizard | 24.17 | 6h | P1 |
| **Total** | | **13h** | |

### Phase 3: Documentation (P1)

| Task | Story | Est | Priority |
|------|-------|-----|----------|
| Update PRD with flow diagrams | 24.18 | 2h | P1 |
| Add error troubleshooting guide | 24.19 | 2h | P1 |
| Add prerequisites checklist | 24.20 | 1h | P1 |
| Record video walkthrough | 24.21 | 2h | P2 |
| **Total** | | **7h** | |

**Grand Total: 29 hours (~4 days)**

---

## ✅ Success Criteria

A first-time user should be able to:

1. **Read the PRD** and understand what to do
2. **Follow the steps** without hitting confusing errors
3. **Complete setup** in < 15 minutes (guided) or < 5 minutes (wizard)
4. **Get helpful errors** if something goes wrong
5. **Resume setup** if interrupted (idempotency)

We'll know it works when:
- [ ] External beta testers complete setup without asking for help
- [ ] Support tickets for "setup issues" drop to near zero
- [ ] Setup wizard completion rate > 90%

---

## 📋 Next Steps

1. **Prioritize fixes** - Which snags are most critical?
2. **Create stories** - Break down into implementable tasks
3. **Update Epic 24** - Add these stories to the PRD
4. **Implement & test** - Start with P0 API fixes
5. **Update docs** - Keep PRD in sync with API changes

---

**TL;DR:** The automated script was a band-aid. Now we need to fix the underlying issues so users don't need the script at all.



