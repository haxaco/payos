# Epic 48: Connected Accounts (Payment Handlers)

**Status:** COMPLETE ✅
**Phase:** 4.0 (Platform Architecture)
**Priority:** P0 — Foundation for Multi-Handler Support
**Estimated Points:** 21
**Stories:** 5
**Dependencies:** Epic 27 (Settlement), Epic 43 (UCP)
**Created:** January 20, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Enable merchants to connect their own payment processor accounts (Stripe, PayPal, etc.). PayOS routes payments to the merchant's processor using their credentials, acting as an orchestration layer rather than holding funds.

**Why This Matters:**
- Merchants keep their existing processor relationships
- PayOS doesn't need to be a money transmitter for card payments
- Enables "bring your own processor" model
- Foundation for UCP payment handler support

**Goal:** Merchants can connect Stripe/PayPal accounts and PayOS routes payments correctly.

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/organization/connected-accounts` | ❌ No | - | P0 | Dashboard only |
| `POST /v1/organization/connected-accounts` | ❌ No | - | P0 | Dashboard only |
| `DELETE /v1/organization/connected-accounts/:id` | ❌ No | - | P0 | Dashboard only |
| Handler routing (internal) | ❌ No | - | P1 | Internal service |

**SDK Stories Required:** None (internal infrastructure)

---

## Stories

### Story 48.1: Connected Accounts Database Schema

**Points:** 3
**Priority:** P0
**Dependencies:** None

**Description:**
Create the database schema for storing connected payment handler accounts with encrypted credentials.

**Acceptance Criteria:**
- [ ] `connected_accounts` table created with proper schema
- [ ] Fields: `id`, `tenant_id`, `handler_type`, `display_name`, `encrypted_credentials`, `status`, `created_at`, `updated_at`
- [ ] RLS policies enforce tenant isolation
- [ ] Encrypted credential storage using AES-256
- [ ] Unique constraint on (tenant_id, handler_type) for single-handler-per-type
- [ ] Migration file created

**Database Schema:**
```sql
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  handler_type TEXT NOT NULL, -- 'stripe', 'paypal', 'payos_native'
  display_name TEXT NOT NULL,
  encrypted_credentials BYTEA NOT NULL, -- AES-256 encrypted JSON
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled', 'error'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, handler_type)
);
```

**Files to Create:**
- `apps/api/supabase/migrations/YYYYMMDD_connected_accounts.sql`

---

### Story 48.2: Connected Accounts API

**Points:** 5
**Priority:** P0
**Dependencies:** 48.1

**Description:**
Implement CRUD API endpoints for managing connected payment handler accounts.

**Acceptance Criteria:**
- [ ] `GET /v1/organization/connected-accounts` - List all connected accounts (without credentials)
- [ ] `POST /v1/organization/connected-accounts` - Add new handler connection
- [ ] `DELETE /v1/organization/connected-accounts/:id` - Remove handler connection
- [ ] Credential validation on connect (test API key works)
- [ ] Never return decrypted credentials in response
- [ ] Rate limiting on connection attempts
- [ ] Audit logging for all operations

**API Response (GET):**
```json
{
  "data": [
    {
      "id": "ca_xxx",
      "handler_type": "stripe",
      "display_name": "Main Stripe Account",
      "status": "active",
      "connected_at": "2026-01-20T12:00:00Z"
    }
  ]
}
```

**API Request (POST):**
```json
{
  "handler_type": "stripe",
  "display_name": "Main Stripe Account",
  "credentials": {
    "api_key": "sk_live_xxx",
    "webhook_secret": "whsec_xxx"
  }
}
```

**Files to Create:**
- `apps/api/src/routes/organization/connected-accounts.ts`
- `apps/api/src/services/connected-accounts/index.ts`

---

### Story 48.3: Credential Vault Service

**Points:** 5
**Priority:** P0
**Dependencies:** 48.1

**Description:**
Implement secure credential storage with encryption, rotation support, and audit logging.

**Acceptance Criteria:**
- [ ] AES-256-GCM encryption for all credentials
- [ ] Encryption key stored in environment variable
- [ ] Key rotation support (re-encrypt on rotation)
- [ ] Audit log for all credential access
- [ ] No plaintext credentials in logs
- [ ] Memory cleanup after credential use
- [ ] Unit tests for encryption/decryption

**Vault Interface:**
```typescript
interface CredentialVault {
  encrypt(data: object): Promise<Buffer>;
  decrypt(encrypted: Buffer): Promise<object>;
  rotateKey(oldKey: string, newKey: string): Promise<void>;
}
```

**Files to Create:**
- `apps/api/src/services/credential-vault/index.ts`
- `apps/api/src/services/credential-vault/encryption.ts`
- `apps/api/tests/unit/credential-vault.test.ts`

---

### Story 48.4: Payment Handler Abstraction

**Points:** 5
**Priority:** P1
**Dependencies:** 48.2, 48.3

**Description:**
Create abstraction layer for payment handlers, allowing pluggable Stripe/PayPal/PayOS-native implementations.

**Acceptance Criteria:**
- [ ] `PaymentHandler` interface defined
- [ ] `StripeHandler` implementation
- [ ] `PayPalHandler` implementation (stub)
- [ ] `PayOSNativeHandler` for Pix/SPEI
- [ ] Handler registry for routing
- [ ] Handler-specific error mapping to PayOS errors
- [ ] Credential retrieval from vault

**Handler Interface:**
```typescript
interface PaymentHandler {
  id: string;
  name: string;

