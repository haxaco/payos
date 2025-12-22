# Wallet Schema Analysis - Phase 2 Readiness

**Date:** December 23, 2025  
**Purpose:** Ensure wallet schema supports both internal and external (Circle) wallets  
**Goal:** Enable "Create from scratch" AND "Add existing wallet" flows

---

## 🔍 Current Schema vs Requirements

### **What We Have:**

```sql
wallets (
  id UUID,
  tenant_id UUID,
  owner_account_id UUID,
  managed_by_agent_id UUID,  -- Optional agent
  balance DECIMAL(15,4),
  currency TEXT,              -- USDC/EURC only
  wallet_address TEXT,        -- Internal ID or on-chain address
  network TEXT,               -- base-mainnet, etc.
  spending_policy JSONB,
  status TEXT,                -- active/frozen/depleted
  name TEXT,
  purpose TEXT,
  created_at, updated_at
)
```

### **What's Missing:**

| Category | Field | Why Needed |
|----------|-------|------------|
| **Wallet Type** | `wallet_type` | Distinguish internal vs Circle vs external |
| **Wallet Type** | `custody_type` | self-custody, custodial, MPC |
| **External Provider** | `provider` | circle, coinbase, external |
| **External Provider** | `provider_wallet_id` | Circle's wallet ID |
| **External Provider** | `provider_wallet_set_id` | Circle wallet set ID |
| **External Provider** | `provider_entity_id` | Circle entity/customer ID |
| **Verification** | `verification_status` | unverified, pending, verified |
| **Verification** | `verification_method` | signature, kyc_linked, api_verified |
| **Verification** | `verified_at` | Timestamp of verification |
| **On-Chain** | `blockchain` | ETH, BASE, POLYGON, AVAX, SOL |
| **On-Chain** | `token_contract` | USDC contract address on-chain |
| **Sync** | `last_synced_at` | Last balance sync from external |
| **Sync** | `sync_enabled` | Auto-sync with on-chain? |
| **Compliance** | `kyc_status` | Required for real stablecoins |
| **Compliance** | `aml_cleared` | Anti-money laundering status |
| **Compliance** | `sanctions_status` | Sanctions screening result |
| **Risk** | `risk_score` | Compliance risk assessment |
| **Metadata** | `provider_metadata` JSONB | Circle-specific data |

---

## 📊 Wallet Types We Need to Support

### **Type 1: Internal Wallet** (Current - Phase 1)
```
wallet_type: 'internal'
custody_type: 'custodial'
provider: 'payos'
balance: tracked internally
verification: automatic (user owns account)
```

**Use Case:** PayOS internal ledger for PoC, testing, demos

---

### **Type 2: Circle Custodial Wallet** (Phase 2)
```
wallet_type: 'circle_custodial'
custody_type: 'custodial'
provider: 'circle'
provider_wallet_id: 'wa_xxx'
provider_wallet_set_id: 'ws_xxx'
balance: synced from Circle API
verification: automatic via Circle KYC
```

**Use Case:** Business users with Circle-managed wallets

**Circle API Requirements:**
- `walletSetId` - Required for wallet creation
- `entityId` - Customer entity ID
- `blockchain` - ETH, BASE, POLYGON
- `name` - Optional friendly name

---

### **Type 3: Circle Programmable Wallet (MPC)** (Phase 2+)
```
wallet_type: 'circle_mpc'
custody_type: 'mpc'
provider: 'circle'
provider_wallet_id: 'wa_xxx'
balance: synced from Circle
verification: via Circle Web3 SDK
```

**Use Case:** Advanced users wanting MPC security

---

### **Type 4: External Self-Custody** (Phase 3)
```
wallet_type: 'external'
custody_type: 'self'
provider: 'metamask' | 'coinbase_wallet' | 'other'
wallet_address: '0x...' (user's own address)
balance: synced via RPC
verification: signature verification required
```

**Use Case:** User brings their own wallet, signs to prove ownership

---

## 🛠️ Proposed Schema Changes

### **New Fields:**

```sql
-- Wallet Classification
wallet_type TEXT NOT NULL DEFAULT 'internal'
  CHECK (wallet_type IN ('internal', 'circle_custodial', 'circle_mpc', 'external')),
custody_type TEXT NOT NULL DEFAULT 'custodial'
  CHECK (custody_type IN ('custodial', 'mpc', 'self')),

-- External Provider
provider TEXT NOT NULL DEFAULT 'payos'
  CHECK (provider IN ('payos', 'circle', 'coinbase', 'external')),
provider_wallet_id TEXT,           -- Circle wallet ID
provider_wallet_set_id TEXT,       -- Circle wallet set
provider_entity_id TEXT,           -- Circle customer entity
provider_metadata JSONB,           -- Provider-specific data

-- Verification
verification_status TEXT NOT NULL DEFAULT 'verified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')),
verification_method TEXT,          -- how was it verified?
verified_at TIMESTAMPTZ,

-- On-Chain Details
blockchain TEXT DEFAULT 'base',    -- ETH, BASE, POLYGON, AVAX, SOL
token_contract TEXT,               -- USDC contract on specific chain

-- Sync
last_synced_at TIMESTAMPTZ,
sync_enabled BOOLEAN DEFAULT false,

-- Compliance (Phase 2+)
kyc_status TEXT DEFAULT 'not_required'
  CHECK (kyc_status IN ('not_required', 'pending', 'verified', 'rejected')),
aml_cleared BOOLEAN DEFAULT true,
sanctions_status TEXT DEFAULT 'not_screened'
  CHECK (sanctions_status IN ('not_screened', 'clear', 'flagged', 'blocked')),
risk_score INTEGER,                -- 0-100
```

---

## 📝 Migration SQL

