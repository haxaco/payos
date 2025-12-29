# Data Cleanup Analysis & Plan

**Date:** December 24, 2025  
**Tenant:** Acme Corporation (`da500003-4de9-416b-aebc-61cfcba914c9`)  
**User:** haxaco@gmail.com

---

## 📊 Current State Summary

| Entity | Total | Keep | Delete | % Cleanup |
|--------|-------|------|--------|-----------|
| **Endpoints** | 69 | 13 | **56** | 81% |
| **Accounts** | 982 | 744 | **238** | 24% |
| **Wallets** | 79 | 79 | 0 | 0% |

---

## 🔍 Detailed Analysis

### 1. Endpoints (69 total)

#### ✅ Endpoints to KEEP (13)

**Has Activity (9 endpoints):**
| ID | Name | Calls | Revenue | Status |
|----|------|-------|---------|--------|
| `ea6ff54b-a427-40f9-8ea6-30c937d9fbed` | Weather Forecast API | 75 | $0.0750 | active |
| `647ab575-bd99-46ec-a354-421b184374d0` | Historical Weather API | 1 | $0.0100 | active |
| `66230411-52ff-43e9-9013-45f6fe7f6f47` | Weather API Premium 4x0eap | 1 | $0.1000 | active |
| `c0c81c88-c887-4e81-88d7-6958aef25bf8` | FX Rate API 7ofz7n | 1 | $0.1000 | active |
| `38694385-8d11-4718-aa69-fa825dd0f084` | Weather API Premium fnbdw8 | 1 | $0.1000 | active |
| `1f86c14f-48ff-4177-9cb0-a1b6fccfdf6f` | Compliance Check API 80k7u | 1 | $0.2500 | active |
| `9136cf6d-7bf3-426c-ab91-1b2fd296a01d` | Compliance Check API pzo06 | 1 | $0.2500 | active |
| `65da6426-4478-4725-9886-702d00960b37` | FX Rate API kukvm6 | 1 | $0.1000 | active |
| `1242e8d3-0784-4b69-a367-6df604405b9b` | Compliance Check API rz69l | 1 | $0.2500 | active |

**Real Endpoints (4 - clean names, no random suffix):**
| ID | Name | Path | Status |
|----|------|------|--------|
| `cb11d035-e615-4b91-88fe-3e61bdb98675` | FX Rate API kdim | /api/fx/rate/kdim | active |
| `6dbf7c31-a559-48b1-8001-75db867be20a` | FX Rate Query API | /api/fx/rate | active |
| `57aad7e6-ad77-46bd-b54e-c5e9e0b373bc` | FX Rate API vqvz | /api/fx/rate/vqvz | active |
| `16ca1188-331f-4749-bb25-f0d3996bb968` | Test Compliance API | /api/compliance/check | active |

#### 🗑️ Endpoints to DELETE (56)

**Pattern:** All have random 5-6 character suffixes (like `42ex7b`, `sqlvai`, `dmqy5d`) AND zero calls AND zero revenue.

Example deletions:
- `Compliance Check API 42ex7b` - 0 calls, $0.00
- `Unapproved API sqlvai` - 0 calls, $0.00
- `FX Rate API jk3pgd` - 0 calls, $0.00
- `Weather API Premium frh8b` - 0 calls, $0.00
- ... (52 more)

---

### 2. Accounts (982 total)

#### ✅ Accounts to KEEP (744)
- 741 have associated transfers/endpoints (activity)
- 3 have wallet balances > $0

#### 🗑️ Accounts Safe to DELETE (238)
- No associated endpoints
- No transfers
- No wallet balance

**Top Duplicate Names Found:**
| Name | Duplicates | Can Delete |
|------|------------|------------|
| Compliance Bot Account | 8 | Some |
| Digital Ventures Pty Ltd | 7 | Varies |
| Cloud Innovations Ltd | 7 | Varies |
| Stellar Enterprises Inc | 6 | Varies |
| ... | ... | ... |

---

### 3. Wallets (79 total)

**Status:** NOT deleting any wallets - all have either balances or are linked to active accounts.