  // Capability checks
  supportsMethod(method: PaymentMethod): boolean;
  supportsCurrency(currency: string): boolean;

  // Payment operations
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>;
  capturePayment(intentId: string): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;

  // Webhook handling
  verifyWebhook(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): WebhookEvent;
}
```

**Files to Create:**
- `apps/api/src/services/handlers/interface.ts`
- `apps/api/src/services/handlers/registry.ts`
- `apps/api/src/services/handlers/stripe.ts`
- `apps/api/src/services/handlers/paypal.ts`
- `apps/api/src/services/handlers/payos-native.ts`

---

### Story 48.5: Connected Accounts UI

**Points:** 3
**Priority:** P1
**Dependencies:** 48.2

**Description:**
Add dashboard UI for managing connected payment handler accounts.

**Acceptance Criteria:**
- [ ] List view showing all connected accounts
- [ ] "Connect Account" button with handler selection
- [ ] Handler-specific credential input forms
- [ ] Connection status indicators
- [ ] Disconnect confirmation dialog
- [ ] Error display for failed connections

**UI Location:** `Settings → Payment Handlers`

**Files to Create:**
- `apps/web/src/app/dashboard/settings/payment-handlers/page.tsx`
- `apps/web/src/components/settings/connected-account-card.tsx`
- `apps/web/src/components/settings/connect-handler-dialog.tsx`

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| 48.1 | 3 | P0 | Database schema | None |
| 48.2 | 5 | P0 | CRUD API | 48.1 |
| 48.3 | 5 | P0 | Credential vault | 48.1 |
| 48.4 | 5 | P1 | Handler abstraction | 48.2, 48.3 |
| 48.5 | 3 | P1 | Dashboard UI | 48.2 |
| **TOTAL** | **21** | | **5 stories** | |

---

## Verification Plan

| Checkpoint | Verification |
|------------|--------------|
| Schema | `connected_accounts` table exists with RLS |
| API | Can CRUD connected accounts via API |
| Security | Credentials encrypted at rest |
| Routing | Payment routes to correct handler |
| UI | Can connect/disconnect in dashboard |

---

## Dependencies

**Requires:**
- Epic 27: Settlement Infrastructure (for PayOS-native handler)

**Enables:**
- Epic 49: Protocol Discovery (prerequisite for protocol enablement)
- Epic 51: Unified Onboarding (connects accounts during setup)
- Epic 43: UCP (payment handler support)

---

## Related Documentation

- [Three-Layer Architecture](../../architecture/three-layer-architecture.md)
- [Epic 43: UCP Integration](./epic-43-ucp-integration.md)
- [Epic 51: Unified Onboarding](./epic-51-unified-onboarding.md)

---

*Created: January 20, 2026*
*Status: Planning*