```sql
-- Add new columns for Phase 2 wallet support
ALTER TABLE wallets

-- Wallet Classification
ADD COLUMN wallet_type TEXT NOT NULL DEFAULT 'internal'
  CHECK (wallet_type IN ('internal', 'circle_custodial', 'circle_mpc', 'external')),
ADD COLUMN custody_type TEXT NOT NULL DEFAULT 'custodial'
  CHECK (custody_type IN ('custodial', 'mpc', 'self')),

-- External Provider
ADD COLUMN provider TEXT NOT NULL DEFAULT 'payos',
ADD COLUMN provider_wallet_id TEXT,
ADD COLUMN provider_wallet_set_id TEXT,
ADD COLUMN provider_entity_id TEXT,
ADD COLUMN provider_metadata JSONB,

-- Verification
ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'verified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')),
ADD COLUMN verification_method TEXT,
ADD COLUMN verified_at TIMESTAMPTZ DEFAULT now(),

-- On-Chain Details
ADD COLUMN blockchain TEXT DEFAULT 'base',
ADD COLUMN token_contract TEXT,

-- Sync
ADD COLUMN last_synced_at TIMESTAMPTZ,
ADD COLUMN sync_enabled BOOLEAN DEFAULT false,

-- Compliance
ADD COLUMN kyc_status TEXT DEFAULT 'not_required',
ADD COLUMN aml_cleared BOOLEAN DEFAULT true,
ADD COLUMN sanctions_status TEXT DEFAULT 'not_screened',
ADD COLUMN risk_score INTEGER;

-- Add indexes
CREATE INDEX idx_wallets_type ON wallets(wallet_type);
CREATE INDEX idx_wallets_provider ON wallets(provider);
CREATE INDEX idx_wallets_provider_wallet ON wallets(provider_wallet_id) 
  WHERE provider_wallet_id IS NOT NULL;
CREATE INDEX idx_wallets_verification ON wallets(verification_status);
CREATE INDEX idx_wallets_blockchain ON wallets(blockchain);
```

---

## 🎯 UI Flow Changes

### **Current UI (Phase 1):**
- "Create Wallet" → Creates internal PayOS wallet

### **Phase 2 UI:**
```
┌─────────────────────────────────────────────────┐
│          How would you like to add a wallet?    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐   │
│  │ 🏦 Create New   │  │ 🔗 Link Existing    │   │
│  │                 │  │                     │   │
│  │ Create a new    │  │ Connect an existing │   │
│  │ custodial       │  │ wallet you already  │   │
│  │ wallet          │  │ have               │   │
│  └─────────────────┘  └─────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 🔵 Circle Integration (Coming Soon)     │    │
│  │                                         │    │
│  │ Create or import a Circle-managed       │    │
│  │ programmable wallet                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **"Link Existing" Flow:**
1. User enters wallet address
2. We request signature (EIP-712) to prove ownership
3. On verification, we add wallet with `verification_status: verified`
4. Balance synced from RPC/Circle API
5. User can now use wallet for x402 payments

### **"Create New" Flow:**
1. User fills form (name, currency, purpose)
2. We call Circle API to create wallet (Phase 2)
3. Get `provider_wallet_id` back from Circle
4. Store with `wallet_type: 'circle_custodial'`
5. User can fund via Circle on-ramp

---

## 🔐 Circle Dev Sandbox Requirements

**To create a Circle wallet, we need:**

```typescript
// Circle API: Create Developer-Controlled Wallet
{
  "idempotencyKey": "uuid",
  "walletSetId": "ws_xxx",  // Required - wallet set
  "metadata": [
    { "name": "PayOS User ID", "refId": "account_xxx" }
  ]
}
```

**What we store:**
```typescript
{
  wallet_type: 'circle_custodial',
  custody_type: 'custodial',
  provider: 'circle',
  provider_wallet_id: response.wallet.id,
  provider_wallet_set_id: walletSetId,
  wallet_address: response.wallet.address,
  blockchain: response.wallet.blockchain,
  provider_metadata: {
    circle_entity_id: entityId,
    circle_state: response.wallet.state,
    circle_create_date: response.wallet.createDate
  }
}
```

---

## ✅ Summary: Fields We Need to Add

| Field | Type | Why |
|-------|------|-----|
| `wallet_type` | TEXT | Distinguish internal/circle/external |
| `custody_type` | TEXT | custodial/mpc/self |
| `provider` | TEXT | payos/circle/coinbase/external |
| `provider_wallet_id` | TEXT | Circle's wallet ID |
| `provider_wallet_set_id` | TEXT | Circle wallet set |
| `provider_entity_id` | TEXT | Circle entity ID |
| `provider_metadata` | JSONB | Provider-specific data |
| `verification_status` | TEXT | unverified/pending/verified/failed |
| `verification_method` | TEXT | How ownership verified |
| `verified_at` | TIMESTAMPTZ | When verified |
| `blockchain` | TEXT | ETH/BASE/POLYGON/etc |
| `token_contract` | TEXT | USDC contract address |
| `last_synced_at` | TIMESTAMPTZ | Last balance sync |
| `sync_enabled` | BOOLEAN | Auto-sync enabled? |
| `kyc_status` | TEXT | KYC verification |
| `aml_cleared` | BOOLEAN | AML cleared? |
| `sanctions_status` | TEXT | Sanctions screening |
| `risk_score` | INTEGER | Risk assessment |

**Total: 17 new fields**

---

## 🚀 Recommendation

1. **Now:** Add the schema fields to support both flows
2. **Phase 2:** Integrate Circle Dev Sandbox
3. **Phase 2+:** Add external wallet linking with signature verification
4. **Phase 3:** Add full compliance (KYC/AML) for production

Should I create the migration to add these fields?