**Duplicates Found (but all have balances):**
| Name | Count | Total Balance |
|------|-------|---------------|
| Test Consumer Wallet | 11 | $899.20 |
| Compliance Bot Wallet | 8 | $3,998.25 |
| Marketing Bot Wallet | 5 | $2,499.60 |

---

## 🚀 Cleanup Plan

### Phase 1: Delete Unused Endpoints (Safe)

```sql
-- Preview what will be deleted
SELECT id, name, path, total_calls, total_revenue
FROM x402_endpoints
WHERE 
  tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  AND total_calls = 0
  AND total_revenue = 0
  AND (
    name ~ '[a-z0-9]{5,6}$'
    OR name LIKE 'Unapproved%'
  )
ORDER BY name;

-- Execute deletion (56 endpoints)
DELETE FROM x402_endpoints
WHERE 
  tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  AND total_calls = 0
  AND total_revenue = 0
  AND (
    name ~ '[a-z0-9]{5,6}$'
    OR name LIKE 'Unapproved%'
  );
```

### Phase 2: Delete Unused Accounts (Safe)

```sql
-- Preview orphan accounts (no wallets, no endpoints, no transfers)
WITH account_activity AS (
  SELECT 
    a.id,
    a.name,
    COUNT(DISTINCT w.id) as wallet_count,
    COUNT(DISTINCT e.id) as endpoint_count,
    COUNT(DISTINCT t.id) as transfer_count
  FROM accounts a
  LEFT JOIN wallets w ON w.owner_account_id = a.id
  LEFT JOIN x402_endpoints e ON e.account_id = a.id
  LEFT JOIN transfers t ON t.from_account_id = a.id OR t.to_account_id = a.id
  WHERE a.tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  GROUP BY a.id, a.name
)
SELECT id, name FROM account_activity
WHERE wallet_count = 0 AND endpoint_count = 0 AND transfer_count = 0;

-- Execute deletion (238 accounts)
-- CAUTION: Run preview first!
```

---

## ✅ Cleanup Results (COMPLETED)

**Executed:** December 24, 2025

| Entity | Before | After | Deleted |
|--------|--------|-------|---------|
| **Endpoints** | 69 | **13** | ✅ 56 deleted |
| **Accounts** | 982 | **744** | ✅ 238 deleted |
| **Wallets** | 79 | **79** | 0 (preserved) |

### Remaining Endpoints (Clean List)

| ID | Name | Path | Calls | Revenue |
|----|------|------|-------|---------|
| ea6ff54b | Weather Forecast API | /api/weather/forecast | 75 | $0.0750 |
| 647ab575 | Historical Weather API | /api/weather/historical | 1 | $0.0100 |
| 66230411 | Weather API Premium 4x0eap | /api/weather/premium/4x0eap | 1 | $0.1000 |
| c0c81c88 | FX Rate API 7ofz7n | /api/fx/rate/7ofz7n | 1 | $0.1000 |
| 38694385 | Weather API Premium fnbdw8 | /api/weather/premium/fnbdw8 | 1 | $0.1000 |
| 1f86c14f | Compliance Check API 80k7u | /api/compliance/check/80k7u | 1 | $0.2500 |
| 9136cf6d | Compliance Check API pzo06 | /api/compliance/check/pzo06 | 1 | $0.2500 |
| 65da6426 | FX Rate API kukvm6 | /api/fx/rate/kukvm6 | 1 | $0.1000 |
| 1242e8d3 | Compliance Check API rz69l | /api/compliance/check/rz69l | 1 | $0.2500 |
| cb11d035 | FX Rate API kdim | /api/fx/rate/kdim | 0 | $0.0000 |
| 6dbf7c31 | FX Rate Query API | /api/fx/rate | 0 | $0.0000 |
| 57aad7e6 | FX Rate API vqvz | /api/fx/rate/vqvz | 0 | $0.0000 |
| 16ca1188 | Test Compliance API | /api/compliance/check | 0 | $0.0000 |

---

## ⚠️ Important Notes

1. **Wallets NOT touched** - All wallets preserved (have balances or associations)
2. **Transfers preserved** - No transfers were deleted
3. **Activity preserved** - All endpoints/accounts with real usage kept
4. **Safe cleanup** - Only auto-generated unused data removed


